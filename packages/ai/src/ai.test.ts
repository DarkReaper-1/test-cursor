import { describe, expect, it } from "vitest";
import { createAIProvider } from "./factory";
import { NoneProvider } from "./none-provider";

describe("AIProvider", () => {
  it("defaults to NoneProvider", async () => {
    const provider = createAIProvider("none");
    expect(provider).toBeInstanceOf(NoneProvider);
    const result = await provider.complete({
      system: "helix",
      prompt: "What should I do today?",
    });
    expect(result.providerId).toBe("none");
    expect(result.text).toContain("rules engine");
  });

  it("does not throw for unknown future vendors", () => {
    expect(createAIProvider("openai").id).toBe("none");
  });
});
