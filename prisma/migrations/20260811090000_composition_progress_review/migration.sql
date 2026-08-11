-- AlterTable
ALTER TABLE "CompositionPrompt" ADD COLUMN     "seq" SERIAL NOT NULL;

-- CreateTable
CREATE TABLE "CompositionProgress" (
    "scope" TEXT NOT NULL,
    "lastSeq" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompositionProgress_pkey" PRIMARY KEY ("scope")
);

-- CreateTable
CREATE TABLE "CompositionReviewQueue" (
    "promptId" TEXT NOT NULL,
    "nextReviewAt" TIMESTAMP(3) NOT NULL,
    "intervalDays" DOUBLE PRECISION NOT NULL DEFAULT 1,

    CONSTRAINT "CompositionReviewQueue_pkey" PRIMARY KEY ("promptId")
);

-- CreateIndex
CREATE INDEX "CompositionReviewQueue_nextReviewAt_idx" ON "CompositionReviewQueue"("nextReviewAt");

-- CreateIndex
CREATE UNIQUE INDEX "CompositionPrompt_seq_key" ON "CompositionPrompt"("seq");

-- AddForeignKey
ALTER TABLE "CompositionReviewQueue" ADD CONSTRAINT "CompositionReviewQueue_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "CompositionPrompt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
