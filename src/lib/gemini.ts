import "server-only";
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

let client: GoogleGenAI | null = null;

function getClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY が設定されていません。.env.local または Vercel の環境変数を確認してください。"
    );
  }
  if (!client) {
    client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return client;
}

const SCORING_SYSTEM_PROMPT = `あなたはMBA留学中の日本人ビジネスパーソン向けの英語コーチです。
「瞬間英作文」の採点を行います。日本語のお題文・模範解答・ユーザーの解答が与えられるので、
ユーザーの解答が模範解答と意味的にどれだけ近く、文法的に正しいかを0〜100点で採点し、
日本語で2〜3文の簡潔なフィードバックを書いてください。

採点基準:
- 意味が模範解答と一致していれば高得点(表現の違いは減点対象にしない)
- 文法・語彙のミスがあれば減点し、フィードバックで具体的に指摘する
- 完全に見当違いの内容であれば0点に近い点数にする

出力は指定されたJSON形式のみ。前置きや説明文は含めない。`;

export interface CompositionScoreResult {
  score: number;
  feedback: string;
}

export async function scoreCompositionWithGemini(
  jpText: string,
  modelAnswers: string[],
  userAnswer: string
): Promise<CompositionScoreResult> {
  const ai = getClient();
  const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";

  const userPrompt = `【日本語のお題】${jpText}
【模範解答】${modelAnswers.join(" / ")}
【ユーザーの解答】${userAnswer.trim() || "(未入力)"}`;

  const response = await ai.models.generateContent({
    model,
    contents: userPrompt,
    config: {
      systemInstruction: SCORING_SYSTEM_PROMPT,
      maxOutputTokens: 1024,
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.INTEGER, description: "0から100の採点" },
          feedback: { type: Type.STRING, description: "日本語のフィードバック(2〜3文)" },
        },
        required: ["score", "feedback"],
      },
    },
  });

  const text = response.text?.trim();
  if (!text) {
    throw new Error("採点結果の生成に失敗しました");
  }

  const parsed = JSON.parse(text) as CompositionScoreResult;
  return {
    score: Math.max(0, Math.min(100, Math.round(parsed.score))),
    feedback: parsed.feedback,
  };
}
