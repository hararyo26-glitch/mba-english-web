export type PlaybackRate = 0.75 | 1 | 1.25;

const RATES: PlaybackRate[] = [0.75, 1, 1.25];

interface Props {
  isPlaying: boolean;
  rate: PlaybackRate;
  onRateChange: (rate: PlaybackRate) => void;
  onPlay: () => void;
}

export function AudioControls({ isPlaying, rate, onRateChange, onPlay }: Props) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button
        type="button"
        onClick={onPlay}
        className="flex items-center gap-2 rounded-full bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-slate-900 font-semibold px-5 py-3 transition-colors"
      >
        {isPlaying ? (
          <>
            <span aria-hidden>🔊</span> 再生中…
          </>
        ) : (
          <>
            <span aria-hidden>▶</span> 再生 / リピート
          </>
        )}
      </button>

      <div className="flex items-center gap-1 rounded-full bg-slate-800 p-1">
        {RATES.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => onRateChange(r)}
            className={`px-3 py-2 text-sm rounded-full transition-colors ${
              rate === r
                ? "bg-sky-400 text-slate-900 font-semibold"
                : "text-slate-300 hover:bg-slate-700"
            }`}
          >
            {r}x
          </button>
        ))}
      </div>

      <span className="text-xs text-slate-500">Space キーでも再生できます</span>
    </div>
  );
}
