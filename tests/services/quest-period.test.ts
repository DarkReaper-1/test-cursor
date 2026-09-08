import { describe, expect, it } from "vitest";
import { dailyPeriod, weeklyPeriod } from "@/server/services/quest-period";

describe("quest periods", () => {
  it("uses the player's timezone for the daily boundary, not UTC midnight", () => {
    const zone = "America/New_York";
    const stillSunday = new Date("2026-09-08T03:59:00Z");
    const monday = new Date("2026-09-08T04:00:00Z");
    expect(dailyPeriod(stillSunday, zone).periodKey).toBe("2026-09-07");
    expect(dailyPeriod(monday, zone).periodKey).toBe("2026-09-08");
  });

  it("expires daily quests at the next local midnight", () => {
    const zone = "America/New_York";
    const now = new Date("2026-09-08T16:00:00Z");
    const period = dailyPeriod(now, zone);
    expect(period.expiresAt.toISOString()).toBe("2026-09-09T04:00:00.000Z");
    expect(period.startedAt.toISOString()).toBe("2026-09-08T04:00:00.000Z");
  });

  it("keeps weekly periods across daily boundaries", () => {
    const zone = "America/New_York";
    const monday = new Date("2026-09-08T04:00:00Z");
    const tuesday = new Date("2026-09-09T12:00:00Z");
    const week = weeklyPeriod(monday, zone);
    expect(week.periodKey).toBe("week:2026-09-07");
    expect(weeklyPeriod(tuesday, zone).periodKey).toBe(week.periodKey);
    expect(week.expiresAt.toISOString()).toBe("2026-09-14T04:00:00.000Z");
  });

  it("uses UTC midnight only when the player timezone is UTC", () => {
    const now = new Date("2026-09-08T00:30:00Z");
    expect(dailyPeriod(now, "UTC").periodKey).toBe("2026-09-08");
    expect(dailyPeriod(new Date("2026-09-07T23:59:00Z"), "UTC").periodKey).toBe("2026-09-07");
  });
});
