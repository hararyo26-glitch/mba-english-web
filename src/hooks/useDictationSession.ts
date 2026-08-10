import { useMemo, useState } from "react";
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
  sentenceDbId: number;
  userInput: string;
  correctText: string;
  isCorrect: boolean;
  diffTokens: DiffToken[];
}

export type SessionPhase = "input" | "result" | "summary";

export function useDictationSession(sentences: SentenceData[]) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<SessionPhase>("input");
  const [userInput, setUserInput] = useState("");
  const [attempts, setAttempts] = useState<DictationAttemptResult[]>([]);
  const [lastResult, setLastResult] = useState<DictationAttemptResult | null>(null);

  const total = sentences.length;
  const currentSentence = useMemo(
    () => (currentIndex < total ? sentences[currentIndex] : undefined),
    [currentIndex, sentences, total]
  );

  function submitAnswer() {
    if (!currentSentence || phase !== "input") return;
    const diffTokens = diffWords(currentSentence.text, userInput);
    const result: DictationAttemptResult = {
      sentenceDbId: currentSentence.dbId,
      userInput,
      correctText: currentSentence.text,
      isCorrect: isPerfectMatch(diffTokens),
      diffTokens,
    };
    setAttempts((prev) => [...prev, result]);
    setLastResult(result);
    setPhase("result");
  }

  function nextSentence() {
    if (phase !== "result") return;
    if (currentIndex + 1 >= total) {
      setPhase("summary");
      return;
    }
    setCurrentIndex((i) => i + 1);
    setUserInput("");
    setLastResult(null);
    setPhase("input");
  }

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
    restart,
    attempts,
    lastResult,
  };
}
