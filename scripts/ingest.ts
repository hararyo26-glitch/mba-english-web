// GitHub Actions から日次実行される音源取り込みスクリプト。
// RSS取得 → 音声DL → Vercel Blobアップロード → Whisper文字起こし → Postgresへ保存、まで一気通貫で行う。
// 実行: npx tsx scripts/ingest.ts [各ソースの最大取得件数(デフォルト1)]
import 'dotenv/config'
import crypto from 'node:crypto'
import Parser from 'rss-parser'
import { put } from '@vercel/blob'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { FEED_SOURCES, type FeedSource } from './sources'
import { decodeMp3 } from './audioDecode'
import { transcribe, groupWordsIntoSentences } from './whisper'
import { estimateCefr, calcWpm } from './cefr'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })
const parser = new Parser()

const maxPerSource = Number(process.argv[2] ?? 1)

async function main() {
  console.log(`[ingest] 開始 (各ソース最大${maxPerSource}件)`)

  for (const source of FEED_SOURCES) {
    let feed
    try {
      feed = await parser.parseURL(source.feedUrl)
    } catch (err) {
      console.error(`✗ [${source.label}] RSS取得失敗: ${(err as Error).message}`)
      continue
    }

    const items = (feed.items ?? []).slice(0, maxPerSource)
    for (const item of items) {
      const episodeId = makeEpisodeId(source.id, item.guid ?? item.link ?? item.title ?? '')

      const existing = await prisma.episode.findUnique({ where: { id: episodeId } })
      if (existing) {
        console.log(`- [${source.label}] ${item.title} (skipped-existing)`)
        continue
      }

      try {
        await ingestOneEpisode(source, episodeId, item)
        console.log(`✓ [${source.label}] ${item.title}`)
      } catch (err) {
        await prisma.episode.upsert({
          where: { id: episodeId },
          update: { transcriptStatus: 'error' },
          create: {
            id: episodeId,
            source: source.label,
            title: item.title ?? '',
            url: item.link ?? null,
            publishedAt: item.pubDate ? new Date(item.pubDate) : null,
            transcriptStatus: 'error',
          },
        })
        console.error(`✗ [${source.label}] ${item.title}: ${(err as Error).message}`)
      }
    }
  }

  console.log('[ingest] 完了')
  await prisma.$disconnect()
}

async function ingestOneEpisode(source: FeedSource, episodeId: string, item: Parser.Item) {
  const audioUrl = item.enclosure?.url
  if (!audioUrl) throw new Error('音声URL(enclosure)が見つかりません')

  await prisma.episode.create({
    data: {
      id: episodeId,
      source: source.label,
      title: item.title ?? '(無題)',
      url: item.link ?? null,
      publishedAt: item.pubDate ? new Date(item.pubDate) : null,
      transcriptStatus: 'downloading',
    },
  })

  const audioBuffer = await downloadAudio(audioUrl)

  // Vercel Blobへアップロード(リポジトリにはコミットしない方針 = 要件書8節)
  const blob = await put(`audio/${episodeId}.mp3`, audioBuffer, {
    access: 'public',
    contentType: 'audio/mpeg',
    addRandomSuffix: false,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  })

  await prisma.episode.update({
    where: { id: episodeId },
    data: { transcriptStatus: 'transcribing', audioUrl: blob.url },
  })

  const { samples16k, durationSec } = await decodeMp3(audioBuffer)
  const { fullText, words } = await transcribe(samples16k)
  const sentences = groupWordsIntoSentences(words)

  const wordCount = fullText.split(/\s+/).filter(Boolean).length
  const wpm = calcWpm(wordCount, durationSec)
  const cefrLevel = estimateCefr(fullText)

  await prisma.$transaction([
    prisma.sentence.createMany({
      data: sentences.map((s, i) => ({
        episodeId,
        idx: i,
        text: s.text,
        audioStart: s.audioStart,
        audioEnd: s.audioEnd,
      })),
    }),
    prisma.episode.update({
      where: { id: episodeId },
      data: { transcriptStatus: 'done', durationSec, wpm, cefrLevel },
    }),
  ])
}

async function downloadAudio(url: string): Promise<Buffer> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`音声DL失敗: HTTP ${res.status}`)
  const arrayBuffer = await res.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

function makeEpisodeId(sourceId: string, uniqueKey: string): string {
  const hash = crypto.createHash('sha1').update(uniqueKey).digest('hex').slice(0, 12)
  return `${sourceId}-${hash}`
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
