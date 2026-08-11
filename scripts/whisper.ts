import { pipeline, env, type AutomaticSpeechRecognitionPipeline } from '@huggingface/transformers'

env.allowLocalModels = false

let transcriberPromise: Promise<AutomaticSpeechRecognitionPipeline> | null = null

function getTranscriber() {
  if (!transcriberPromise) {
    transcriberPromise = pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en', {
      dtype: 'fp32',
    }) as Promise<AutomaticSpeechRecognitionPipeline>
  }
  return transcriberPromise
}

export interface WordTiming {
  text: string
  start: number
  end: number
}

export interface TranscriptionResult {
  fullText: string
  words: WordTiming[]
}

export async function transcribe(samples16k: Float32Array): Promise<TranscriptionResult> {
  const transcriber = await getTranscriber()
  const output: any = await transcriber(samples16k, {
    return_timestamps: 'word',
    chunk_length_s: 30,
    stride_length_s: 5,
  })

  const chunks: { text: string; timestamp: [number, number] }[] = output.chunks ?? []
  const words: WordTiming[] = chunks
    .filter((c) => c.text.trim().length > 0)
    .map((c) => ({
      text: c.text.trim(),
      start: c.timestamp[0] ?? 0,
      end: c.timestamp[1] ?? c.timestamp[0] ?? 0,
    }))

  return { fullText: (output.text ?? '').trim(), words }
}

const SENTENCE_END = /[.!?]["')\]]?$/

// Whisper(tiny.en)の単語タイムスタンプは前後に少しずれることがあるため、
// 文の頭/末尾が切れて聞こえないよう再生区間に余裕(パディング)を持たせる。
// ただし隣接する文の音声に食い込まないよう、隣の単語の境界を超えないようクランプする。
const START_PAD_SEC = 0.15
const END_PAD_SEC = 0.2

export function groupWordsIntoSentences(
  words: WordTiming[],
): { text: string; audioStart: number; audioEnd: number }[] {
  const groups: WordTiming[][] = []
  let buffer: WordTiming[] = []

  for (const word of words) {
    buffer.push(word)
    if (SENTENCE_END.test(word.text) || buffer.length >= 30) {
      groups.push(buffer)
      buffer = []
    }
  }
  if (buffer.length > 0) {
    groups.push(buffer)
  }

  return groups
    .map((buf, i) => finalizeSentence(buf, groups[i - 1], groups[i + 1]))
    .filter((s) => s.text.length > 0)
}

function finalizeSentence(buffer: WordTiming[], prevGroup?: WordTiming[], nextGroup?: WordTiming[]) {
  const rawStart = buffer[0].start
  const rawEnd = buffer[buffer.length - 1].end
  const prevEnd = prevGroup ? prevGroup[prevGroup.length - 1].end : 0
  const nextStart = nextGroup ? nextGroup[0].start : rawEnd + END_PAD_SEC

  return {
    text: buffer.map((w) => w.text).join(' '),
    audioStart: Math.max(prevEnd, rawStart - START_PAD_SEC),
    audioEnd: Math.min(nextStart, rawEnd + END_PAD_SEC),
  }
}
