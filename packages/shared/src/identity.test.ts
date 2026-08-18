import { describe, expect, it } from "vitest";
import { completeTodayRequestSchema, onboardingRequestSchema } from "./identity";

describe("identity contracts", () => {
  it("rejects completion payloads that include client XP", () => {
    const parsed = completeTodayRequestSchema.safeParse({
      idempotencyKey: "11111111-1111-4111-8111-111111111111",
      questId: "11111111-1111-4111-8111-111111111111",
      sets: [{ exerciseKey: "push_up", load: 0, reps: 8 }],
      xp: 99999,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect("xp" in parsed.data).toBe(false);
    }
  });

  it("requires a real goal and time budget", () => {
    expect(onboardingRequestSchema.safeParse({ goal: "nap" }).success).toBe(false);
    expect(
      onboardingRequestSchema.safeParse({
        goal: "strength",
        equipment: "none",
        minutes: 20,
        experience: "beginner",
      }).success,
    ).toBe(true);
  });
});
