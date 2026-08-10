"use server";

import { prisma } from "@/lib/db";
import { scoreCompositionWithGemini } from "@/lib/gemini";

export async function fetchCompositionCategoriesAction() {
  const rows = await prisma.compositionPrompt.findMany({
    select: { category: true },
    distinct: ["category"],
  });
  return rows.map((r) => r.category);
}

export async function fetchRandomCompositionPromptAction(category?: string) {
  const where = category ? { category } : {};
  const count = await prisma.compositionPrompt.count({ where });
  if (count === 0) return null;
  const skip = Math.floor(Math.random() * count);
  const prompt = await prisma.compositionPrompt.findFirst({ where, skip });
  if (!prompt) return null;
  return { id: prompt.id, category: prompt.category, jpText: prompt.jpText };
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

  return { score: result.score, feedback: result.feedback, modelAnswers };
}
