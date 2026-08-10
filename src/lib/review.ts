import "server-only";
import { prisma } from "@/lib/db";

/**
 * SM-2を簡略化した間隔反復スケジューリング。
 * - 誤答: 翌日に再出題(interval=1日にリセット)
 * - 復習で正解: intervalを2倍に伸ばして次回出題を遅らせる(最大30日でキャップ)
 */
const MAX_INTERVAL_DAYS = 30;

export async function recordAttemptOutcome(sentenceId: number, isCorrect: boolean) {
  const existing = await prisma.reviewQueue.findUnique({ where: { sentenceId } });

  if (!isCorrect) {
    const nextReviewAt = addDays(new Date(), 1);
    await prisma.reviewQueue.upsert({
      where: { sentenceId },
      update: { nextReviewAt, intervalDays: 1 },
      create: { sentenceId, nextReviewAt, intervalDays: 1 },
    });
    return;
  }

  if (existing) {
    const nextInterval = Math.min(existing.intervalDays * 2, MAX_INTERVAL_DAYS);
    await prisma.reviewQueue.update({
      where: { sentenceId },
      data: { nextReviewAt: addDays(new Date(), nextInterval), intervalDays: nextInterval },
    });
  }
}

export async function getDueReviewItems(limit = 20) {
  const rows = await prisma.reviewQueue.findMany({
    where: { nextReviewAt: { lte: new Date() } },
    orderBy: { nextReviewAt: "asc" },
    take: limit,
    include: {
      sentence: {
        include: { episode: true },
      },
    },
  });

  return rows.map((r) => ({
    sentenceId: r.sentenceId,
    text: r.sentence.text,
    audioStart: r.sentence.audioStart,
    audioEnd: r.sentence.audioEnd,
    episodeId: r.sentence.episode.id,
    episodeTitle: r.sentence.episode.title,
    audioUrl: r.sentence.episode.audioUrl,
    nextReviewAt: r.nextReviewAt.toISOString(),
  }));
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
