"use server";

import { prisma } from "@/lib/db";
import { scoreCompositionWithGemini } from "@/lib/gemini";

const ALL_SCOPE = "__ALL__";
const MAX_INTERVAL_DAYS = 30;
const PASS_SCORE = 70;
// 未実施のお題がまだ残っていても、この確率で復習期限が来たお題を混ぜて出題する
const REVIEW_INTERLEAVE_PROBABILITY = 0.35;

export async function fetchCompositionCategoriesAction() {
  const rows = await prisma.compositionPrompt.findMany({
    select: { category: true },
    distinct: ["category"],
  });
  return rows.map((r) => r.category);
}

function scopeFor(category?: string) {
  return category ?? ALL_SCOPE;
}

async function findNextUnseen(category: string | undefined, afterSeq: number) {
  return prisma.compositionPrompt.findFirst({
    where: { seq: { gt: afterSeq }, ...(category ? { category } : {}) },
    orderBy: { seq: "asc" },
  });
}

async function findDueReviewPrompt(category?: string) {
  const row = await prisma.compositionReviewQueue.findFirst({
    where: {
      nextReviewAt: { lte: new Date() },
      ...(category ? { prompt: { category } } : {}),
    },
    orderBy: { nextReviewAt: "asc" },
    include: { prompt: true },
  });
  return row?.prompt ?? null;
}

async function randomPrompt(category?: string) {
  const where = category ? { category } : {};
  const count = await prisma.compositionPrompt.count({ where });
  if (count === 0) return null;
  const skip = Math.floor(Math.random() * count);
  return prisma.compositionPrompt.findFirst({ where, skip });
}

/**
 * 瞬間英作文のお題選定ロジック。
 * - 基本方針: 前回の続き(未実施のお題)を順番に出題する
 * - 未実施のお題がまだあっても、一定確率で復習期限が来たお題を混ぜて出題する(定期復習)
 * - 全お題を一周し終えたら、以後は復習キュー主導になる(全て復習期限に応じて再出題される)
 */
export async function fetchNextCompositionPromptAction(category?: string) {
  const scope = scopeFor(category);
  const [due, progress] = await Promise.all([
    findDueReviewPrompt(category),
    prisma.compositionProgress.findUnique({ where: { scope } }),
  ]);
  const next = await findNextUnseen(category, progress?.lastSeq ?? 0);

  let chosen = next;
  if (next && due) {
    chosen = Math.random() < REVIEW_INTERLEAVE_PROBABILITY ? due : next;
  } else if (!next) {
    chosen = due ?? (await randomPrompt(category));
  }
  if (!chosen) return null;

  if (chosen.id === next?.id) {
    await prisma.compositionProgress.upsert({
      where: { scope },
      update: { lastSeq: next.seq },
      create: { scope, lastSeq: next.seq },
    });
  }

  return { id: chosen.id, category: chosen.category, jpText: chosen.jpText };
}

export async function submitCompositionAttemptAction(promptId: string, userAnswer: string) {
  const prompt = await prisma.compositionPrompt.findUnique({ where: { id: promptId } });
  if (!prompt) throw new Error("prompt not found");

  const modelAnswers: string[] = JSON.parse(prompt.modelAnswers);

  const trimmed = userAnswer.trim();
  const result = trimmed
    ? await scoreCompositionWithGemini(prompt.jpText, modelAnswers, trimmed)
    : { score: 0, feedback: "未入力です。制限時間内に英作文してみましょう。" };

  await prisma.compositionAttempt.create({
    data: {
      promptId,
      userAnswer,
      score: result.score,
      feedback: result.feedback,
    },
  });

  await scheduleCompositionReview(promptId, result.score);

  return { score: result.score, feedback: result.feedback, modelAnswers };
}

/**
 * 答え合わせ後、そのお題の次回復習タイミングを簡易SM-2でスケジュールする。
 * ディクテーションの「間違えたものだけ復習」とは異なり、瞬間英作文は
 * 「実施済みのお題は全て定期的に復習に回す」方針のため、スコアに関わらず必ずキューへ乗せる。
 */
async function scheduleCompositionReview(promptId: string, score: number) {
  const passed = score >= PASS_SCORE;
  const existing = await prisma.compositionReviewQueue.findUnique({ where: { promptId } });
  const baseInterval = existing?.intervalDays ?? 1;
  const nextInterval = passed ? Math.min(baseInterval * 2, MAX_INTERVAL_DAYS) : 1;
  const nextReviewAt = addDays(new Date(), nextInterval);

  await prisma.compositionReviewQueue.upsert({
    where: { promptId },
    update: { nextReviewAt, intervalDays: nextInterval },
    create: { promptId, nextReviewAt, intervalDays: nextInterval },
  });
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
