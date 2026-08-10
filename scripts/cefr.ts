export type CefrLevel = 'B2' | 'C1' | 'C1+' | 'C2'

/** Flesch-Kincaid Grade LevelをCEFRバンドにマッピングする簡易ヒューリスティック */
export function estimateCefr(fullText: string): CefrLevel {
  const grade = fleschKincaidGrade(fullText)
  if (grade < 10) return 'B2'
  if (grade < 13) return 'C1'
  if (grade < 15) return 'C1+'
  return 'C2'
}

function fleschKincaidGrade(text: string): number {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0)
  const words = text.split(/\s+/).filter((w) => w.trim().length > 0)
  if (sentences.length === 0 || words.length === 0) return 10

  const syllables = words.reduce((sum, w) => sum + countSyllables(w), 0)
  const wordsPerSentence = words.length / sentences.length
  const syllablesPerWord = syllables / words.length

  return 0.39 * wordsPerSentence + 11.8 * syllablesPerWord - 15.59
}

function countSyllables(word: string): number {
  const clean = word.toLowerCase().replace(/[^a-z]/g, '')
  if (!clean) return 1
  const matches = clean.match(/[aeiouy]+/g)
  return Math.max(1, matches ? matches.length : 1)
}

export function calcWpm(wordCount: number, durationSec: number): number {
  if (durationSec <= 0) return 0
  return Math.round(wordCount / (durationSec / 60))
}
