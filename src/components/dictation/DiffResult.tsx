import type { DictationAttemptResult } from "@/hooks/useDictationSession";

const STYLE_BY_TYPE: Record<string, string> = {
  correct: "bg-emerald-500/20 text-emerald-300",
  missing: "bg-amber-500/20 text-amber-300 line-through decoration-amber-400/70",
  wrong: "bg-rose-500/20 text-rose-300",
};

interface Props {
  result: DictationAttemptResult;
}

export function DiffResult({ result }: Props) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span
          className={`text-sm font-semibold px-2 py-1 rounded-full ${
            result.isCorrect
              ? "bg-emerald-500/20 text-emerald-300"
              : "bg-rose-500/20 text-rose-300"
          }`}
        >
          {result.isCorrect ? "正解！" : "要復習"}
        </span>
      </div>

      <div className="text-lg leading-loose flex flex-wrap gap-x-1.5 gap-y-1">
        {result.diffTokens.map((token, i) => (
          <span key={i} className={`diff-word ${STYLE_BY_TYPE[token.type]}`}>
            {token.text}
          </span>
        ))}
      </div>

      <div className="text-sm text-slate-400 space-y-1">
        <p>
          <span className="text-emerald-300">緑</span>=正解 /{" "}
          <span className="text-amber-300">黄</span>=抜け漏れ /{" "}
          <span className="text-rose-300">赤</span>=誤り
        </p>
        <p className="text-slate-500">
          あなたの解答: <span className="text-slate-300">{result.userInput || "(未入力)"}</span>
        </p>
      </div>
    </div>
  );
}
