import { describe, expect, it } from "vitest";
import { formatRest, remainingMs } from "./rest";

describe("rest timer", () => {
  it("computes remaining time from wall clock, not a running interval", () => {
    expect(remainingMs(1_000_000, 999_000)).toBe(1_000);
    expect(remainingMs(1_000_000, 2_000_000)).toBe(0);
    expect(remainingMs(null, 1)).toBe(0);
  });

  it("formats countdown for VoiceOver-friendly text", () => {
    expect(formatRest(90_000)).toBe("1:30");
    expect(formatRest(5_000)).toBe("0:05");
  });
});
