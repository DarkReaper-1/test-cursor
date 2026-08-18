import { describe, expect, it } from "vitest";
import { levelFromTotalXp, rankFromLevel, xpToNextLevel } from "./levels";
import { applyMomentumDelta, MOMENTUM_DELTA, MOMENTUM_START } from "./momentum";
import { calculateReward } from "./rewards";

describe("levels", () => {
  it("starts operators at level 1 with 0 XP", () => {
    expect(levelFromTotalXp(0)).toEqual({
      level: 1,
      xpIntoLevel: 0,
      xpToNext: 100,
    });
  });

  it("levels up exactly at the threshold", () => {
    const need = xpToNextLevel(1);
    expect(levelFromTotalXp(need)).toMatchObject({ level: 2, xpIntoLevel: 0 });
  });

  it("maps ranks from Spark to Apex", () => {
    expect(rankFromLevel(1)).toBe("spark");
    expect(rankFromLevel(8)).toBe("ember");
    expect(rankFromLevel(20)).toBe("forge");
    expect(rankFromLevel(35)).toBe("current");
    expect(rankFromLevel(55)).toBe("lattice");
    expect(rankFromLevel(80)).toBe("apex");
  });
});

describe("momentum", () => {
  it("drops on a miss and recovers without hitting zero from one miss", () => {
    const afterMiss = applyMomentumDelta(MOMENTUM_START, MOMENTUM_DELTA.missedPriority);
    expect(afterMiss).toBe(42);
    const recovered = applyMomentumDelta(afterMiss, MOMENTUM_DELTA.recoveryQuest);
    expect(recovered).toBe(47);
  });

  it("clamps at bounds", () => {
    expect(applyMomentumDelta(2, MOMENTUM_DELTA.missedPriority)).toBe(0);
    expect(applyMomentumDelta(99, MOMENTUM_DELTA.allDailyPriorities)).toBe(100);
  });
});

describe("RewardEngine", () => {
  it("awards workout XP from the engine, not from a client field", () => {
    const result = calculateReward({
      activityType: "workout",
      difficulty: 3,
      userLevel: 1,
      streakDays: 0,
      recentActivityCount24h: 0,
    });
    expect(result.xp).toBeGreaterThan(0);
    expect(result.xp).toBeLessThanOrEqual(400);
    expect(result.attributeDeltas.BODY).toBe(2);
  });

  it("does not grant XP for impossible volume", () => {
    const result = calculateReward({
      activityType: "workout",
      difficulty: 5,
      userLevel: 1,
      streakDays: 30,
      recentActivityCount24h: 0,
      volumeLoad: 999_999,
    });
    expect(result.flags.impossibleActivity).toBe(true);
    expect(result.xp).toBe(0);
    expect(result.attributeDeltas).toEqual({});
  });

  it("flags suspicious frequency and reduces XP", () => {
    const normal = calculateReward({
      activityType: "habit",
      difficulty: 1,
      userLevel: 1,
      streakDays: 0,
      recentActivityCount24h: 1,
    });
    const spam = calculateReward({
      activityType: "habit",
      difficulty: 1,
      userLevel: 1,
      streakDays: 0,
      recentActivityCount24h: 12,
    });
    expect(spam.flags.suspiciousFrequency).toBe(true);
    expect(spam.xp).toBeLessThan(normal.xp);
  });

  it("uses recovery quests instead of a zero-grant penalty event", () => {
    const result = calculateReward({
      activityType: "recovery_quest",
      difficulty: 2,
      userLevel: 4,
      streakDays: 0,
      recentActivityCount24h: 0,
      questCategory: "recovery",
    });
    expect(result.xp).toBeGreaterThan(0);
    expect(result.attributeDeltas.DISCIPLINE).toBe(1);
  });
});
