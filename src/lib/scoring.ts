import type { DictationAttemptResult } from "@/hooks/useDictationSession";

export interface SessionSummary {
  total: number;
  correctCount: number;
  accuracyRate: number;
  weakWords: { word: string; count: number }[];
}

export function summarizeSession(attempts: DictationAttemptResult[]): SessionSummary {
  const total = attempts.length;
  const correctCount = attempts.filter((a) => a.isCorrect).length;
  const accuracyRate = total === 0 ? 0 : Math.round((correctCount / total) * 100);

  const wordCounts = new Map<string, number>();
  for (const attempt of attempts) {
    for (const token of attempt.diffTokens) {
      if (token.type === "missing" || token.type === "wrong") {
        const key = token.text.toLowerCase().replace(/[^a-z0-9']/g, "");
        if (!key) continue;
        wordCounts.set(key, (wordCounts.get(key) ?? 0) + 1);
      }
    }
  }

  const weakWords = Array.from(wordCounts.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return { total, correctCount, accuracyRate, weakWords };
}
