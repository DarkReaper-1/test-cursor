# Task board

Statuses: **TODO** · **IN PROGRESS** · **BLOCKED** · **REVIEW** · **DONE**

Rule: never mark DONE without verification (tests, docs, or explicit N/A for research).

---

## Phase 0 — Discovery

| ID | Task | Owner | Deps | Acceptance | Files | Tests | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P0-1 | Inspect recording / document gap | UX | — | Recording found or gap documented | reverse-engineering/README.md | N/A | **DONE** |
| P0-2 | Screen inventory | UX | P0-1 | Every public frame labeled O/I/P | screen-inventory.md | N/A | **DONE** |
| P0-3 | User flows + IA | Product | P0-2 | Flows for acquire, daily, miss, share | user-flows.md, interaction-map.md | N/A | **DONE** |
| P0-4 | Feature inventory + gaps | Product | P0-3 | Gap table vs Helix | feature-inventory.md, competitive-gaps.md | N/A | **DONE** |
| P0-5 | Competitive analysis | Product | — | Category, love/hate, thesis | research/competitive-analysis.md | N/A | **DONE** |
| P0-6 | PRD + assumptions + brand | Product | P0-5 | North star, non-goals | product/*.md | N/A | **DONE** |
| P0-7 | Architecture + AI + security | Backend/Security/AI | P0-6 | Diagrams, reward/AI paths | architecture, ai, security | N/A | **DONE** |
| P0-8 | Database proposal | Database | P0-7 | Normalized MVP schema | database/proposal.md | N/A | **DONE** |
| P0-9 | MVP + roadmap + agents | PM | P0-8 | Loop defined, phases 1–12 | mvp.md, roadmap.md, agent-roles.md | N/A | **DONE** |
| P0-10 | Project Readiness Report | PM | P0-9 | Report complete | project-readiness-report.md | N/A | **DONE** |

Phase 0 application code: complete. Phase 1 skeleton: [`../architecture/phase-1.md`](../architecture/phase-1.md).

---

## Phase 1 — Architecture skeleton

| ID | Task | Owner | Deps | Acceptance | Files | Tests | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P1-1 | Monorepo + tooling | DevOps | P0-10 | pnpm, TS, lint, CI | apps/*, packages/*, .github | CI green | **DONE** (typecheck + tests locally) |
| P1-2 | Expo app boots | Mobile | P1-1 | Splash → placeholder Today | apps/mobile | typecheck + identity test | **DONE** |
| P1-3 | Next.js health API | Backend | P1-1 | `GET /api/v1/health` | apps/api | live 200 + unit | **DONE** |
| P1-4 | Prisma + Postgres | Database | P1-1 | schema + migration SQL | prisma | prisma validate | **DONE** (migrate needs local Postgres) |
| P1-5 | Shared Zod contracts | Backend | P1-1 | package builds | packages/shared | unit | **DONE** |
| P1-6 | Design tokens | UI | P1-2 | theme used by Today | packages/design | identity test | **DONE** |
| P1-7 | .env.example | DevOps | P1-3 | documented vars | .env.example | N/A | **DONE** |

---

## Phase 2 — Identity

| ID | Task | Owner | Deps | Acceptance | Files | Tests | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P2-1 | Auth | Backend/Mobile | P1-3 | email + session | api + mobile | auth integration | TODO |
| P2-2 | Onboarding | Product/Mobile | P2-1 | answers persisted | onboarding | e2e later | TODO |
| P2-3 | Character create | RPG | P2-2 | snapshot + attributes | character | unit | TODO |

---

## Phase 3 — RPG engine

| ID | Task | Owner | Deps | Acceptance | Files | Tests | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P3-1 | RewardEngine | RPG | P1-5 | no UI XP constants | packages/rpg | extensive unit | **DONE** |
| P3-2 | Levels + ranks | RPG | P3-1 | tables + apply | packages/rpg | unit | **DONE** |
| P3-3 | Momentum | RPG | P3-1 | miss/recovery math | packages/rpg | unit | **DONE** |
| P3-4 | xp_events API | Backend/Security | P3-1 | idempotent, authz | api | security tests | TODO |

---

## Phase 4 — Quest engine

| ID | Task | Owner | Deps | Acceptance | Files | Tests | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P4-1 | Definitions + instances | RPG | P3-4 | main + recovery | quests | unit | TODO |
| P4-2 | Today assembly | Product | P4-1 | one priority | api + mobile | unit | TODO |

---

## Phase 5 — Fitness

| ID | Task | Owner | Deps | Acceptance | Files | Tests | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P5-1 | Exercise seed | Fitness | P1-4 | core lifts + bodyweight | db seed | N/A | TODO |
| P5-2 | Session + sets | Fitness | P5-1 | offline draft | mobile + api | unit | TODO |
| P5-3 | Progression 8,8,7 | Fitness | P5-2 | next prescription | packages/fitness | unit | **DONE** (engine only) |
| P5-4 | Background rest timer | Mobile | P5-2 | survives background | mobile | manual + unit | TODO |

---

## Phase 6 — AI

| ID | Task | Owner | Deps | Acceptance | Files | Tests | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P6-1 | AIProvider + None | AI | P1-5 | interface + stub | packages/ai | unit | TODO |
| P6-2 | Tools + proposals | AI/Security | P6-1 | writes validated | api | integration | TODO |
| P6-3 | NL parse workout | AI | P6-2 | confirm UI | mobile | unit fixtures | TODO |
| P6-4 | Memory facts | AI | P6-2 | retrieval cap | api | unit | TODO |

---

## Later (tracked, not MVP)

P7 Health · P8 CV · P9 Social · P10 World · P11 Monetization · P12 Polish — see [`roadmap.md`](roadmap.md).

---

## Blocked

| ID | Reason |
| --- | --- |
| — | Screen recording still missing; does not block Phase 1 |

## In progress

None. Phase 0 complete; Phase 1 not started this turn (prompt: report first).
