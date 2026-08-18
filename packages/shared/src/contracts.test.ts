import { describe, expect, it } from "vitest";
import { rewardPreviewRequestSchema } from "./contracts";

describe("rewardPreviewRequestSchema", () => {
  it("rejects client-supplied XP amounts (field does not exist)", () => {
    const parsed = rewardPreviewRequestSchema.safeParse({
      activityType: "workout",
      xp: 99999,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect("xp" in parsed.data).toBe(false);
    }
  });

  it("rejects unknown activity types", () => {
    const parsed = rewardPreviewRequestSchema.safeParse({
      activityType: "cheat",
    });
    expect(parsed.success).toBe(false);
  });
});
