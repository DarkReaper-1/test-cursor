-- CreateEnum
CREATE TYPE "QuestStatus" AS ENUM ('active', 'completed', 'expired');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('draft', 'completed');

-- AlterTable
ALTER TABLE "profiles" ADD COLUMN "onboarding" JSONB,
ADD COLUMN "onboarding_completed_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" ADD COLUMN "password_hash" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "goals" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quest_instances" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date_key" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "difficulty" INTEGER NOT NULL DEFAULT 3,
    "status" "QuestStatus" NOT NULL DEFAULT 'active',
    "payload" JSONB NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quest_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "quest_instance_id" TEXT,
    "status" "SessionStatus" NOT NULL DEFAULT 'draft',
    "source" TEXT NOT NULL DEFAULT 'manual',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),

    CONSTRAINT "workout_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_sets" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "exercise_key" TEXT NOT NULL,
    "load" INTEGER NOT NULL DEFAULT 0,
    "reps" INTEGER NOT NULL,
    "rpe" INTEGER,
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "workout_sets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "goals_user_id_status_idx" ON "goals"("user_id", "status");

-- CreateIndex
CREATE INDEX "quest_instances_user_id_status_idx" ON "quest_instances"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "quest_instances_user_id_date_key_key" ON "quest_instances"("user_id", "date_key");

-- CreateIndex
CREATE INDEX "workout_sessions_user_id_started_at_idx" ON "workout_sessions"("user_id", "started_at" DESC);

-- CreateIndex
CREATE INDEX "workout_sets_session_id_idx" ON "workout_sets"("session_id");

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quest_instances" ADD CONSTRAINT "quest_instances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_quest_instance_id_fkey" FOREIGN KEY ("quest_instance_id") REFERENCES "quest_instances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_sets" ADD CONSTRAINT "workout_sets_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "workout_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
