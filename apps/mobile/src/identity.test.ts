import { describe, expect, it } from "vitest";
import { color } from "@helix/design";

describe("Helix visual identity", () => {
  it("does not use the competitor cyan HUD accent", () => {
    expect(color.accent.toLowerCase()).not.toBe("#00e5ff");
    expect(color.bg).toBe("#141210");
  });
});
