import { describe, expect, it } from "vitest";
import { promoteRankSchema } from "@/server/validators";

describe("promoteRankSchema", () => {
  it("strips client rank and XP and accepts an empty body", () => {
    const parsed = promoteRankSchema.parse({
      rank: "SOVEREIGN",
      to: "SOVEREIGN",
      xp: 9999,
      level: 99,
    });
    expect(parsed).toEqual({});
    expect("rank" in parsed).toBe(false);
    expect("xp" in parsed).toBe(false);
    expect(promoteRankSchema.parse({})).toEqual({});
  });
});
