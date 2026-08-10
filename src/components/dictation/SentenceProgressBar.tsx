interface Props {
  current: number;
  total: number;
}

export function SentenceProgressBar({ current, total }: Props) {
  const percent = total === 0 ? 0 : Math.round((current / total) * 100);
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-slate-400 mb-1">
        <span>
          {Math.min(current + 1, total)} / {total} 文
        </span>
        <span>{percent}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-700 overflow-hidden">
        <div
          className="h-full bg-sky-400 transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
