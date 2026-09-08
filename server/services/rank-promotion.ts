import type { Player, Prisma } from "@prisma/client";
import { Prisma as PrismaNs } from "@prisma/client";
import type { Db } from "../db/client";
import { prisma } from "../db/client";
import * as playerRepo from "../repositories/player";
import * as workoutRepo from "../repositories/workout";
import * as achievementRepo from "../repositories/achievement";
import * as promotionRepo from "../repositories/rank-promotion";
import * as xpEventRepo from "../repositories/xp-event";
import * as eventRepo from "../repositories/progression-event";
import { RANK_IDENTITY_LINE, type RankKey } from "@/lib/constants/ranks";
import type {
  AchievementUnlockDto,
  ProgressionEventDto,
  PromotionDto,
  PromotionResult,
} from "@/lib/types";
import { toPlayerSnapshot } from "@/lib/format";
import { levelFromTotalXp } from "./level";
import { evaluateAchievementsForState } from "./achievement";
import {
  countDistinctTrainingDays,
  evaluatePromotion,
  type RankEligibilityInput,
} from "./rank-eligibility";

function isUniqueViolation(err: unknown): boolean {
  return err instanceof PrismaNs.PrismaClientKnownRequestError && err.code === "P2002";
}

export async function loadRankEligibility(db: Db, player: Player): Promise<RankEligibilityInput> {
  const [workoutCount, completedAt, unlockedAchievementKeys] = await Promise.all([
    workoutRepo.countCompletedWorkouts(db, player.id),
    workoutRepo.listCompletedAt(db, player.id),
    achievementRepo.listUnlockedAchievementKeys(db, player.id),
  ]);
  return {
    rank: player.rank as RankKey,
    level: player.level,
    workoutCount,
    streak: player.streak,
    bestStreak: player.bestStreak,
    distinctTrainingDays: countDistinctTrainingDays(completedAt, player.timezone),
    unlockedAchievementKeys,
  };
}

export async function getPromotionForPlayer(db: Db, player: Player): Promise<PromotionDto> {
  return evaluatePromotion(await loadRankEligibility(db, player));
}

export async function getPromotionForAccount(accountId: string): Promise<PromotionDto> {
  const player = await playerRepo.findPlayerByAccountId(prisma, accountId);
  if (!player) throw new Error("PLAYER_MISSING");
  return getPromotionForPlayer(prisma, player);
}

async function replayAcceptedPromotion(playerId: string, toRank: string): Promise<PromotionResult> {
  const player = await playerRepo.findPlayerById(prisma, playerId);
  if (!player) throw new Error("PLAYER_NOT_FOUND");
  const record = await promotionRepo.findRankPromotion(prisma, playerId, toRank);
  if (!record) throw new Error("PROMOTION_NOT_AVAILABLE");
  const to = record.toRank as Exclude<RankKey, "INITIATE">;
  const snapshot =
    record.requirementSnapshot && typeof record.requirementSnapshot === "object"
      ? (record.requirementSnapshot as Record<string, unknown>)
      : {};
  return {
    replay: true,
    from: record.fromRank as RankKey,
    to,
    identity: RANK_IDENTITY_LINE[to],
    player: toPlayerSnapshot(player),
    achievementXp: 0,
    achievementUnlocks: [],
    promotion: await getPromotionForPlayer(prisma, player),
    events: [
      {
        type: "RANK_UP",
        payload: {
          from: record.fromRank,
          to: record.toRank,
          level: record.levelAtAccept,
          xp: record.xpAtAccept,
          requirementSnapshot: snapshot,
        },
      },
    ],
  };
}

