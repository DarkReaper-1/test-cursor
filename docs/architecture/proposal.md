# Architecture proposal

Status: Phase 0. Skeleton in Phase 1.

## Goals

- Simplest system that can grow into a life OS
- Server-authoritative progression
- AI never mutates XP, health, payments, or auth directly
- Mobile remains replaceable; engines are pure TypeScript

## Context

```
┌─────────────┐     HTTPS      ┌──────────────┐      ┌────────────┐
│ Expo app    │ ─────────────► │ Next.js API  │ ───► │ Postgres   │
│ (UI, local  │ ◄───────────── │ (authz, Zod, │      │ Prisma     │
│  session)   │   JSON         │  engines)    │      └────────────┘
└──────┬──────┘                └──────┬───────┘
       │ offline queue                │
       │                              ▼
       │                       ┌──────────────┐
       │                       │ AIOrchestrator│──► AIProvider
       │                       │ MemoryRetriever│    (OpenAI, …)
       └───────────────────────┴──────────────┘
```

No microservices. No client secrets for AI or DB.

## Repository

```
apps/mobile          React Native Expo Router
apps/api             Next.js App Router + Route Handlers
packages/shared      Zod DTOs, IDs, error codes
packages/rpg         XP, level, rank, momentum, rewards (pure)
packages/fitness     Progression + session math (pure)
packages/ai          Provider interface, tools, prompts
packages/design      Tokens
docs/
```

## API style

- Versioned `/api/v1/...`
- Session: JWT access + rotating refresh (or Better Auth / Clerk only if it stays simple; **PROPOSED:** Auth.js or custom OIDC with Apple/Google — decide in Phase 1 as a single auth library)
- Every write: `userId` from session, never from body as authority
- Idempotency-Key on completions and XP grants
- Rate limits per user

## Domain modules (API)

| Module | Responsibility |
| --- | --- |
| identity | users, profiles, onboarding |
| character | stats snapshot, titles |
| rewards | RewardEngine, xp_events |
| quests | definitions, instances, progress |
| fitness | exercises, sessions, sets, progression |
| coach | orchestrator, proposals |
| memory | facts, summaries, retrieval |
| health | provider adapters (later) |
| social | friends/guilds (later) |
| billing | RevenueCat webhooks (later) |
| audit | security-relevant events |

## Reward path (required)

```
UI logs activity
  → client stores local session (offline-safe)
  → POST /completions { idempotencyKey, payload }
  → authorize
  → validate (Zod + anti-abuse)
  → RewardEngine
  → persist xp_events, character, quest_progress
  → respond new snapshot
```

Client may **preview** XP. Preview is not granted.

## AI path (required)

```
UI → CoachService
  → MemoryRetriever (ranked facts)
  → AIOrchestrator (tools)
  → Provider.complete(structured)
  → Zod parse
  → if write-tool: QuestProposal / WorkoutProposal
  → domain validators
  → persist
```

Read tools: profile, stats, recent workouts, active quests, progress.

Write tools (proposal only): recommend_workout, parse_workout, recommend_meal, create_quest_proposal.

Forbidden to the model: raw SQL, payment, permission, XP number emission as source of truth.

## Mobile

- Expo Router tabs later; MVP stack: Onboarding | Today | Session | Character | Settings
- State: React Query (server) + tiny local store (session draft). Avoid Redux.
- SecureStore for tokens
- SQLite or MMKV for offline session drafts
- Design tokens, no scattered hex colors

## Health / CV (later)

`HealthProvider` interface.

`PosePipeline` on-device; server stores reps + confidence + userConfirmation; never claims medical accuracy.

## Environments

`.env.example` only. development / staging / production.

## CI (Phase 1)

- `pnpm` workspaces (or npm if simpler — **PROPOSED pnpm**)
- typecheck, lint, unit tests on PR
- api tests against test Postgres (or PGlite later)

## What we will not do yet

- Kubernetes
- Event bus
- Multiple databases
- Client-side XP grants
- Calling OpenAI from the app
