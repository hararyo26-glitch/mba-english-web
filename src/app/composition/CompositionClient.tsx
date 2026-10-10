"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchCompositionSummaryAction,
  fetchNextCompositionPromptAction,
  setCompositionFlagAction,
  submitCompositionAttemptAction,
  type CompositionExpression,
  type CompositionMode,
} from "@/lib/actions/composition-actions";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";

interface Prompt {
  id: string;
  category: string;
  jpText: string;
  flagged: boolean;
}

interface Result {
  score: number;
  feedback: string;
  modelAnswers: string[];
  expressions: CompositionExpression[];
  flagged: boolean;
}

interface Summary {
  total: number;
  newRemaining: number;
  reviewCount: number;
}

const THINK_SECONDS = 5;

const CATEGORY_LABELS: Record<string, string> = {
  mtg_speech: "MTGでの発言",
  structured_discussion: "構造化発言",
  data_evidence: "データ・論拠の提示",
  rebuttal_softening: "反論・軟化表現",
  business_negotiation: "ビジネス・交渉",
  business_presentation: "ビジネス・プレゼン",
  daily_smalltalk: "日常会話・雑談",
  daily_requests: "日常会話・お願い",
  daily_opinions: "日常会話・意見",
  daily_plans: "日常会話・予定調整",
  daily_travel: "日常会話・旅行",
  daily_dining: "日常会話・食事と買い物",
};

const MODE_LABELS: Record<CompositionMode, string> = {
  new: "新規問題パート",
  review: "復習パート",
};

