import { coachToday, createAIProvider } from "@helix/ai";
import { adaptPlan } from "@helix/fitness";
import {
  assembleToday,
  dateKeyInTimeZone,
  shiftDateKey,
  type DirectivePlan,
  type Equipment,
  type GoalType,
} from "@helix/rpg";
import type { OnboardingRequest } from "@helix/shared";
import type { Prisma, PrismaClient, User } from "@prisma/client";
import { HttpError } from "./http";
import { characterSnapshot } from "./character";

function onboardingOf(user: User & { profile: { onboarding: Prisma.JsonValue | null; timezone: string; onboardingCompletedAt: Date | null } | null }): OnboardingRequest {
  const raw = user.profile?.onboarding;
  if (!raw || typeof raw !== "object") {
    throw new HttpError(409, "ONBOARDING_REQUIRED", "Finish onboarding first.");
  }
  const data = raw as OnboardingRequest;
  if (!data.goal || !data.equipment || !data.minutes) {
    throw new HttpError(409, "ONBOARDING_REQUIRED", "Finish onboarding first.");
  }
  return data;
}

async function historyByExercise(prisma: PrismaClient, userId: string) {
  const session = await prisma.workoutSession.findFirst({
    where: { userId, status: "completed" },
    orderBy: { startedAt: "desc" },
    include: { sets: { orderBy: { sortOrder: "asc" } } },
  });
  const grouped: Record<string, { load: number; reps: number }[]> = {};
  for (const set of session?.sets ?? []) {
    grouped[set.exerciseKey] ??= [];
    grouped[set.exerciseKey].push({ load: set.load, reps: set.reps });
  }
  return grouped;
}

async function coachFor(plan: DirectivePlan, equipment: string, missedYesterday: boolean) {
  return coachToday(createAIProvider(), {
    category: plan.category,
    title: plan.title,
    minutes: plan.minutes,
    equipment,
    missedYesterday,
    adaptedFromHistory: Boolean(plan.adaptedFromHistory),
  });
}

export async function getOrCreateToday(prisma: PrismaClient, user: User & {
  profile: { onboarding: Prisma.JsonValue | null; timezone: string; onboardingCompletedAt: Date | null } | null;
  character: Parameters<typeof characterSnapshot>[0] | null;
}, now = new Date()) {
  if (!user.profile?.onboardingCompletedAt) {
    throw new HttpError(409, "ONBOARDING_REQUIRED", "Finish onboarding first.");
  }
  if (!user.character) {
    throw new HttpError(409, "ONBOARDING_REQUIRED", "Character is missing.");
  }
  const onboarding = onboardingOf(user);
  const timezone = user.profile.timezone || "UTC";
  const todayKey = dateKeyInTimeZone(now, timezone);
  const yesterdayKey = shiftDateKey(todayKey, -1);

  const existing = await prisma.questInstance.findUnique({
    where: { userId_dateKey: { userId: user.id, dateKey: todayKey } },
  });
  if (existing) {
    const payload = existing.payload as unknown as DirectivePlan;
    const coach = await coachFor(
      payload,
      onboarding.equipment,
      existing.category === "recovery",
    );
    return { quest: existing, character: characterSnapshot(user.character), dateKey: todayKey, coach };
  }

  const yesterday = await prisma.questInstance.findUnique({
    where: { userId_dateKey: { userId: user.id, dateKey: yesterdayKey } },
  });
  const missedYesterday = Boolean(yesterday && yesterday.status !== "completed");

  const base = assembleToday({
    missedYesterday,
    equipment: onboarding.equipment as Equipment,
    minutes: onboarding.minutes,
    goal: onboarding.goal as GoalType,
  });
  const adapted = adaptPlan(base.exercises, await historyByExercise(prisma, user.id));
  const plan: DirectivePlan = {
    ...base,
    exercises: adapted.exercises,
    adaptedFromHistory: adapted.adaptedFromHistory,
  };

  const expiresAt = new Date(`${todayKey}T23:59:59.000Z`);
  const quest = await prisma.questInstance.create({
    data: {
      userId: user.id,
      dateKey: todayKey,
      category: plan.category,
      title: plan.title,
      body: plan.body,
      difficulty: plan.difficulty,
      payload: plan as unknown as Prisma.InputJsonValue,
      expiresAt,
    },
  });
  const coach = await coachFor(plan, onboarding.equipment, missedYesterday);

  return { quest, character: characterSnapshot(user.character), dateKey: todayKey, coach };
}
