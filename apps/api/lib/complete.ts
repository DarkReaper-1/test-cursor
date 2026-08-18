import {
  applyGrant,
  calculateReward,
  momentumForCompletion,
} from "@helix/rpg";
import { completeTodayRequestSchema } from "@helix/shared";
import { Prisma, type PrismaClient, type User } from "@prisma/client";
import { characterSnapshot } from "./character";
import { HttpError } from "./http";

function volumeLoad(sets: { load: number; reps: number }[]): number {
  return sets.reduce((sum, set) => sum + set.load * set.reps, 0);
}

export async function completeToday(
  prisma: PrismaClient,
  user: User & {
    character: Parameters<typeof characterSnapshot>[0] | null;
  },
  rawBody: unknown,
) {
  const parsed = completeTodayRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    throw new HttpError(400, "VALIDATION", "Invalid completion payload.");
  }
  if (!user.character) {
    throw new HttpError(409, "ONBOARDING_REQUIRED", "Character is missing.");
  }

  const existingEvent = await prisma.xpEvent.findUnique({
    where: { idempotencyKey: parsed.data.idempotencyKey },
  });
  if (existingEvent) {
    if (existingEvent.userId !== user.id) {
      throw new HttpError(403, "FORBIDDEN", "Idempotency key belongs to another operator.");
    }
    return {
      replay: true,
      granted: true,
      xp: existingEvent.amount,
      character: characterSnapshot(user.character),
    };
  }

  const quest = await prisma.questInstance.findFirst({
    where: { id: parsed.data.questId, userId: user.id },
  });
  if (!quest) {
    throw new HttpError(404, "NOT_FOUND", "Directive not found.");
  }
  if (quest.status === "completed") {
    throw new HttpError(409, "ALREADY_COMPLETE", "Today’s directive is already complete.");
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentCount = await prisma.xpEvent.count({
    where: { userId: user.id, createdAt: { gte: since } },
  });

  const category = quest.category === "recovery" ? "recovery" : "main";
  const reward = calculateReward({
    activityType: category === "recovery" ? "recovery_quest" : "workout",
    difficulty: Math.min(5, Math.max(1, quest.difficulty)) as 1 | 2 | 3 | 4 | 5,
    userLevel: user.character.level,
    streakDays: 0,
    recentActivityCount24h: recentCount,
    volumeLoad: volumeLoad(parsed.data.sets),
    questCategory: category,
  });

  if (reward.flags.impossibleActivity || reward.xp === 0) {
    throw new HttpError(422, "NOT_GRANTED", "This activity looks impossible and was not rewarded.");
  }

  const granted = applyGrant(
    {
      totalXp: user.character.totalXp,
      momentum: user.character.momentum,
      scores: Object.fromEntries(
        user.character.scores.map((score) => [score.definition.key, score.value]),
      ),
    },
    reward,
    momentumForCompletion(category),
  );

  try {
    const updated = await prisma.$transaction(async (tx) => {
      await tx.xpEvent.create({
        data: {
          userId: user.id,
          amount: reward.xp,
          reason: category === "recovery" ? "recovery_quest_completed" : "workout_session_completed",
          sourceType: "quest_instance",
          sourceId: quest.id,
          idempotencyKey: parsed.data.idempotencyKey,
        },
      });

      const session = await tx.workoutSession.create({
        data: {
          userId: user.id,
          questInstanceId: quest.id,
          status: "completed",
          source: "manual",
          endedAt: new Date(),
          sets: {
            create: parsed.data.sets.map((set, index) => ({
              exerciseKey: set.exerciseKey,
              load: set.load,
              reps: set.reps,
              rpe: set.rpe,
              sortOrder: index,
            })),
          },
        },
      });

      await tx.questInstance.update({
        where: { id: quest.id },
        data: { status: "completed", completedAt: new Date() },
      });

      const character = await tx.character.update({
        where: { id: user.character!.id },
        data: {
          totalXp: granted.totalXp,
          level: granted.level,
          rankKey: granted.rankKey,
          momentum: granted.momentum,
        },
        include: { scores: { include: { definition: true } } },
      });

      for (const [key, value] of Object.entries(granted.scores)) {
        const row = character.scores.find((score) => score.definition.key === key);
        if (row) {
          await tx.attributeScore.update({
            where: { id: row.id },
            data: { value },
          });
        }
      }

      const fresh = await tx.character.findUniqueOrThrow({
        where: { id: character.id },
        include: { scores: { include: { definition: true } } },
      });

      return { sessionId: session.id, character: fresh };
    });

    return {
      replay: false,
      granted: true as const,
      xp: reward.xp,
      leveledUp: granted.leveledUp,
      bonuses: reward.bonuses,
      flags: reward.flags,
      character: characterSnapshot(updated.character),
      sessionId: updated.sessionId,
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const replayed = await prisma.xpEvent.findUnique({
        where: { idempotencyKey: parsed.data.idempotencyKey },
      });
      if (replayed?.userId === user.id) {
        const character = await prisma.character.findUniqueOrThrow({
          where: { userId: user.id },
          include: { scores: { include: { definition: true } } },
        });
        return {
          replay: true,
          granted: true as const,
          xp: replayed.amount,
          character: characterSnapshot(character),
        };
      }
    }
    throw error;
  }
}
