import type { AIProvider } from "./provider";
import { NoneProvider } from "./none-provider";

export function createAIProvider(name = process.env.AI_PROVIDER ?? "none"): AIProvider {
  const id = name.toLowerCase();
  if (id === "none" || id === "") {
    return new NoneProvider();
  }
  // OpenAI / Anthropic / Gemini adapters land in Phase 6. Unknown ids fall back safely.
  return new NoneProvider();
}
