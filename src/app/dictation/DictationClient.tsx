"use client";

import { useState } from "react";
import {
  fetchEpisodeDetailAction,
  fetchReviewQueueAction,
} from "@/lib/actions/dictation-actions";
import { EpisodeList, type EpisodeSummary } from "@/components/dictation/EpisodeList";
import { DictationSession } from "@/components/dictation/DictationSession";
import type { SentenceData } from "@/hooks/useDictationSession";

interface ReviewItem {
  sentenceId: number;
  text: string;
  audioStart: number;
  audioEnd: number;
  episodeId: string;
  episodeTitle: string;
  audioUrl: string | null;
  nextReviewAt: string;
}

interface SelectedSession {
  title: string;
  sentences: SentenceData[];
  episodeAudioUrl: string | null;
  startIndex: number;
}

interface Props {
  initialEpisodes: EpisodeSummary[];
  initialReviewItems: ReviewItem[];
}

export function DictationClient({ initialEpisodes, initialReviewItems }: Props) {
  const [episodes] = useState(initialEpisodes);
  const [reviewItems, setReviewItems] = useState(initialReviewItems);
  const [session, setSession] = useState<SelectedSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSelectEpisode(episode: EpisodeSummary) {
    setLoading(true);
    setError(null);
    try {
      const detail = await fetchEpisodeDetailAction(episode.id);
      if (!detail) throw new Error("記事の取得に失敗しました");
      setSession({
        title: detail.title,
        episodeAudioUrl: detail.audioUrl,
        sentences: detail.sentences,
        startIndex: detail.startIndex,
      });
    } catch (err) {
      setError(String((err as Error).message ?? err));
    } finally {
      setLoading(false);
    }
  }

  function handleStartReview() {
    setSession({
      title: "今日の復習",
      episodeAudioUrl: null,
      startIndex: 0,
      sentences: reviewItems.map((item, i) => ({
        dbId: item.sentenceId,
        index: i,
        text: item.text,
        audioStart: item.audioStart,
        audioEnd: item.audioEnd,
        audioUrl: item.audioUrl ?? undefined,
      })),
    });
  }

  async function handleBackToList() {
    setSession(null);
    try {
      setReviewItems(await fetchReviewQueueAction());
    } catch {
      // 復習リストの再取得失敗はサイレントに無視
    }
  }

  if (session) {
    return (
      <DictationSession
        key={session.title + session.sentences.length}
        title={session.title}
        sentences={session.sentences}
        episodeAudioUrl={session.episodeAudioUrl}
        startIndex={session.startIndex}
        onBackToList={handleBackToList}
      />
    );
  }

  return (
    <div className="space-y-4">
      {reviewItems.length > 0 && (
        <button
          type="button"
          onClick={handleStartReview}
          className="w-full text-left rounded-xl border border-sky-500/40 bg-sky-500/10 hover:bg-sky-500/20 transition-colors p-4"
        >
          <p className="font-semibold text-sky-300">📚 今日の復習 ({reviewItems.length}件)</p>
          <p className="text-xs text-slate-400 mt-1">過去に間違えたセンテンスが出題対象になっています</p>
        </button>
      )}

      {loading && <p className="text-slate-400 text-sm">エピソードを読み込み中…</p>}
      {error && <p className="text-rose-400 text-sm">{error}</p>}

      <EpisodeList episodes={episodes} onSelect={handleSelectEpisode} />
    </div>
  );
}
