# AI architecture

## Layers

```
UI
  → Application service (CoachService)
    → AIOrchestrator
      → AIProvider (OpenAI | Anthropic | Gemini | None)
    → ToolRuntime (allowlist)
    → MemoryRetriever
    → Validators (Zod + domain)
      → Persistence
```

UI never imports a vendor SDK.

## Provider interface (PROPOSED)

```ts
interface AIProvider {
  id: string;
  complete(req: CompletionRequest): Promise<CompletionResponse>;
}
```

`NoneProvider` returns rule-based fallbacks for CI and airplane mode.

## Structured outputs

Every coach response is Zod-validated JSON:

- `CoachTurn`: message, citations (fact ids), suggested_actions[]
- `QuestProposal`
- `WorkoutParse`
- `MealSuggestion`

On parse failure: retry once with repair prompt, then fallback to rules. Never partial-apply.

## Tools

| Tool | Mode | Notes |
| --- | --- | --- |
| get_user_profile | read | redacted |
| get_user_stats | read | |
| get_recent_workouts | read | |
| get_active_quests | read | |
| get_progress | read | |
| recommend_workout | write-proposal | fitness engine must accept |
| parse_workout | write-proposal | user confirms |
| recommend_meal | write-proposal | later |
| create_quest_proposal | write-proposal | quest engine must accept |

## Memory

| Store | Content | TTL |
| --- | --- | --- |
| Profile | stable prefs | until edited |
| Goal | current objectives | until completed |
| Behavioral | patterns | rolling |
| Performance | PRs, progression | long |
| Context | last 14 days events | short |
| Conversation | summaries, not transcripts | 90d default |

Retrieval: rank by recency × relevance. Cap tokens. User can delete all AI memory.

## Safety

- System prompt: not a doctor; no diagnosis; respect constraints; no ego-max when user reports pain
- No XP numbers from the model as grants
- Log model id + latency + finish reason, not health payloads
