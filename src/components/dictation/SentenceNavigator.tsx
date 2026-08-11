"use client";

import { useEffect, useRef } from "react";
import type { DictationAttemptResult } from "@/hooks/useDictationSession";

interface Props {
  total: number;
  currentIndex: number;
  attemptByIndex: Map<number, DictationAttemptResult>;
  onSelect: (index: number) => void;
}

/** クリックで任意のセンテンスへジャンプできる横スクロールのナビゲーター */
export function SentenceNavigator({ total, currentIndex, attemptByIndex, onSelect }: Props) {
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [currentIndex]);

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1" aria-label="センテンス一覧">
      {Array.from({ length: total }, (_, i) => {
        const attempt = attemptByIndex.get(i);
        const isCurrent = i === currentIndex;
        const stateClass = attempt
          ? attempt.isCorrect
            ? "bg-emerald-500/25 text-emerald-300 border-emerald-500/40"
            : "bg-rose-500/20 text-rose-300 border-rose-500/40"
          : "bg-slate-800 text-slate-400 border-slate-700";

        return (
          <button
            key={i}
            ref={isCurrent ? activeRef : undefined}
            type="button"
            onClick={() => onSelect(i)}
            title={`センテンス ${i + 1}${attempt ? (attempt.isCorrect ? " (正解)" : " (要復習)") : ""}`}
            className={`shrink-0 w-8 h-8 rounded-lg border text-xs font-medium transition-colors ${stateClass} ${
              isCurrent ? "ring-2 ring-sky-400" : "hover:border-sky-400"
            }`}
          >
            {i + 1}
          </button>
        );
      })}
    </div>
  );
}
