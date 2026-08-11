import { useCallback, useMemo, useState } from "react";
import { diffWords, isPerfectMatch, type DiffToken } from "@/lib/diff";

export interface SentenceData {
  dbId: number;
  index: number;
  text: string;
  audioStart: number;
  audioEnd: number;
  audioUrl?: string; // 復習セッションなどエピソード横断時にepisode.audioUrlを上書きする
}

export interface DictationAttemptResult {
  index: number;
  sentenceDbId: number;
  userInput: string;
  correctText: string;
  isCorrect: boolean;
  diffTokens: DiffToken[];
}

export type SessionPhase = "input" | "result" | "summary";

export function useDictationSession(sentences: SentenceData[], startIndex = 0) {
  const initialIndex = Math.min(Math.max(startIndex, 0), Math.max(sentences.length - 1, 0));
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [phase, setPhase] = useState<SessionPhase>("input");
  const [userInput, setUserInput] = useState("");
  const [attempts, setAttempts] = useState<DictationAttemptResult[]>([]);
  const [lastResult, setLastResult] = useState<DictationAttemptResult | null>(null);

  const total = sentences.length;
  const currentSentence = useMemo(
    () => (currentIndex < total ? sentences[currentIndex] : undefined),
    [currentIndex, sentences, total]
  );

  const attemptByIndex = useMemo(() => {
    const map = new Map<number, DictationAttemptResult>();
    for (const a of attempts) map.set(a.index, a);
    return map;
  }, [attempts]);

  function submitAnswer() {
    if (!currentSentence || phase !== "input") return;
    const diffTokens = diffWords(currentSentence.text, userInput);
    const result: DictationAttemptResult = {
      index: currentSentence.index,
      sentenceDbId: currentSentence.dbId,
      userInput,
      correctText: currentSentence.text,
      isCorrect: isPerfectMatch(diffTokens),
      diffTokens,
    };
    // 同じ文を再回答した場合は前回の記録を差し替える(サマリーの重複集計を防ぐ)
    setAttempts((prev) => [...prev.filter((a) => a.index !== result.index), result]);
    setLastResult(result);
    setPhase("result");
  }

  function nextSentence() {
    if (phase !== "result") return;
    if (currentIndex + 1 >= total) {
      setPhase("summary");
      return;
    }
    goToSentence(currentIndex + 1);
  }

  /** センテンス一覧をクリックして任意の文へジャンプする。既に回答済みならその結果を再表示する */
  const goToSentence = useCallback(
    (index: number) => {
      if (index < 0 || index >= sentences.length) return;
      setCurrentIndex(index);
      const existing = attemptByIndex.get(index);
      if (existing) {
        setUserInput(existing.userInput);
        setLastResult(existing);
        setPhase("result");
      } else {
        setUserInput("");
        setLastResult(null);
        setPhase("input");
      }
    },
    [attemptByIndex, sentences.length]
  );

  function restart() {
    setCurrentIndex(0);
    setUserInput("");
    setAttempts([]);
    setLastResult(null);
    setPhase("input");
  }

  return {
    currentSentence,
    currentIndex,
    total,
    phase,
    userInput,
    setUserInput,
    submitAnswer,
    nextSentence,
    goToSentence,
    restart,
    attempts,
    attemptByIndex,
    lastResult,
  };
}
