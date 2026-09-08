-- CreateEnum
CREATE TYPE "AchievementFamily" AS ENUM ('MILESTONE', 'STREAK', 'MASTERY');

-- CreateEnum
CREATE TYPE "AchievementStatus" AS ENUM ('LOCKED', 'IN_PROGRESS', 'UNLOCKED');

-- CreateTable
CREATE TABLE "AchievementDefinition" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "family" "AchievementFamily" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "identity" TEXT NOT NULL,
    "baseTarget" INTEGER NOT NULL,
    "xpReward" INTEGER NOT NULL,
    "predicate" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AchievementDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerAchievement" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "family" "AchievementFamily" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "identity" TEXT NOT NULL,
    "predicate" JSONB NOT NULL,
    "target" INTEGER NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "status" "AchievementStatus" NOT NULL DEFAULT 'LOCKED',
    "xpReward" INTEGER NOT NULL,
    "unlockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AchievementDefinition_key_key" ON "AchievementDefinition"("key");

-- CreateIndex
CREATE INDEX "PlayerAchievement_playerId_family_status_idx" ON "PlayerAchievement"("playerId", "family", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerAchievement_playerId_key_key" ON "PlayerAchievement"("playerId", "key");

-- AddForeignKey
ALTER TABLE "PlayerAchievement" ADD CONSTRAINT "PlayerAchievement_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerAchievement" ADD CONSTRAINT "PlayerAchievement_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "AchievementDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