export function CompositionClient() {
  const [mode, setMode] = useState<CompositionMode | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [flagged, setFlagged] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noMorePrompts, setNoMorePrompts] = useState(false);
  const [phase, setPhase] = useState<
    "countdown" | "listening" | "scoring" | "result"
  >("countdown");
  const [secondsLeft, setSecondsLeft] = useState(THINK_SECONDS);
  const [answer, setAnswer] = useState("");
  const [useTyping, setUseTyping] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const speech = useSpeechRecognition("en-US");
  const inputRef = useRef<HTMLInputElement>(null);

  const refreshSummary = useCallback(async () => {
    try {
      setSummary(await fetchCompositionSummaryAction());
    } catch (err) {
      setError(String((err as Error).message ?? err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSummary();
  }, [refreshSummary]);

  const loadPrompt = useCallback(async (nextMode: CompositionMode, excludeId?: string) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setAnswer("");
    setPhase("countdown");
    setSecondsLeft(THINK_SECONDS);
    setNoMorePrompts(false);
    try {
      const p = await fetchNextCompositionPromptAction(nextMode, excludeId);
      setPrompt(p);
      setFlagged(p?.flagged ?? false);
      setNoMorePrompts(p === null);
    } catch (err) {
      setError(String((err as Error).message ?? err));
    } finally {
      setLoading(false);
    }
  }, []);

  function startMode(nextMode: CompositionMode) {
    setMode(nextMode);
    loadPrompt(nextMode);
  }

  function backToMenu() {
    speech.stop();
    setMode(null);
    setPrompt(null);
    setResult(null);
    setNoMorePrompts(false);
    setError(null);
    setLoading(true);
    refreshSummary();
  }

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
    if (phase !== "countdown" || loading || !prompt) return;
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
  }, [phase, secondsLeft, loading, useTyping, prompt]);

  function handleMicRetry() {
    if (speech.isListening) {
      speech.stop();
      return;
    }
    speech.start((finalText) => {
      setAnswer((prev) => (prev ? `${prev} ${finalText}` : finalText));
    });
  }

  // 採点ボタンを押すまでは、何度でも録音し直したり入力をリセットしたりできるようにする
  function handleReset() {
    if (speech.isListening) speech.stop();
    setAnswer("");
    if (useTyping) setTimeout(() => inputRef.current?.focus(), 0);
  }

  async function handleToggleFlag() {
    if (!prompt) return;
    const next = !flagged;
    setFlagged(next);
    try {
      await setCompositionFlagAction(prompt.id, next);
    } catch (err) {
      setFlagged(!next);
      setError(String((err as Error).message ?? err));
    }
  }

  // ── モード選択画面 ──
  if (mode === null) {
    return (
      <div className="space-y-4">
        <a href="/" className="text-sm text-slate-400 hover:text-slate-200">
          ← 戻る
        </a>
        <h2 className="text-lg font-semibold text-slate-100">瞬間英作文</h2>
        {loading && <p className="text-slate-400">読み込み中…</p>}
        {error && <p className="text-rose-400">{error}</p>}
        {summary && (
          <div className="space-y-3">
            <button
              type="button"
              disabled={summary.reviewCount === 0}
              onClick={() => startMode("review")}
              className="w-full text-left rounded-xl border border-slate-700 bg-slate-800/60 hover:border-amber-400 disabled:opacity-50 disabled:hover:border-slate-700 p-5 transition-colors"
            >
              <p className="font-semibold text-slate-100 text-lg">🚩 復習パート</p>
              <p className="text-sm text-slate-400 mt-1">「要復習」を付けた問題だけを出題します</p>
              <p className="text-sm text-amber-300 mt-2">
                {summary.reviewCount > 0
                  ? `要復習 ${summary.reviewCount}問`
                  : "要復習の問題はまだありません"}
              </p>
            </button>
            <button
              type="button"
              disabled={summary.newRemaining === 0}
              onClick={() => startMode("new")}
              className="w-full text-left rounded-xl border border-slate-700 bg-slate-800/60 hover:border-sky-400 disabled:opacity-50 disabled:hover:border-slate-700 p-5 transition-colors"
            >
              <p className="font-semibold text-slate-100 text-lg">🆕 新規問題パート</p>
              <p className="text-sm text-slate-400 mt-1">前回の続きから、未実施の問題を順番に出題します</p>
              <p className="text-sm text-sky-300 mt-2">
                {summary.newRemaining > 0
                  ? `未実施 ${summary.newRemaining}問 / 全${summary.total}問`
                  : "全ての問題を実施済みです"}
              </p>
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── 出題画面 ──
  const header = (
    <div className="flex items-center justify-between">
      <button
        type="button"
        onClick={backToMenu}
        className="text-sm text-slate-400 hover:text-slate-200"
      >
        ← モード選択
      </button>
      <div className="flex items-center gap-2">
        <span className="text-xs px-2 py-1 rounded-full bg-slate-700 text-slate-200">
          {MODE_LABELS[mode]}
        </span>
        {prompt && (
          <span className="text-xs px-2 py-1 rounded-full bg-sky-500/15 text-sky-300">
            {CATEGORY_LABELS[prompt.category] ?? prompt.category}
          </span>
        )}
      </div>
    </div>
  );

  if (loading) return <p className="text-slate-400">読み込み中…</p>;
  if (error && !prompt) {
    return (
      <div className="space-y-4">
        {header}
        <p className="text-rose-400">{error}</p>
      </div>
    );
  }
  if (noMorePrompts || !prompt) {
    return (
      <div className="space-y-4">
        {header}
        <p className="text-slate-300 py-8 text-center">
          {mode === "review"
            ? "復習対象の問題はありません。"
            : "新規問題を全て実施しました。復習パートで振り返りましょう。"}
        </p>
        <button
          type="button"
          onClick={backToMenu}
          className="w-full rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-900 font-semibold py-3 transition-colors"
        >
          モード選択に戻る
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-4">
      {header}

      <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-5 text-center space-y-3">
        <div>
          <p className="text-xs text-slate-400 mb-2">この文を英語にしてください</p>
          <p className="text-xl font-semibold text-slate-100">{prompt.jpText}</p>
        </div>
        <button
          type="button"
          onClick={handleToggleFlag}
          aria-pressed={flagged}
          className={`text-sm rounded-full px-4 py-1.5 border transition-colors ${
            flagged
              ? "border-amber-400 bg-amber-500/20 text-amber-200"
              : "border-slate-600 text-slate-300 hover:border-amber-400 hover:text-amber-200"
          }`}
        >
          {flagged ? "🚩 要復習に登録済み(タップで解除)" : "⚑ 要復習にする"}
        </button>
      </div>

      {error && <p className="text-rose-400 text-sm">{error}</p>}

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
                {speech.isListening
                  ? "聞き取り中…話し終えたらマイクをタップして停止し、採点してください"
                  : "タップして話す"}
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

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleReset}
              disabled={!answer && !speech.isListening}
              className="shrink-0 rounded-xl border border-slate-700 px-4 font-semibold text-slate-300 hover:border-rose-400 hover:text-rose-300 disabled:opacity-40 transition-colors"
            >
              🔄 リセット
            </button>
            <button
              type="button"
              onClick={() => handleSubmit(answer)}
              className="flex-1 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-900 font-semibold py-3 transition-colors"
            >
              この内容で採点する
            </button>
          </div>

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
          {result.expressions.length > 0 && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-3">
              <p className="text-xs text-amber-300">💡 頻出表現・便利表現</p>
              <ul className="space-y-2">
                {result.expressions.map((e) => (
                  <li key={e.phrase}>
                    <p className="font-semibold text-slate-100">{e.phrase}</p>
                    <p className="text-sm text-slate-300">{e.explanation}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {mode === "review" && flagged && (
            <p className="text-xs text-slate-400 text-center">
              もう大丈夫と思えたら、上の「要復習」を解除すると復習パートから外れます。
            </p>
          )}
          <button
            type="button"
            onClick={() => loadPrompt(mode, prompt.id)}
            className="w-full rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-900 font-semibold py-3 transition-colors"
          >
            {mode === "review" ? "次の復習問題へ" : "次のお題へ"}
          </button>
        </div>
      )}
    </div>
  );
}
