# MVP definition

The first playable Helix is **one excellent loop**, not the full vision.

```
ONBOARDING
  → GOAL SELECTION
  → CHARACTER
  → TODAY’S QUEST
  → WORKOUT
  → COMPLETION
  → XP (server)
  → LEVEL PROGRESSION
  → NEXT QUEST
```

If this loop is not delightful, no world map will save the product.

## In scope

- Expo app with auth (dev: email; production-ready Apple/Google hooks)
- Onboarding: goal, equipment, minutes, experience, constraints
- Character with level, XP, 6 default attributes (configurable catalog)
- Today screen: **one** main quest + optional side
- Workout session: exercises, sets, reps, weight, RPE, rest timer that survives background
- Complete → confirm → `POST` completion with idempotency key
- RewardEngine + level-up
- Momentum displayed; miss yesterday → Recovery quest instead of fail-shame
- Deterministic next-workout suggestion from last session
- Coach copy: static + one AI path behind `AIProvider` (can stub in CI)
- Empty / loading / error states
- Unit tests for XP, levels, momentum, progression
- Docs synced

## Out of scope (MVP)

- Camera pose
- HealthKit / Health Connect
- Nutrition logging
- Guilds, friends, leaderboards
- Bosses, seasons, full world map
- RevenueCat
- Voice
- Multi-language
- Habit universe beyond one optional daily habit quest

## Acceptance (Definition of Done)

A new user can, without paying:

1. Create an account
2. Finish onboarding
3. See a character
4. Understand today’s action
5. Complete a workout (manual log)
6. See XP and a level (or progress toward next)
7. See what to do next
8. Come back “next day” (simulated clock in tests) and get a coherent next quest, including a recovery path if they skipped

Plus: types, lint, tests, a11y pass on Today and Session, no client-awarded XP.
