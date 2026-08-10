"use server";

import { prisma } from "@/lib/db";
import { recordAttemptOutcome, getDueReviewItems } from "@/lib/review";
import type { DiffToken } from "@/lib/diff";

export async function fetchEpisodeListAction() {
  const episodes = await prisma.episode.findMany({
    where: { transcriptStatus: "done" },
    orderBy: { publishedAt: "desc" },
    include: { _count: { select: { sentences: true } } },
  });

  return episodes.map((e) => ({
    id: e.id,
    source: e.source,
    title: e.title,
    cefrLevel: e.cefrLevel,
    wpm: e.wpm,
    sentenceCount: e._count.sentences,
  }));
}

export async function fetchEpisodeDetailAction(episodeId: string) {
  const episode = await prisma.episode.findUnique({
    where: { id: episodeId },
    include: { sentences: { orderBy: { idx: "asc" } } },
  });
  if (!episode) return null;

  return {
    id: episode.id,
    source: episode.source,
    title: episode.title,
    cefrLevel: episode.cefrLevel,
    wpm: episode.wpm,
    audioUrl: episode.audioUrl,
    sentences: episode.sentences.map((s) => ({
      dbId: s.id,
      index: s.idx,
      text: s.text,
      audioStart: s.audioStart,
      audioEnd: s.audioEnd,
    })),
  };
}

export async function recordDictationAttemptAction(input: {
  sentenceId: number;
  userInput: string;
  isCorrect: boolean;
  diffTokens: DiffToken[];
}) {
  await prisma.dictationAttempt.create({
    data: {
      sentenceId: input.sentenceId,
      userInput: input.userInput,
      isCorrect: input.isCorrect,
      diffJson: JSON.stringify(input.diffTokens),
    },
  });
  await recordAttemptOutcome(input.sentenceId, input.isCorrect);
}

export async function fetchReviewQueueAction(limit = 20) {
  return getDueReviewItems(limit);
}
