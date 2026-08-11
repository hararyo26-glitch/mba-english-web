"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { useDictationSession, type SentenceData } from "@/hooks/useDictationSession";
import {
  recordDictationAttemptAction,
  translateSentenceAction,
} from "@/lib/actions/dictation-actions";
import { SentenceProgressBar } from "./SentenceProgressBar";
import { SentenceNavigator } from "./SentenceNavigator";
import { AudioControls, type PlaybackRate } from "./AudioControls";
import { AnswerInput } from "./AnswerInput";
import { DiffResult } from "./DiffResult";
import { SummaryScreen } from "./SummaryScreen";

interface Props {
  title: string;
  sentences: SentenceData[];
  episodeAudioUrl?: string | null;
  startIndex?: number;
  onBackToList: () => void;
}

export function DictationSession({
  title,
  sentences,
  episodeAudioUrl,
  startIndex = 0,
  onBackToList,
}: Props) {
  const {
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
  } = useDictationSession(sentences, startIndex);

  const { play, isPlaying } = useAudioPlayer();
  const [rate, setRate] = useState<PlaybackRate>(1);
  const [translation, setTranslation] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const resolveAudioSrc = useCallback(
    (sentenceAudioUrl?: string) => sentenceAudioUrl ?? episodeAudioUrl ?? undefined,
    [episodeAudioUrl]
  );

  const handlePlay = useCallback(() => {
    if (!currentSentence) return;
    play({
      src: resolveAudioSrc(currentSentence.audioUrl),
      text: currentSentence.text,
      rate,
      start: currentSentence.audioStart,
      end: currentSentence.audioEnd,
    });
  }, [currentSentence, play, rate, resolveAudioSrc]);

  useEffect(() => {
    setTranslation(null);
    if (phase === "input" && currentSentence) {
      handlePlay();
      inputRef.current?.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]);

  useEffect(() => {
    if (phase === "result" && lastResult) {
      recordDictationAttemptAction({
        sentenceId: lastResult.sentenceDbId,
        userInput: lastResult.userInput,
        isCorrect: lastResult.isCorrect,
        diffTokens: lastResult.diffTokens,
      }).catch(() => {
        // 記録失敗は学習体験をブロックしない
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, lastResult]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const isInputFocused = document.activeElement === inputRef.current;
      if (e.code === "Space" && !isInputFocused) {
        e.preventDefault();
        handlePlay();
        return;
      }
      if (e.key === "Tab" && phase === "result") {
        e.preventDefault();
        nextSentence();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [phase, nextSentence, handlePlay]);

  async function handleShowTranslation() {
    if (!lastResult || translating) return;
    setTranslating(true);
    try {
      const ja = await translateSentenceAction(lastResult.sentenceDbId);
      setTranslation(ja);
    } catch {
      setTranslation("(和訳の取得に失敗しました)");
    } finally {
      setTranslating(false);
    }
  }

  if (phase === "summary") {
    return (
      <SummaryScreen
        title={title}
        attempts={attempts}
        onRestart={restart}
        onBackToList={onBackToList}
      />
    );
  }

  if (!currentSentence) return null;

  return (
    <div className="space-y-6 pb-24 sm:pb-0">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBackToList}
          className="text-sm text-slate-400 hover:text-slate-200"
        >
          ← 記事一覧
        </button>
        <span className="text-sm text-slate-400">{title}</span>
      </div>

      <SentenceProgressBar current={currentIndex} total={total} />
      <SentenceNavigator
        total={total}
        currentIndex={currentIndex}
        attemptByIndex={attemptByIndex}
        onSelect={goToSentence}
      />
      <AudioControls isPlaying={isPlaying} rate={rate} onRateChange={setRate} onPlay={handlePlay} />
      <AnswerInput
        ref={inputRef}
        value={userInput}
        onChange={setUserInput}
        onSubmit={submitAnswer}
        disabled={phase === "result"}
      />

      {phase === "result" && lastResult && (
        <div className="space-y-3">
          <DiffResult result={lastResult} />
          {translation ? (
            <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-4">
              <p className="text-xs text-indigo-300 mb-1">和訳(AI自動翻訳)</p>
              <p className="text-slate-100">{translation}</p>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleShowTranslation}
              disabled={translating}
              className="text-xs text-slate-500 hover:text-sky-400 underline disabled:opacity-50"
            >
              {translating ? "和訳を生成中…" : "🇯🇵 和訳を見る(AI自動翻訳)"}
            </button>
          )}
        </div>
      )}

      <div className="hidden sm:flex gap-3">
        {phase === "input" ? (
          <button
            type="button"
            onClick={submitAnswer}
            className="flex-1 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-900 font-semibold py-3 transition-colors"
          >
            答え合わせ (Enter)
          </button>
        ) : (
          <button
            type="button"
            onClick={nextSentence}
            className="flex-1 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-900 font-semibold py-3 transition-colors"
          >
            {currentIndex + 1 >= total ? "サマリーを見る" : "次のセンテンス (Tab)"}
          </button>
        )}
      </div>

      <div className="sm:hidden fixed bottom-0 left-0 right-0 border-t border-slate-800 bg-slate-900/95 backdrop-blur px-4 py-3">
        {phase === "input" ? (
          <button
            type="button"
            onClick={submitAnswer}
            className="w-full rounded-xl bg-sky-500 active:bg-sky-600 text-slate-900 font-semibold py-3 transition-colors"
          >
            答え合わせ
          </button>
        ) : (
          <button
            type="button"
            onClick={nextSentence}
            className="w-full rounded-xl bg-sky-500 active:bg-sky-600 text-slate-900 font-semibold py-3 transition-colors"
          >
            {currentIndex + 1 >= total ? "サマリーを見る" : "次のセンテンス"}
          </button>
        )}
      </div>
    </div>
  );
}
