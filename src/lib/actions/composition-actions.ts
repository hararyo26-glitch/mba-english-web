"use server";

import { prisma } from "@/lib/db";
import { scoreCompositionWithGemini } from "@/lib/gemini";

export type CompositionMode = "new" | "review";

export interface CompositionExpression {
  phrase: string;
  explanation: string;
}

const ALL_SCOPE = "__ALL__";

function parseExpressions(raw: string): CompositionExpression[] {
  try {
    return JSON.parse(raw) as CompositionExpression[];
  } catch {
    return [];
  }
}

async function getProgressSeq() {
  const progress = await prisma.compositionProgress.findUnique({ where: { scope: ALL_SCOPE } });
  return progress?.lastSeq ?? 0;
}

/** モード選択画面用。復習パート(要復習フラグ付き)と新規問題パート(未実施)の残件数 */
export async function fetchCompositionSummaryAction() {
  const lastSeq = await getProgressSeq();
  const [total, newRemaining, reviewCount] = await Promise.all([
    prisma.compositionPrompt.count(),
    prisma.compositionPrompt.count({ where: { seq: { gt: lastSeq } } }),
    prisma.compositionFlag.count(),
  ]);
  return { total, newRemaining, reviewCount };
}

/**
 * 新規問題パート: 前回の続き(未実施の次の問題)を順番に出題する。
 * 復習パート: 「要復習」フラグ付きの問題を、最後に取り組んだのが古い順に出題する(直前の問題は避ける)。
 * 該当する問題が無ければnull。
 */
export async function fetchNextCompositionPromptAction(mode: CompositionMode, excludeId?: string) {
  if (mode === "new") {
    const next = await prisma.compositionPrompt.findFirst({
      where: { seq: { gt: await getProgressSeq() } },
      orderBy: { seq: "asc" },
      include: { flag: true },
    });
    if (!next) return null;
    return { id: next.id, category: next.category, jpText: next.jpText, flagged: !!next.flag };
  }

  const flags = await prisma.compositionFlag.findMany({ include: { prompt: true } });
  if (flags.length === 0) return null;

  const lastAttempts = await prisma.compositionAttempt.groupBy({
    by: ["promptId"],
    where: { promptId: { in: flags.map((f) => f.promptId) } },
    _max: { attemptedAt: true },
  });
  const lastAt = new Map(lastAttempts.map((a) => [a.promptId, a._max.attemptedAt?.getTime() ?? 0]));

  const sorted = [...flags].sort((a, b) => {
    const aExcluded = a.promptId === excludeId ? 1 : 0;
    const bExcluded = b.promptId === excludeId ? 1 : 0;
    if (aExcluded !== bExcluded) return aExcluded - bExcluded;
    const diff = (lastAt.get(a.promptId) ?? 0) - (lastAt.get(b.promptId) ?? 0);
    if (diff !== 0) return diff;
    return a.flaggedAt.getTime() - b.flaggedAt.getTime();
  });
  const picked = sorted[0].prompt;
  return { id: picked.id, category: picked.category, jpText: picked.jpText, flagged: true };
}

/** 「要復習」フラグの付け外し */
export async function setCompositionFlagAction(promptId: string, flagged: boolean) {
  if (flagged) {
    await prisma.compositionFlag.upsert({
      where: { promptId },
      update: {},
      create: { promptId },
    });
  } else {
    await prisma.compositionFlag.deleteMany({ where: { promptId } });
  }
  return { flagged };
}

export async function submitCompositionAttemptAction(promptId: string, userAnswer: string) {
  const prompt = await prisma.compositionPrompt.findUnique({
    where: { id: promptId },
    include: { flag: true },
  });
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

  // 新規問題パートの「前回の続き」位置を進める(復習パートで古い問題を解いても戻らない)
  if (prompt.seq > (await getProgressSeq())) {
    await prisma.compositionProgress.upsert({
      where: { scope: ALL_SCOPE },
      update: { lastSeq: prompt.seq },
      create: { scope: ALL_SCOPE, lastSeq: prompt.seq },
    });
  }

  return {
    score: result.score,
    feedback: result.feedback,
    modelAnswers,
    expressions: parseExpressions(prompt.expressions),
    flagged: !!prompt.flag,
  };
}
