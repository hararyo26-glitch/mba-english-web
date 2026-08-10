import { MPEGDecoder } from 'mpg123-decoder'

export interface DecodedAudio {
  /** モノラル, 16kHz にリサンプル済みのPCM(Whisper入力用) */
  samples16k: Float32Array
  durationSec: number
}

/** WASM版デコーダを使うため、ffmpeg等のネイティブ依存なしにどの環境でも動く */
export async function decodeMp3(buffer: Buffer): Promise<DecodedAudio> {
  const decoder = new MPEGDecoder()
  await decoder.ready
  const { channelData, sampleRate } = decoder.decode(new Uint8Array(buffer))
  decoder.free()

  const mono =
    channelData.length > 1 ? mixToMono(channelData[0], channelData[1]) : channelData[0]

  const durationSec = mono.length / sampleRate
  const samples16k = resampleLinear(mono, sampleRate, 16000)

  return { samples16k, durationSec }
}

function mixToMono(left: Float32Array, right: Float32Array): Float32Array {
  const out = new Float32Array(left.length)
  for (let i = 0; i < left.length; i++) {
    out[i] = (left[i] + right[i]) / 2
  }
  return out
}

function resampleLinear(input: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate) return input
  const ratio = fromRate / toRate
  const outLength = Math.floor(input.length / ratio)
  const output = new Float32Array(outLength)
  for (let i = 0; i < outLength; i++) {
    const srcPos = i * ratio
    const srcIndex = Math.floor(srcPos)
    const frac = srcPos - srcIndex
    const a = input[srcIndex] ?? 0
    const b = input[srcIndex + 1] ?? a
    output[i] = a + (b - a) * frac
  }
  return output
}
