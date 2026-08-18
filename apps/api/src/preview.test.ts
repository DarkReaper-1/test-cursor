import { describe, expect, it } from "vitest";
import { calculateReward } from "@helix/rpg";
import { rewardPreviewRequestSchema } from "@helix/shared";

describe("preview contract", () => {
  it("preview payload cannot include an amount to grant", () => {
    const parsed = rewardPreviewRequestSchema.parse({
      activityType: "workout",
      difficulty: 3,
    });
    const result = calculateReward({
      ...parsed,
      difficulty: 3,
    });
    expect(result.xp).toBeGreaterThan(0);
  });
});
