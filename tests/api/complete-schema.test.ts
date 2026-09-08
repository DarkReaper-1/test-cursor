import { describe, expect, it } from "vitest";
import { completeWorkoutSchema } from "@/server/validators";

describe("completeWorkoutSchema", () => {
  const valid = {
    idempotencyKey: "11111111-1111-4111-8111-111111111111",
    durationSec: 1200,
    exercises: [{ exerciseId: "22222222-2222-4222-8222-222222222222", sets: 3, reps: 10, weight: 0 }],
  };

  it("strips client XP, level, rank, and attributes", () => {
    const parsed = completeWorkoutSchema.parse({
      ...valid,
      xp: 9999,
      level: 99,
      rank: "SOVEREIGN",
      strength: 99,
    });
    expect(parsed).toEqual(valid);
    expect("xp" in parsed).toBe(false);
  });

  it("does not accept client quest progress", () => {
    const parsed = completeWorkoutSchema.parse({
      ...valid,
      questProgress: 100,
      progress: 100,
    });
    expect(parsed).toEqual(valid);
  });
});
