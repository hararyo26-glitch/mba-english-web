-- CreateTable
CREATE TABLE "Episode" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "publishedAt" TIMESTAMP(3),
    "audioUrl" TEXT,
    "durationSec" DOUBLE PRECISION,
    "wpm" DOUBLE PRECISION,
    "cefrLevel" TEXT,
    "transcriptStatus" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Episode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sentence" (
    "id" SERIAL NOT NULL,
    "episodeId" TEXT NOT NULL,
    "idx" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "audioStart" DOUBLE PRECISION NOT NULL,
    "audioEnd" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Sentence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DictationAttempt" (
    "id" SERIAL NOT NULL,
    "sentenceId" INTEGER NOT NULL,
    "userInput" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "diffJson" TEXT NOT NULL,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DictationAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewQueue" (
    "id" SERIAL NOT NULL,
    "sentenceId" INTEGER NOT NULL,
    "nextReviewAt" TIMESTAMP(3) NOT NULL,
    "intervalDays" DOUBLE PRECISION NOT NULL DEFAULT 1,

    CONSTRAINT "ReviewQueue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompositionPrompt" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "jpText" TEXT NOT NULL,
    "modelAnswers" TEXT NOT NULL,

    CONSTRAINT "CompositionPrompt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompositionAttempt" (
    "id" SERIAL NOT NULL,
    "promptId" TEXT NOT NULL,
    "userAnswer" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "feedback" TEXT NOT NULL,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompositionAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Episode_transcriptStatus_idx" ON "Episode"("transcriptStatus");

-- CreateIndex
CREATE INDEX "Sentence_episodeId_idx" ON "Sentence"("episodeId");

-- CreateIndex
CREATE UNIQUE INDEX "Sentence_episodeId_idx_key" ON "Sentence"("episodeId", "idx");

-- CreateIndex
CREATE INDEX "DictationAttempt_sentenceId_idx" ON "DictationAttempt"("sentenceId");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewQueue_sentenceId_key" ON "ReviewQueue"("sentenceId");

-- CreateIndex
CREATE INDEX "ReviewQueue_nextReviewAt_idx" ON "ReviewQueue"("nextReviewAt");

-- CreateIndex
CREATE INDEX "CompositionAttempt_promptId_idx" ON "CompositionAttempt"("promptId");

-- AddForeignKey
ALTER TABLE "Sentence" ADD CONSTRAINT "Sentence_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DictationAttempt" ADD CONSTRAINT "DictationAttempt_sentenceId_fkey" FOREIGN KEY ("sentenceId") REFERENCES "Sentence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewQueue" ADD CONSTRAINT "ReviewQueue_sentenceId_fkey" FOREIGN KEY ("sentenceId") REFERENCES "Sentence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompositionAttempt" ADD CONSTRAINT "CompositionAttempt_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "CompositionPrompt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
