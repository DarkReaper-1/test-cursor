import { describe, expect, it } from "vitest";
import { computeWorkoutXp } from "@/server/services/xp";
import { MAX_WORKOUT_XP, MIN_WORKOUT_XP } from "@/lib/constants/xp";

describe("computeWorkoutXp", () => {
  it("returns a server-side amount inside bounds", () => {
    const xp = computeWorkoutXp({
      durationSec: 20 * 60,
      exercises: [
        { sets: 3, reps: 10, difficulty: 2 },
        { sets: 3, reps: 10, difficulty: 2 },
        { sets: 3, reps: 10, difficulty: 2 },
      ],
    });
    expect(xp).toBeGreaterThanOrEqual(MIN_WORKOUT_XP);
    expect(xp).toBeLessThanOrEqual(MAX_WORKOUT_XP);
  });

  it("does not read a client-provided total", () => {
    const low = computeWorkoutXp({
      durationSec: 60,
      exercises: [{ sets: 1, reps: 1, difficulty: 1 }],
    });
    const high = computeWorkoutXp({
      durationSec: 45 * 60,
      exercises: [
        { sets: 5, reps: 12, difficulty: 5 },
        { sets: 5, reps: 12, difficulty: 5 },
      ],
    });
    expect(high).toBeGreaterThan(low);
    expect(high).toBe(MAX_WORKOUT_XP);
  });
});
