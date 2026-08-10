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

export function groupWordsIntoSentences(
  words: WordTiming[],
): { text: string; audioStart: number; audioEnd: number }[] {
  const sentences: { text: string; audioStart: number; audioEnd: number }[] = []
  let buffer: WordTiming[] = []

  for (const word of words) {
    buffer.push(word)
    if (SENTENCE_END.test(word.text) || buffer.length >= 30) {
      sentences.push(finalizeSentence(buffer))
      buffer = []
    }
  }
  if (buffer.length > 0) {
    sentences.push(finalizeSentence(buffer))
  }

  return sentences.filter((s) => s.text.length > 0)
}

function finalizeSentence(buffer: WordTiming[]) {
  return {
    text: buffer.map((w) => w.text).join(' '),
    audioStart: buffer[0].start,
    audioEnd: buffer[buffer.length - 1].end,
  }
}
