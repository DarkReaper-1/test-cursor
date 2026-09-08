import { describe, expect, it } from "vitest";
import {
  countDistinctTrainingDays,
  evaluatePromotion,
  nextRankAfter,
} from "@/server/services/rank-eligibility";
import { RANK_PROMOTIONS } from "@/lib/constants/ranks";

const circuitReady = {
  rank: "INITIATE" as const,
  level: 5,
  workoutCount: 10,
  streak: 7,
  bestStreak: 7,
  distinctTrainingDays: 10,
  unlockedAchievementKeys: ["first_awakening"],
};

describe("rank eligibility", () => {
  it("offers only the next rank on the ladder", () => {
    expect(nextRankAfter("INITIATE")?.to).toBe("CIRCUIT");
    expect(nextRankAfter("CIRCUIT")?.to).toBe("VOLTAGE");
    expect(nextRankAfter("VOLTAGE")?.to).toBe("KEYSTONE");
    expect(nextRankAfter("KEYSTONE")?.to).toBe("MERIDIAN");
    expect(nextRankAfter("MERIDIAN")?.to).toBe("SOVEREIGN");
    expect(nextRankAfter("SOVEREIGN")).toBeNull();
    expect(RANK_PROMOTIONS.map((row) => row.to)).toEqual([
      "CIRCUIT",
      "VOLTAGE",
      "KEYSTONE",
      "MERIDIAN",
      "SOVEREIGN",
    ]);
  });

  it("requires every CIRCUIT condition (AND)", () => {
    expect(evaluatePromotion(circuitReady).available).toBe(true);
    expect(evaluatePromotion({ ...circuitReady, level: 4 }).available).toBe(false);
    expect(evaluatePromotion({ ...circuitReady, workoutCount: 9 }).available).toBe(false);
    expect(evaluatePromotion({ ...circuitReady, streak: 6 }).available).toBe(false);
    expect(evaluatePromotion({ ...circuitReady, unlockedAchievementKeys: [] }).available).toBe(false);
  });

  it("uses current streak for Circuit and Voltage, best-ever for later ranks", () => {
    expect(
      evaluatePromotion({ ...circuitReady, streak: 6, bestStreak: 30 }).available,
    ).toBe(false);
    const voltageReady = {
      rank: "CIRCUIT" as const,
      level: 10,
      workoutCount: 25,
      streak: 14,
      bestStreak: 14,
      distinctTrainingDays: 25,
      unlockedAchievementKeys: ["circuit"],
    };
    expect(evaluatePromotion(voltageReady).available).toBe(true);
    expect(evaluatePromotion({ ...voltageReady, streak: 13, bestStreak: 40 }).available).toBe(false);

    const keystoneReady = {
      rank: "VOLTAGE" as const,
      level: 20,
      workoutCount: 60,
      streak: 1,
      bestStreak: 21,
      distinctTrainingDays: 60,
      unlockedAchievementKeys: ["iron_will", "limit_breaker"],
    };
    expect(evaluatePromotion(keystoneReady).available).toBe(true);
    expect(evaluatePromotion({ ...keystoneReady, bestStreak: 20 }).available).toBe(false);
  });

  it("does not skip to KEYSTONE or SOVEREIGN from INITIATE even when later stats are met", () => {
    const sovereignStats = {
      rank: "INITIATE" as const,
      level: 50,
      workoutCount: 300,
      streak: 60,
      bestStreak: 60,
      distinctTrainingDays: 90,
      unlockedAchievementKeys: [
        "first_awakening",
        "circuit",
        "voltage",
        "iron_will",
        "limit_breaker",
        "unbreakable",
        "centurion",
      ],
    };
    const result = evaluatePromotion(sovereignStats);
    expect(result.to).toBe("CIRCUIT");
    expect(result.available).toBe(true);
  });

  it("requires 90 distinct training days for Sovereign", () => {
    const sovereign = {
      rank: "MERIDIAN" as const,
      level: 50,
      workoutCount: 300,
      streak: 1,
      bestStreak: 60,
      distinctTrainingDays: 90,
      unlockedAchievementKeys: [
        "first_awakening",
        "circuit",
        "voltage",
        "iron_will",
        "limit_breaker",
        "unbreakable",
        "centurion",
      ],
    };
    expect(evaluatePromotion(sovereign).available).toBe(true);
    expect(evaluatePromotion({ ...sovereign, distinctTrainingDays: 89 }).available).toBe(false);
  });

  it("counts unique local days, not raw workout rows", () => {
    const morning = new Date("2026-03-01T08:00:00Z");
    const evening = new Date("2026-03-01T22:00:00Z");
    const next = new Date("2026-03-02T08:00:00Z");
    expect(countDistinctTrainingDays([morning, evening, next], "UTC")).toBe(2);
  });
});
