-- AlterTable
ALTER TABLE "Sentence" ADD COLUMN "translationJa" TEXT;

-- CreateTable
CREATE TABLE "EpisodeProgress" (
    "episodeId" TEXT NOT NULL,
    "lastIndex" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EpisodeProgress_pkey" PRIMARY KEY ("episodeId")
);

-- AddForeignKey
ALTER TABLE "EpisodeProgress" ADD CONSTRAINT "EpisodeProgress_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
