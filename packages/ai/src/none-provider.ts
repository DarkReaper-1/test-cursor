import type { AIProvider, CompletionRequest, CompletionResponse } from "./provider";

/**
 * Deterministic fallback used in CI, airplane mode, and when no vendor key exists.
 * Never used to grant XP.
 */
export class NoneProvider implements AIProvider {
  id = "none";

  async complete(req: CompletionRequest): Promise<CompletionResponse> {
    return {
      providerId: this.id,
      text: JSON.stringify({
        message:
          "Helix is running without a model vendor. Today's priority comes from the rules engine, not a language model.",
        promptPreview: req.prompt.slice(0, 80),
        suggested_actions: [],
      }),
    };
  }
}
