"use server";

import { prisma } from "@/lib/db";
import { recordAttemptOutcome, getDueReviewItems } from "@/lib/review";
import { translateToJapanese } from "@/lib/gemini";
import type { DiffToken } from "@/lib/diff";

export async function fetchEpisodeListAction() {
  const episodes = await prisma.episode.findMany({
    where: { transcriptStatus: "done" },
    orderBy: { publishedAt: "desc" },
    include: { _count: { select: { sentences: true } } },
  });

  return episodes.map((e) => ({
    id: e.id,
    source: e.source,
    title: e.title,
    cefrLevel: e.cefrLevel,
    wpm: e.wpm,
    sentenceCount: e._count.sentences,
  }));
}

export async function fetchEpisodeDetailAction(episodeId: string) {
  const episode = await prisma.episode.findUnique({
    where: { id: episodeId },
    include: {
      sentences: { orderBy: { idx: "asc" } },
      progress: true,
    },
  });
  if (!episode) return null;

  return {
    id: episode.id,
    source: episode.source,
    title: episode.title,
    cefrLevel: episode.cefrLevel,
    wpm: episode.wpm,
    audioUrl: episode.audioUrl,
    // 前回の続き(最後に回答した次のセンテンス)から出題する
    startIndex: episode.progress ? episode.progress.lastIndex + 1 : 0,
    sentences: episode.sentences.map((s) => ({
      dbId: s.id,
      index: s.idx,
      text: s.text,
      audioStart: s.audioStart,
      audioEnd: s.audioEnd,
    })),
  };
}

export async function recordDictationAttemptAction(input: {
  sentenceId: number;
  userInput: string;
  isCorrect: boolean;
  diffTokens: DiffToken[];
}) {
  const sentence = await prisma.dictationAttempt
    .create({
      data: {
        sentenceId: input.sentenceId,
        userInput: input.userInput,
        isCorrect: input.isCorrect,
        diffJson: JSON.stringify(input.diffTokens),
      },
      select: { sentence: { select: { episodeId: true, idx: true } } },
    })
    .then((a) => a.sentence);

  await recordAttemptOutcome(input.sentenceId, input.isCorrect);

  // 進捗更新: クリックで前の文に戻って回答しても、最も先まで進んだ位置を保持する
  const existing = await prisma.episodeProgress.findUnique({
    where: { episodeId: sentence.episodeId },
  });
  if (!existing) {
    await prisma.episodeProgress.create({
      data: { episodeId: sentence.episodeId, lastIndex: sentence.idx },
    });
  } else if (sentence.idx > existing.lastIndex) {
    await prisma.episodeProgress.update({
      where: { episodeId: sentence.episodeId },
      data: { lastIndex: sentence.idx },
    });
  }
}

export async function fetchReviewQueueAction(limit = 20) {
  return getDueReviewItems(limit);
}

export async function translateSentenceAction(sentenceId: number): Promise<string> {
  const sentence = await prisma.sentence.findUnique({ where: { id: sentenceId } });
  if (!sentence) throw new Error("sentence not found");
  if (sentence.translationJa) return sentence.translationJa;

  const translation = await translateToJapanese(sentence.text);
  await prisma.sentence.update({
    where: { id: sentenceId },
    data: { translationJa: translation },
  });
  return translation;
}
