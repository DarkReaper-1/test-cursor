# Implementation roadmap

Calendar estimates are intentionally omitted. Difficulty is described by systems and invasiveness.

## Phase 0 — Discovery (this delivery)

Research + specs. **No major application code.**

## Phase 1 — Architecture

**Systems:** monorepo, Expo boot, Next healthcheck, Prisma User, tokens, CI, env.  
**Invasiveness:** greenfield.  
**Risk:** tooling bikeshed — pick pnpm/Expo Router and move.

## Phase 2 — Identity

**Systems:** auth, onboarding, character.  
**Risk:** Apple/Google config in cloud agents; email-first in dev.

## Phase 3 — RPG engine

**Systems:** pure TS engines + xp_events.  
**Invasiveness:** low if kept pure.  
**Risk:** economy balance — keep tunables in DB.

## Phase 4 — Quest engine

**Systems:** definitions/instances/Today.  
**Risk:** over-building 9 quest types — ship Main + Recovery only.

## Phase 5 — Fitness

**Systems:** session, sets, progression, timer.  
**Risk:** exercise ontology sprawl — seed small.

## Phase 6 — AI

**Systems:** provider, tools, memory, NL parse.  
**Risk:** cost and injection — NoneProvider always works.

## Phase 7 — Health

**Systems:** HealthProvider.  
**Risk:** permission UX; Android/iOS split. Abstraction first.

## Phase 8 — Computer vision

**Systems:** on-device pose, 1–2 exercises first (squat, push-up).  
**Risk:** false reps — confirm + confidence threshold.

## Phase 9 — Social

Friends, private groups, opt-in challenges. No friend-HP.

## Phase 10 — World

Regions, bosses, seasons. Unlock from real progress. Original lore.

## Phase 11 — Monetization

RevenueCat after the loop is loved. Entitlements server-side.

## Phase 12 — Polish

Motion, haptics, sound, a11y, performance, empty/error, onboarding craft.

## Dependency graph (MVP critical path)

```
P1 skeleton
  → P2 identity
    → P3 RPG
      → P4 quests ──┐
    → P5 fitness ───┴→ playable loop
                      → P6 AI (can stub until then)
```

P7–P12 hang off the playable loop, not the reverse.
