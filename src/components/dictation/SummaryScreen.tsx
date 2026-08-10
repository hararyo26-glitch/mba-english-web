import type { DictationAttemptResult } from "@/hooks/useDictationSession";
import { summarizeSession } from "@/lib/scoring";

interface Props {
  title: string;
  attempts: DictationAttemptResult[];
  onRestart: () => void;
  onBackToList: () => void;
}

export function SummaryScreen({ title, attempts, onRestart, onBackToList }: Props) {
  const summary = summarizeSession(attempts);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-100">{title}</h2>
        <p className="text-slate-400 text-sm">お疲れ様でした。今回のサマリーです。</p>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
        <p className="text-xs text-slate-400">正答率</p>
        <p className="text-3xl font-bold text-sky-400">{summary.accuracyRate}%</p>
        <p className="text-xs text-slate-500 mt-1">
          {summary.correctCount} / {summary.total} 文正解
        </p>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
        <p className="text-sm font-semibold text-slate-200 mb-2">弱点傾向(頻出ミス語)</p>
        {summary.weakWords.length === 0 ? (
          <p className="text-sm text-slate-500">ミスした単語はありませんでした。素晴らしいです！</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {summary.weakWords.map((w) => (
              <span
                key={w.word}
                className="text-sm px-3 py-1 rounded-full bg-rose-500/15 text-rose-300"
              >
                {w.word} ×{w.count}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onRestart}
          className="flex-1 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-900 font-semibold py-3 transition-colors"
        >
          もう一度挑戦
        </button>
        <button
          type="button"
          onClick={onBackToList}
          className="flex-1 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-200 font-semibold py-3 transition-colors"
        >
          記事一覧に戻る
        </button>
      </div>
    </div>
  );
}
