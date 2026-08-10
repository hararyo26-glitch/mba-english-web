// 瞬間英作文プロンプトの初期投入スクリプト。
// 実行: npx tsx prisma/seed.ts (DATABASE_URL は .env / 環境変数から読む)
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const prompts = JSON.parse(
    fs.readFileSync(path.join(__dirname, "compositionPrompts.json"), "utf-8"),
  );

  for (const p of prompts) {
    await prisma.compositionPrompt.upsert({
      where: { id: p.id },
      update: {
        category: p.category,
        jpText: p.jp_text,
        modelAnswers: JSON.stringify(p.model_answers),
      },
      create: {
        id: p.id,
        category: p.category,
        jpText: p.jp_text,
        modelAnswers: JSON.stringify(p.model_answers),
      },
    });
  }

  console.log(`seeded ${prompts.length} composition prompts`);
  await prisma.$disconnect();
}

main();
