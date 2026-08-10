"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchRandomCompositionPromptAction,
  submitCompositionAttemptAction,
} from "@/lib/actions/composition-actions";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";

interface Prompt {
  id: string;
  category: string;
  jpText: string;
}

interface Result {
  score: number;
  feedback: string;
  modelAnswers: string[];
}

const THINK_SECONDS = 5;

const CATEGORY_LABELS: Record<string, string> = {
  mtg_speech: "MTGでの発言",
  structured_discussion: "構造化発言",
  data_evidence: "データ・論拠の提示",
  rebuttal_softening: "反論・軟化表現",
};

export function CompositionClient() {
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<
    "countdown" | "listening" | "scoring" | "result"
  >("countdown");
  const [secondsLeft, setSecondsLeft] = useState(THINK_SECONDS);
  const [answer, setAnswer] = useState("");
  const [useTyping, setUseTyping] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const speech = useSpeechRecognition("en-US");
  const inputRef = useRef<HTMLInputElement>(null);

  const loadPrompt = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setAnswer("");
    setPhase("countdown");
    setSecondsLeft(THINK_SECONDS);
    try {
      const p = await fetchRandomCompositionPromptAction();
      setPrompt(p);
    } catch (err) {
      setError(String((err as Error).message ?? err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPrompt();
  }, [loadPrompt]);

  // タイピングフォールバック未対応(マイク非対応ブラウザ)なら自動でテキスト入力に切り替え
  useEffect(() => {
    if (!loading && !speech.isSupported) setUseTyping(true);
  }, [loading, speech.isSupported]);

  const handleSubmit = useCallback(
    async (finalAnswer: string) => {
      if (!prompt || phase === "scoring") return;
      speech.stop();
      setPhase("scoring");
      try {
        const res = await submitCompositionAttemptAction(prompt.id, finalAnswer);
        setResult(res);
        setPhase("result");
      } catch (err) {
        setError(String((err as Error).message ?? err));
        setPhase("listening");
      }
    },
    [prompt, phase, speech]
  );

  // カウントダウン → 自動でマイク聞き取り開始(音声優先フロー)
  useEffect(() => {
    if (phase !== "countdown" || loading) return;
    if (secondsLeft <= 0) {
      if (useTyping) {
        setPhase("listening"); // タイピングモードでも同じフェーズ名を使い回す
        setTimeout(() => inputRef.current?.focus(), 0);
      } else {
        setPhase("listening");
        speech.start((finalText) => {
          setAnswer((prev) => (prev ? `${prev} ${finalText}` : finalText));
        });
      }
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, secondsLeft, loading, useTyping]);

  function handleMicRetry() {
    if (speech.isListening) {
      speech.stop();
      return;
    }
    speech.start((finalText) => {
      setAnswer((prev) => (prev ? `${prev} ${finalText}` : finalText));
    });
  }

  if (loading) return <p className="text-slate-400">読み込み中…</p>;
  if (error) return <p className="text-rose-400">{error}</p>;
  if (!prompt) return null;

  return (
    <div className="space-y-6 pb-4">
      <div className="flex items-center justify-between">
        <a href="/" className="text-sm text-slate-400 hover:text-slate-200">
          ← 戻る
        </a>
        <span className="text-xs px-2 py-1 rounded-full bg-sky-500/15 text-sky-300">
          {CATEGORY_LABELS[prompt.category] ?? prompt.category}
        </span>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-5 text-center">
        <p className="text-xs text-slate-400 mb-2">この文を英語にしてください</p>
        <p className="text-xl font-semibold text-slate-100">{prompt.jpText}</p>
      </div>

      {phase === "countdown" && (
        <div className="text-center">
          <p className="text-5xl font-bold text-sky-400">{secondsLeft}</p>
          <p className="text-sm text-slate-400 mt-2">
            頭の中で組み立ててください…({useTyping ? "終わったら入力" : "終わったら話し始めてください"})
          </p>
        </div>
      )}

      {phase === "listening" && (
        <div className="space-y-4">
          {!useTyping && (
            <div className="text-center space-y-3">
              <button
                type="button"
                onClick={handleMicRetry}
                className={`mx-auto flex items-center justify-center w-20 h-20 rounded-full text-3xl transition-colors ${
                  speech.isListening
                    ? "bg-rose-500 animate-pulse"
                    : "bg-slate-800 border border-slate-700"
                }`}
              >
                🎤
              </button>
              <p className="text-xs text-slate-400">
                {speech.isListening ? "聞き取り中…話し終わると自動で採点します" : "タップして話す"}
              </p>
              {answer && <p className="text-lg text-slate-100 px-4">{answer}</p>}
              {speech.interimText && (
                <p className="text-sm text-sky-400 italic px-4">{speech.interimText}</p>
              )}
            </div>
          )}

          {useTyping && (
            <input
              ref={inputRef}
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSubmit(answer);
                }
              }}
              placeholder="Type your English sentence..."
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-lg text-slate-100 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
            />
          )}

          <button
            type="button"
            onClick={() => handleSubmit(answer)}
            className="w-full rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-900 font-semibold py-3 transition-colors"
          >
            この内容で採点する
          </button>

          {speech.isSupported && (
            <button
              type="button"
              onClick={() => setUseTyping((v) => !v)}
              className="w-full text-center text-xs text-slate-500 hover:text-sky-400 underline"
            >
              {useTyping ? "🎤 マイクで話す" : "⌨️ キーボードで入力する"}
            </button>
          )}
        </div>
      )}

      {phase === "scoring" && (
        <p className="text-center text-slate-400 py-8">採点中…</p>
      )}

      {phase === "result" && result && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4 space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold text-sky-400">{result.score}</span>
              <span className="text-slate-400 text-sm">/ 100</span>
            </div>
            <p className="text-sm text-slate-300">{result.feedback}</p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4 space-y-2">
            <p className="text-xs text-slate-400">あなたの解答</p>
            <p className="text-slate-200">{answer || "(未入力)"}</p>
          </div>
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-2">
            <p className="text-xs text-emerald-300">模範解答</p>
            {result.modelAnswers.map((a, i) => (
              <p key={i} className="text-slate-100">
                {a}
              </p>
            ))}
          </div>
          <button
            type="button"
            onClick={loadPrompt}
            className="w-full rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-900 font-semibold py-3 transition-colors"
          >
            次のお題へ
          </button>
        </div>
      )}
    </div>
  );
}
