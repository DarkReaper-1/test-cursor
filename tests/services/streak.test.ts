import { describe, expect, it } from "vitest";
import { nextStreak } from "@/server/services/streak";

describe("nextStreak", () => {
  it("starts a streak on the first activity day", () => {
    const result = nextStreak({
      lastActivityDate: null,
      timezone: "UTC",
      currentStreak: 0,
      now: new Date("2026-09-08T12:00:00Z"),
    });
    expect(result.streak).toBe(1);
  });

  it("increments when the previous local day qualified", () => {
    const result = nextStreak({
      lastActivityDate: new Date("2026-09-07T00:00:00Z"),
      timezone: "UTC",
      currentStreak: 3,
      now: new Date("2026-09-08T12:00:00Z"),
    });
    expect(result.streak).toBe(4);
  });

  it("does not double-count the same local day", () => {
    const result = nextStreak({
      lastActivityDate: new Date("2026-09-08T00:00:00Z"),
      timezone: "UTC",
      currentStreak: 4,
      now: new Date("2026-09-08T22:00:00Z"),
    });
    expect(result.streak).toBe(4);
  });

  it("resets after a missed day", () => {
    const result = nextStreak({
      lastActivityDate: new Date("2026-09-05T00:00:00Z"),
      timezone: "UTC",
      currentStreak: 9,
      now: new Date("2026-09-08T12:00:00Z"),
    });
    expect(result.streak).toBe(1);
  });
});
