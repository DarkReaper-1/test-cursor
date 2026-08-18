# Analytics (privacy-preserving)

Instrument only after the API exists. Events are counters and funnels, not workout payloads.

## Product

- onboarding_completed
- first_quest_completed
- first_workout_completed
- session_started / session_completed
- recovery_quest_shown / completed
- ai_turn_succeeded / failed (no prompt bodies)
- d1 / d7 / d30 return (derived)

## Quality

- api_latency
- ai_latency
- crash-free sessions
- auth_failure

Do not log health samples, exact weights, or chat transcripts.
