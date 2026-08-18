import { explainToday, type TodayFacts } from "./explain";
import type { AIProvider } from "./provider";

function readWhy(text: string): string | null {
  try {
    const data = JSON.parse(text) as { why?: unknown };
    if (typeof data.why === "string" && data.why.length >= 8 && data.why.length <= 400) {
      return data.why;
    }
  } catch {
    return null;
  }
  return null;
}

export async function coachToday(
  provider: AIProvider,
  facts: TodayFacts,
): Promise<{ why: string; providerId: string }> {
  const fallback = explainToday(facts);
  if (provider.id === "none") {
    return { why: fallback, providerId: provider.id };
  }
  try {
    const raw = await provider.complete({
      system:
        "You rephrase Helix coaching copy. Do not mention XP, payments, diagnosis, or treatment. Keep the meaning. Return JSON { why: string }.",
      prompt: JSON.stringify({ facts, fallback }),
    });
    const why = readWhy(raw.text);
    if (!why) {
      return { why: fallback, providerId: provider.id };
    }
    return { why, providerId: provider.id };
  } catch {
    return { why: fallback, providerId: provider.id };
  }
}
