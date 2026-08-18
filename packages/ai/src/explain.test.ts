import { describe, expect, it } from "vitest";
import { coachToday } from "./coach";
import { explainToday } from "./explain";
import { NoneProvider } from "./none-provider";

describe("explainToday", () => {
  it("explains recovery without a fail frame", () => {
    const why = explainToday({
      category: "recovery",
      title: "The Return Path",
      minutes: 20,
      equipment: "gym",
      missedYesterday: true,
      adaptedFromHistory: false,
    });
    expect(why.toLowerCase()).toContain("momentum");
    expect(why.toLowerCase()).not.toContain("you failed");
  });

  it("explains history-based progression", () => {
    const why = explainToday({
      category: "main",
      title: "Iron Current",
      minutes: 45,
      equipment: "gym",
      missedYesterday: false,
      adaptedFromHistory: true,
    });
    expect(why.toLowerCase()).toContain("history");
  });
});

describe("coachToday", () => {
  it("uses the rules engine when no vendor is configured", async () => {
    const result = await coachToday(new NoneProvider(), {
      category: "main",
      title: "The Quiet Foundation",
      minutes: 20,
      equipment: "none",
      missedYesterday: false,
      adaptedFromHistory: false,
    });
    expect(result.providerId).toBe("none");
    expect(result.why).toContain("bodyweight");
  });
});
