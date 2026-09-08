-- AlterTable
ALTER TABLE "Player" ADD COLUMN "bestStreak" INTEGER NOT NULL DEFAULT 0;

UPDATE "Player" SET "bestStreak" = GREATEST("bestStreak", "streak");

-- CreateTable
CREATE TABLE "RankPromotion" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "fromRank" TEXT NOT NULL,
    "toRank" TEXT NOT NULL,
    "levelAtAccept" INTEGER NOT NULL,
    "xpAtAccept" INTEGER NOT NULL,
    "workoutCountAtAccept" INTEGER NOT NULL,
    "streakAtAccept" INTEGER NOT NULL,
    "bestStreakAtAccept" INTEGER NOT NULL,
    "requirementSnapshot" JSONB NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RankPromotion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RankPromotion_playerId_acceptedAt_idx" ON "RankPromotion"("playerId", "acceptedAt");

-- CreateIndex
CREATE UNIQUE INDEX "RankPromotion_playerId_toRank_key" ON "RankPromotion"("playerId", "toRank");

-- AddForeignKey
ALTER TABLE "RankPromotion" ADD CONSTRAINT "RankPromotion_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
