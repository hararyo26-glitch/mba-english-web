// Web Speech API (SpeechRecognition) は標準DOM型定義に含まれないため最小限の型を用意する。
// 対応ブラウザ: Chrome/Edge (webkitSpeechRecognition)。Firefox/Safariは非対応のため利用側でフィーチャー検出する。
interface SpeechRecognitionResultItem {
  transcript: string
}

interface SpeechRecognitionResult {
  0: SpeechRecognitionResultItem
  isFinal: boolean
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number
  results: ArrayLike<SpeechRecognitionResult>
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
}

interface SpeechRecognition extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  start(): void
  stop(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
}

interface Window {
  SpeechRecognition?: new () => SpeechRecognition
  webkitSpeechRecognition?: new () => SpeechRecognition
}
