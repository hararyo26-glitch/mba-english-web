import { forwardRef } from "react";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled: boolean;
}

export const AnswerInput = forwardRef<HTMLInputElement, Props>(function AnswerInput(
  { value, onChange, onSubmit, disabled },
  ref
) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="dictation-input" className="text-sm text-slate-400">
        聞こえた文章をそのまま入力してください
      </label>
      <input
        id="dictation-input"
        ref={ref}
        type="text"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onSubmit();
          }
        }}
        placeholder="Type what you hear..."
        className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-lg text-slate-100 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40 disabled:opacity-60"
      />
      <p className="text-xs text-slate-500">Enter = 答え合わせ / Tab = 次のセンテンス</p>
    </div>
  );
});
