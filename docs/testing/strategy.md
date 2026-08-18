# Testing strategy

## Unit (required with engines)

- XP grant math, bonuses, caps
- Level thresholds
- Momentum deltas
- Quest expiry
- Workout progression (8,8,7 → 8,8,8)
- Zod proposal rejection

Run in `packages/rpg` and `packages/fitness` without I/O.

## Integration

- Auth session
- Completion idempotency
- Authz (user A cannot complete B)
- AI tool execution with NoneProvider + fake provider
- Migrations

## E2E (after UI exists)

- Onboarding → first quest → complete → XP
- Miss day → recovery
- Subscription later
- Recorded web walkthrough: `node scripts/record-demo.mjs` (Expo web + API)

## Security

- Invalid XP amount in body ignored
- Replay of idempotency key
- Unauthenticated writes 401

## Principle

No engine feature is DONE without tests. UI may lag; math may not.
