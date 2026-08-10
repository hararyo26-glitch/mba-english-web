import { useCallback, useRef, useState } from 'react'

/**
 * ブラウザ内蔵のWeb Speech API(SpeechRecognition)で音声入力をテキスト化する。
 * 無料・追加APIキー不要。Chrome/Edgeのみ対応(Safari/Firefoxは非対応のため isSupported で判定)。
 */
export function useSpeechRecognition(lang = 'en-US') {
  const [isListening, setIsListening] = useState(false)
  const [interimText, setInterimText] = useState('')
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  const Ctor = typeof window !== 'undefined' ? window.SpeechRecognition ?? window.webkitSpeechRecognition : undefined
  const isSupported = !!Ctor

  const start = useCallback(
    (onFinalResult: (text: string) => void) => {
      if (!Ctor) return
      const recognition = new Ctor()
      recognition.lang = lang
      recognition.continuous = false
      recognition.interimResults = true

      recognition.onresult = (event) => {
        let interim = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          const transcript = result[0].transcript
          if (result.isFinal) {
            onFinalResult(transcript.trim())
            setInterimText('')
          } else {
            interim += transcript
          }
        }
        if (interim) setInterimText(interim)
      }
      recognition.onerror = () => {
        setIsListening(false)
        setInterimText('')
      }
      recognition.onend = () => {
        setIsListening(false)
        setInterimText('')
      }

      recognitionRef.current = recognition
      recognition.start()
      setIsListening(true)
    },
    [Ctor, lang],
  )

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
  }, [])

  return { isSupported, isListening, interimText, start, stop }
}
