import type { DictationAttemptResult } from "@/hooks/useDictationSession";

interface Props {
  result: DictationAttemptResult;
}

/**
 * 正解文を表示し、ユーザーが正しく聞き取れた単語だけを緑でハイライトする。
 * 抜け漏れ/誤りを色分け+取り消し線で示す旧表示はわかりづらいとのフィードバックを受け、
 * 「正解の文が読める+合っていた単語がわかる」というシンプルな表示に絞っている。
 */
export function DiffResult({ result }: Props) {
  const correctSentenceTokens = result.diffTokens.filter((t) => t.type !== "wrong");

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
        {correctSentenceTokens.map((token, i) => (
          <span
            key={i}
            className={token.type === "correct" ? "diff-word bg-emerald-500/20 text-emerald-300" : "text-slate-100"}
          >
            {token.text}
          </span>
        ))}
      </div>

      <div className="text-sm text-slate-400 space-y-1">
        <p>
          <span className="text-emerald-300">緑</span>=正しく聞き取れた単語
        </p>
        <p className="text-slate-500">
          あなたの解答: <span className="text-slate-300">{result.userInput || "(未入力)"}</span>
        </p>
      </div>
    </div>
  );
}
