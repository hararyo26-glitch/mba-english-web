import { useCallback, useRef, useState } from 'react'

interface PlayOptions {
  /** 実音源のURL(エピソード全体 or センテンス単位のmp3)。無ければTTSにフォールバック */
  src?: string
  text: string
  rate: number
  /** srcが「エピソード全体音源」の場合の、このセンテンスの再生区間(秒) */
  start?: number
  end?: number
}

/**
 * 実音源(mp3)があればそれを再生し、無い/読み込みに失敗した場合は
 * ブラウザ内蔵のWeb Speech API(TTS)で代替再生する。
 * start/endが指定されている場合は、同じsrcの<audio>要素を使い回しつつ
 * 該当区間だけ再生する(エピソード全体音源から該当センテンスを切り出す用途)。
 */
// Whisperの単語タイムスタンプは多少前後にずれることがあるため、
// 頭/末尾が切れて聞こえないよう再生区間に少し余裕を持たせる
const START_PAD_SEC = 0.15
const END_PAD_SEC = 0.2

export function useAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const currentSrcRef = useRef<string | undefined>(undefined)
  const endHandlerRef = useRef<(() => void) | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window

  const play = useCallback(
    ({ src, text, rate, start, end }: PlayOptions) => {
      window.speechSynthesis?.cancel()

      const playWithTts = () => {
        audioRef.current?.pause()
        if (!ttsSupported) return
        const utter = new SpeechSynthesisUtterance(text)
        utter.lang = 'en-US'
        utter.rate = rate
        utter.onstart = () => setIsPlaying(true)
        utter.onend = () => setIsPlaying(false)
        utter.onerror = () => setIsPlaying(false)
        window.speechSynthesis.speak(utter)
      }

      if (!src) {
        playWithTts()
        return
      }

      // srcが変わったら<audio>要素を作り直し、同じsrcなら使い回す(再バッファ回避)
      if (currentSrcRef.current !== src || !audioRef.current) {
        audioRef.current?.pause()
        if (audioRef.current && endHandlerRef.current) {
          audioRef.current.removeEventListener('timeupdate', endHandlerRef.current)
        }
        audioRef.current = new Audio(src)
        currentSrcRef.current = src
      }

      const audio = audioRef.current
      audio.playbackRate = rate

      if (endHandlerRef.current) {
        audio.removeEventListener('timeupdate', endHandlerRef.current)
        endHandlerRef.current = null
      }

      audio.onplay = () => setIsPlaying(true)
      audio.onended = () => setIsPlaying(false)
      audio.onerror = () => playWithTts()

      if (typeof end === 'number') {
        const paddedEnd = end + END_PAD_SEC
        const onTimeUpdate = () => {
          if (audio.currentTime >= paddedEnd) {
            audio.pause()
            setIsPlaying(false)
          }
        }
        endHandlerRef.current = onTimeUpdate
        audio.addEventListener('timeupdate', onTimeUpdate)
      }

      audio.currentTime = typeof start === 'number' ? Math.max(0, start - START_PAD_SEC) : 0
      audio.play().catch(playWithTts)
    },
    [ttsSupported],
  )

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel()
    audioRef.current?.pause()
    setIsPlaying(false)
  }, [])

  return { play, stop, isPlaying, ttsSupported }
}
