import { forwardRef, useEffect, useRef } from "react";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled: boolean;
}

export const AnswerInput = forwardRef<HTMLTextAreaElement, Props>(function AnswerInput(
  { value, onChange, onSubmit, disabled },
  ref
) {
  const innerRef = useRef<HTMLTextAreaElement | null>(null);

  // 外部(DictationSession側)からのfocus()呼び出し用のrefと、
  // このコンポーネント内で高さ自動調整に使うrefを両立させる
  function setRefs(el: HTMLTextAreaElement | null) {
    innerRef.current = el;
    if (typeof ref === "function") ref(el);
    else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
  }

  // 入力中に文章がはみ出て見えなくなるのを防ぐため、内容に合わせて高さを自動で伸ばす
  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="dictation-input" className="text-sm text-slate-400">
        聞こえた文章をそのまま入力してください
      </label>
      <textarea
        id="dictation-input"
        ref={setRefs}
        rows={2}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSubmit();
          }
        }}
        placeholder="Type what you hear..."
        className="w-full resize-none overflow-hidden rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-lg leading-relaxed text-slate-100 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40 disabled:opacity-60"
      />
      <p className="text-xs text-slate-500">Enter = 答え合わせ / Shift+Enter = 改行 / Tab = 次のセンテンス</p>
    </div>
  );
});
