import {
  assembleToday,
  dateKeyInTimeZone,
  shiftDateKey,
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
    return { quest: existing, character: characterSnapshot(user.character), dateKey: todayKey };
  }

  const yesterday = await prisma.questInstance.findUnique({
    where: { userId_dateKey: { userId: user.id, dateKey: yesterdayKey } },
  });
  const missedYesterday = Boolean(yesterday && yesterday.status !== "completed");

  const plan = assembleToday({
    missedYesterday,
    equipment: onboarding.equipment as Equipment,
    minutes: onboarding.minutes,
    goal: onboarding.goal as GoalType,
  });

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

  return { quest, character: characterSnapshot(user.character), dateKey: todayKey };
}
