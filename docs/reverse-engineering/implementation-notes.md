# Implementation notes (from research → engineering)

These notes constrain Phase 1+ so we do not rebuild a clone or a fragile gym tracker.

## Legal

- **PROPOSED:** Original names, art, UX, animation, sound, story.
- Do not use Arise, Player-awakening copy, hunter ranks as brand, or manhwa HUD chrome.
- Do not reproduce screenshot artwork in the app or docs repo.

## Recording gap

- **OBSERVED:** UX recording missing.
- **PROPOSED:** If a recording is supplied later, append a dated addendum to `screen-inventory.md`. Do not rewrite confirmed public facts.

## Architecture implications

| Lesson | Engineering response |
| --- | --- |
| XP has social/status value | Server-authoritative `RewardEngine`; idempotency keys |
| Missed days cause churn when punished | `MomentumService` + recovery quests |
| Login/paywall bugs destroy trust | Auth + entitlements tested; restore purchase |
| Rest timer in background | OS background-safe timer; do not depend on JS interval alone |
| Photo log ≠ form analysis | Separate `ProofAsset` from `PoseSession` |
| “AI” without validation is unsafe | LLM proposes; Zod validates; services mutate |
| Health data is sensitive | `HealthProvider`; permission matrix; redacted logs |
| Attribute names will change | `AttributeDefinition` table, not hardcoded columns |
| Quest types will grow | Discriminated quest schema + engine plugins |
| Client cannot be trusted | All grants in API routes with user authorization |

## MVP implementation boundary

Build only the loop in [`../product/mvp.md`](../product/mvp.md).

Do **not** in Phase 1:

- Pose CV
- Guilds
- RevenueCat
- Full world map
- Multi-provider AI beyond one adapter + interface
- Microservices

## Suggested monorepo (PROPOSED)

```
apps/mobile     Expo RN
apps/api        Next.js App Router
packages/shared Zod types + API contracts
packages/rpg    Pure TS engines (xp, momentum, quests) + tests
packages/design Tokens (later RN theme)
docs/           This tree
```

## Testing that must exist with the first engine

- XP table + level thresholds
- Duplicate event rejected
- Impossible volume flagged, not auto-punished
- Momentum math
- Workout progression 8,8,7 → 8,8,8
- Authorization: user A cannot write user B’s xp_events

## Observability (from day of first API)

- Request latency
- Auth failures
- AI latency/errors (no health payloads in logs)
- Quest/workout completion counters
- Onboarding funnel

## Assumptions log

See [`../product/assumptions.md`](../product/assumptions.md).