export async function acceptNextRank(input: {
  playerId: string;
  now?: Date;
}): Promise<PromotionResult> {
  const now = input.now ?? new Date();
  try {
    return await prisma.$transaction(async (tx) => {
      const player = await playerRepo.findPlayerById(tx, input.playerId);
      if (!player) throw new Error("PLAYER_NOT_FOUND");

      const eligibility = await loadRankEligibility(tx, player);
      const offered = evaluatePromotion(eligibility);
      if (!offered.available || !offered.to) {
        throw new Error("PROMOTION_NOT_AVAILABLE");
      }

      const toRank = offered.to;
      const requirementSnapshot = offered as unknown as Prisma.InputJsonValue;

      await promotionRepo.insertRankPromotion(tx, {
        playerId: player.id,
        fromRank: player.rank,
        toRank,
        levelAtAccept: player.level,
        xpAtAccept: player.xp,
        workoutCountAtAccept: eligibility.workoutCount,
        streakAtAccept: player.streak,
        bestStreakAtAccept: player.bestStreak,
        requirementSnapshot,
        acceptedAt: now,
      });

      const rankUpPayload = {
        from: player.rank,
        to: toRank,
        level: player.level,
        xp: player.xp,
        requirementSnapshot: offered,
      };

      await eventRepo.insertProgressionEvent(tx, {
        playerId: player.id,
        type: "RANK_UP",
        payload: rankUpPayload as Prisma.InputJsonValue,
      });

      await playerRepo.savePlayerSnapshot(tx, player.id, { rank: toRank });

      const achievementUnlocks: AchievementUnlockDto[] = [];
      let achievementXp = 0;
      let totalXp = await xpEventRepo.sumXp(tx, player.id);
      let nextLevel = levelFromTotalXp(totalXp);

      for (let pass = 0; pass < 4; pass += 1) {
        const batch = await evaluateAchievementsForState(tx, {
          playerId: player.id,
          now,
          level: nextLevel,
          rank: toRank,
          streak: player.streak,
          exercises: [],
          kinds: ["RANK_REACHED"],
        });
        if (batch.unlocks.length === 0) break;
        achievementUnlocks.push(...batch.unlocks);
        achievementXp += batch.achievementXp;
        totalXp = await xpEventRepo.sumXp(tx, player.id);
        const raisedLevel = levelFromTotalXp(totalXp);
        if (raisedLevel === nextLevel) break;
        nextLevel = raisedLevel;
      }

      totalXp = await xpEventRepo.sumXp(tx, player.id);
      nextLevel = levelFromTotalXp(totalXp);
      const leveledUp = nextLevel > player.level;

      await playerRepo.savePlayerSnapshot(tx, player.id, {
        xp: totalXp,
        level: nextLevel,
        rank: toRank,
      });

      const updated = await playerRepo.findPlayerById(tx, player.id);
      if (!updated) throw new Error("PLAYER_NOT_FOUND");
      const nextPromotion = await getPromotionForPlayer(tx, updated);

      const events: ProgressionEventDto[] = [{ type: "RANK_UP", payload: rankUpPayload }];
      for (const unlock of achievementUnlocks) {
        events.push({
          type: "ACHIEVEMENT_UNLOCKED",
          payload: {
            achievementId: unlock.id,
            key: unlock.key,
            title: unlock.title,
            description: unlock.description,
            identity: unlock.identity,
            family: unlock.family,
            xp: unlock.xp,
          },
        });
      }
      if (leveledUp) {
        events.push({ type: "LEVEL_UP", payload: { from: player.level, to: nextLevel } });
        await eventRepo.insertProgressionEvent(tx, {
          playerId: player.id,
          type: "LEVEL_UP",
          payload: { from: player.level, to: nextLevel },
        });
      }

      return {
        replay: false,
        from: player.rank as RankKey,
        to: toRank,
        identity: RANK_IDENTITY_LINE[toRank],
        player: toPlayerSnapshot(updated),
        achievementXp,
        achievementUnlocks,
        promotion: nextPromotion,
        events,
      };
    });
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
    const player = await playerRepo.findPlayerById(prisma, input.playerId);
    if (!player) throw new Error("PLAYER_NOT_FOUND");
    const latest = await promotionRepo.findLatestRankPromotion(prisma, player.id);
    if (!latest) throw new Error("PROMOTION_NOT_AVAILABLE");
    return replayAcceptedPromotion(player.id, latest.toRank);
  }
}
