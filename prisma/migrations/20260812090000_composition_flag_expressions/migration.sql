-- AlterTable
ALTER TABLE "CompositionPrompt" ADD COLUMN     "expressions" TEXT NOT NULL DEFAULT '[]';

-- CreateTable
CREATE TABLE "CompositionFlag" (
    "promptId" TEXT NOT NULL,
    "flaggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompositionFlag_pkey" PRIMARY KEY ("promptId")
);

-- AddForeignKey
ALTER TABLE "CompositionFlag" ADD CONSTRAINT "CompositionFlag_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "CompositionPrompt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
