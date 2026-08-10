import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Next.js の開発サーバーはホットリロードのたびにモジュールを再評価するため、
// グローバルにキャッシュして PrismaClient のインスタンスが増殖しないようにする。
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL が設定されていません。.env (開発) または Vercel の環境変数 (本番) を確認してください。"
    );
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

// 実際にクエリを発行するまで PrismaClient を生成しない Proxy にしておく。
// DATABASE_URL 未設定のビルド環境でもimportだけでは失敗しないようにする。
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrismaClient();
    return Reflect.get(client as object, prop, receiver);
  },
});
