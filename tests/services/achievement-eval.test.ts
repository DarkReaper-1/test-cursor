import { describe, expect, it } from "vitest";
import { ACHIEVEMENT_CATALOG } from "@/lib/constants/achievements";
import {
  evaluatePredicate,
  isPerformancePr,
  nextAchievementStatus,
  parseAchievementPredicate,
} from "@/server/services/achievement-eval";

const baseCtx = {
  workoutCount: 0,
  level: 1,
  rank: "INITIATE" as const,
  streak: 0,
  currentExercises: [] as Array<{ exerciseId: string; sets: number; reps: number; weight: number }>,
  priorExercises: [] as Array<{ exerciseId: string; sets: number; reps: number; weight: number }>,
};

describe("achievement catalog", () => {
  it("contains the seven approved definitions", () => {
    const byKey = Object.fromEntries(ACHIEVEMENT_CATALOG.map((entry) => [entry.key, entry]));
    expect(byKey.first_awakening?.xpReward).toBe(50);
    expect(byKey.circuit?.xpReward).toBe(150);
    expect(byKey.voltage?.xpReward).toBe(300);
    expect(byKey.iron_will?.xpReward).toBe(250);
    expect(byKey.unbreakable?.xpReward).toBe(750);
    expect(byKey.limit_breaker?.xpReward).toBe(200);
    expect(byKey.centurion?.xpReward).toBe(750);
    expect(ACHIEVEMENT_CATALOG).toHaveLength(7);
  });
});

describe("achievement evaluation", () => {
  it("unlocks First Awakening on the first workout", () => {
    const result = evaluatePredicate(
      { kind: "WORKOUT_COUNT", min: 1 },
      { ...baseCtx, workoutCount: 1 },
    );
    expect(result?.qualifies).toBe(true);
    expect(result?.progress).toBe(1);
  });

  it("unlocks Circuit at CIRCUIT and above", () => {
    const pred = { kind: "RANK_REACHED" as const, rank: "CIRCUIT" as const };
    expect(evaluatePredicate(pred, { ...baseCtx, level: 4, rank: "INITIATE" })?.qualifies).toBe(false);
    expect(evaluatePredicate(pred, { ...baseCtx, level: 5, rank: "CIRCUIT" })?.qualifies).toBe(true);
    expect(evaluatePredicate(pred, { ...baseCtx, level: 12, rank: "VOLTAGE" })?.qualifies).toBe(true);
    expect(evaluatePredicate(pred, { ...baseCtx, level: 14, rank: "INITIATE" })?.qualifies).toBe(false);
    expect(evaluatePredicate(pred, { ...baseCtx, level: 4, rank: "INITIATE" })?.progress).toBe(4);
    expect(evaluatePredicate(pred, { ...baseCtx, level: 4, rank: "INITIATE" })?.target).toBe(5);
  });

  it("unlocks Voltage at VOLTAGE", () => {
    const pred = { kind: "RANK_REACHED" as const, rank: "VOLTAGE" as const };
    expect(evaluatePredicate(pred, { ...baseCtx, level: 9, rank: "CIRCUIT" })?.qualifies).toBe(false);
    expect(evaluatePredicate(pred, { ...baseCtx, level: 10, rank: "VOLTAGE" })?.qualifies).toBe(true);
  });

  it("unlocks Iron Will at 7 and Unbreakable at 30", () => {
    expect(evaluatePredicate({ kind: "STREAK", min: 7 }, { ...baseCtx, streak: 6 })?.qualifies).toBe(false);
    expect(evaluatePredicate({ kind: "STREAK", min: 7 }, { ...baseCtx, streak: 7 })?.qualifies).toBe(true);
    expect(evaluatePredicate({ kind: "STREAK", min: 30 }, { ...baseCtx, streak: 29 })?.qualifies).toBe(false);
    expect(evaluatePredicate({ kind: "STREAK", min: 30 }, { ...baseCtx, streak: 30 })?.qualifies).toBe(true);
  });

  it("unlocks Centurion at 100 workouts", () => {
    expect(
      evaluatePredicate({ kind: "WORKOUT_COUNT", min: 100 }, { ...baseCtx, workoutCount: 99 })?.qualifies,
    ).toBe(false);
    expect(
      evaluatePredicate({ kind: "WORKOUT_COUNT", min: 100 }, { ...baseCtx, workoutCount: 100 })?.progress,
    ).toBe(100);
  });

  it("treats greater volume or same-weight extra reps as a performance PR", () => {
    const prior = [{ exerciseId: "ex1", sets: 3, reps: 10, weight: 0 }];
    expect(
      isPerformancePr([{ exerciseId: "ex1", sets: 4, reps: 10, weight: 0 }], prior),
    ).toBe(true);
    expect(
      isPerformancePr([{ exerciseId: "ex1", sets: 3, reps: 12, weight: 0 }], prior),
    ).toBe(true);
    expect(
      isPerformancePr([{ exerciseId: "ex1", sets: 3, reps: 10, weight: 0 }], prior),
    ).toBe(false);
    expect(
      isPerformancePr([{ exerciseId: "ex1", sets: 5, reps: 10, weight: 0 }], []),
    ).toBe(false);
  });

  it("does not treat workout XP as a performance metric", () => {
    const prior = [{ exerciseId: "ex1", sets: 3, reps: 10, weight: 0 }];
    expect(
      isPerformancePr([{ exerciseId: "ex2", sets: 1, reps: 1, weight: 0 }], prior),
    ).toBe(false);
  });

  it("fails closed on unknown predicates", () => {
    expect(parseAchievementPredicate({ kind: "UNKNOWN" })).toBeNull();
    expect(evaluatePredicate({ kind: "BOSS" }, baseCtx)).toBeNull();
    expect(
      nextAchievementStatus({
        predicate: { kind: "UNKNOWN" },
        currentStatus: "LOCKED",
        qualifies: true,
        progress: 99,
        hasPriorPerformance: true,
      }),
    ).toBe("LOCKED");
  });

  it("keeps unlocked status even if current streak is lower", () => {
    expect(
      nextAchievementStatus({
        predicate: { kind: "STREAK", min: 7 },
        currentStatus: "UNLOCKED",
        qualifies: false,
        progress: 1,
        hasPriorPerformance: true,
      }),
    ).toBe("UNLOCKED");
  });
});
