-- CreateEnum
CREATE TYPE "QuestTier" AS ENUM ('DAILY', 'WEEKLY');

-- CreateEnum
CREATE TYPE "QuestType" AS ENUM ('REPS', 'SETS', 'DURATION', 'WORKOUT', 'CONSISTENCY');

-- CreateEnum
CREATE TYPE "QuestStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'EXPIRED');

-- CreateTable
CREATE TABLE "QuestDefinition" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "tier" "QuestTier" NOT NULL,
    "type" "QuestType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "baseTarget" INTEGER NOT NULL,
    "xpReward" INTEGER NOT NULL,
    "predicate" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerQuest" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "tier" "QuestTier" NOT NULL,
    "type" "QuestType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "predicate" JSONB NOT NULL,
    "periodKey" TEXT NOT NULL,
    "target" INTEGER NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "status" "QuestStatus" NOT NULL DEFAULT 'ACTIVE',
    "xpReward" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "sourceIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerQuest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QuestDefinition_key_key" ON "QuestDefinition"("key");

-- CreateIndex
CREATE INDEX "PlayerQuest_playerId_tier_status_idx" ON "PlayerQuest"("playerId", "tier", "status");

-- CreateIndex
CREATE INDEX "PlayerQuest_playerId_expiresAt_idx" ON "PlayerQuest"("playerId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerQuest_playerId_key_periodKey_key" ON "PlayerQuest"("playerId", "key", "periodKey");

-- AddForeignKey
ALTER TABLE "PlayerQuest" ADD CONSTRAINT "PlayerQuest_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerQuest" ADD CONSTRAINT "PlayerQuest_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "QuestDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
