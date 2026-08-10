"use client";

import { useState } from "react";

export interface EpisodeSummary {
  id: string;
  source: string;
  title: string;
  cefrLevel: string | null;
  wpm: number | null;
  sentenceCount: number;
}

interface Props {
  episodes: EpisodeSummary[];
  onSelect: (episode: EpisodeSummary) => void;
}

const ADVANCED_LEVELS = new Set(["C1+", "C2"]);

export function EpisodeList({ episodes, onSelect }: Props) {
  const [advancedOnly, setAdvancedOnly] = useState(false);

  const visibleEpisodes = advancedOnly
    ? episodes.filter((e) => e.cefrLevel && ADVANCED_LEVELS.has(e.cefrLevel))
    : episodes;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-100">記事を選択</h2>
        <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={advancedOnly}
            onChange={(e) => setAdvancedOnly(e.target.checked)}
            className="h-4 w-4 rounded border-slate-600 bg-slate-800 accent-sky-400"
          />
          上級のみ表示 (C1+ / C2)
        </label>
      </div>

      <div className="grid gap-3">
        {visibleEpisodes.map((episode) => (
          <button
            key={episode.id}
            type="button"
            onClick={() => onSelect(episode)}
            className="text-left rounded-xl border border-slate-700 bg-slate-800/60 hover:border-sky-400 hover:bg-slate-800 transition-colors p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-100">{episode.title}</p>
                <p className="text-xs text-slate-400 mt-1">{episode.source}</p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="text-xs px-2 py-1 rounded-full bg-sky-500/15 text-sky-300">
                  {episode.cefrLevel ?? "?"}
                </span>
                <span className="text-xs text-slate-500">{episode.wpm ?? "-"} wpm</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2">{episode.sentenceCount} 文</p>
          </button>
        ))}
        {visibleEpisodes.length === 0 && (
          <p className="text-sm text-slate-500">
            条件に合う記事がありません。GitHub Actionsによる音源取り込みが完了すると表示されます。
          </p>
        )}
      </div>
    </div>
  );
}
