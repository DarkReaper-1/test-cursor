# Project Readiness Report — Helix Phase 0

**Date:** 2026-08-18  
**Status:** Discovery complete. Implementation must not start until this report is accepted (this document *is* that report).  
**Product working name:** Helix — a personal RPG that turns real-world progress into an evolving digital identity.

---

## 1. What was observed

### Recording

The supplied artifact `/mnt/data/ScreenRecording_08-18-2026 02-38-26_1.mp4` **was not in this environment**. `/mnt/data` does not exist. No substitute `.mp4` was found. A frame-accurate reverse-engineer of the recording was therefore **impossible**. That gap is documented, not invented.

### Public competitive reference (Arise)

From Apple lookup `id=6743036247`, App Store, and Google Play (public):

- Product: *Arise: Level Up In Real Life* — “AI Personal Trainer & Workouts”
- Publisher: DIGITAL LIONS APPS (Apple) / GOLDEN GATE MEDIA (Play)
- Bundle ID: `llc.sololeveling.Arise`
- Version 1.4.8 (2026-08-06); first listed 2025-04-02
- ~4.8★ / ~21K US App Store ratings; Play 1M+ installs
- Advertised loop: lifestyle questions → custom plan → daily quests/rewards
- **Subscription required** for plans, quests, and features; IAP “Arise Pro” $4.99–$59.99
- Medical disclaimer present
- Accessibility features **not indicated** by the developer
- Privacy: identifiers / user content; Play says health/fitness may be shared with third parties
- Changelog: localized plans, login work, avatars; Play: photo/gallery workout logging

Ten **marketing** iPhone screenshots (not a live session) show:

1. Awakening / “become a Player” hook  
2. Daily quest with 100 push-up/sit-up/squat-class goals, penalty warning, countdown, Start Quest, 4-tab bar  
3. Training catalog of named “hero” programs  
4. Share card (XP, streak, E rank, fatigue, Instagram)  
5. Per-exercise letter rank E–SSS + Share Rank  
6. Achievements 6/32 hexagonal grid  
7. Bench-press history chart + rank  
8. Nutrition plan (kcal, macros, weight 150→170)  
9. Character sheet (Player/Fighter, rank/level/streak, height/weight)  
10. Level-99 identity endcard  

Public reviews/changelogs additionally show: paywall-before-try, XP penalty on misses, login/gray-screen incidents, rest timer failing in background, data loss after rest days, Discord as community.

**We did not** copy assets, hit private APIs, or bypass the paywall.

---

## 2. What was inferred

- Four tabs: Training / Quest / Stats / Profile. Home is not a single “what now?” OS.
- Daily 100-rep quests and generated splits may compete; rest-day bugs in reviews support that inference.
- “AI” in store copy is unproven as a tool-using coach with memory; stills show plans and HUDs, not a reasoning UI.
- Photo log is presence proof, not pose AI.
- Global rank and per-lift rank both exist; composition unconfirmed.
- Fatigue meter may be cosmetic.
- Penalty is a retention mechanic and a churn mechanic at once.

All of the above stays labeled **INFERRED** until a legal UX recording or first-party use exists.

---

## 3. What we will build

**Helix** — not another Arise.

An adaptive real-life RPG: fitness first, architecture ready for health habits, productivity, and learning. The user has an **Operator** identity that levels as they do. The app answers one question every open:

**What should I do today to become better tomorrow?**

Pipeline:

real data → context → goals → history → recovery → behavior → AI (optional) → validated actions → quests → completion → **server** rewards → long-term character.

Stack (planned): Expo + React Native + TypeScript; Next.js API; Postgres + Prisma; Zod; provider-agnostic AI; RevenueCat only after the loop is useful.

---

## 4. What makes Helix better

| Arise / category | Helix |
| --- | --- |
| Paywall before the fantasy | Core loop playable |
| XP punishment on miss | Momentum + Recovery Directive |
| Anime System clone | Original brand, ranks, world, UI |
| Catalog + quest split | One Today surface |
| AI as marketing noun | Orchestrator, tools, confirmations |
| Photo-only proof | Layered verification later |
| Auth/timer/data-loss reports | Offline session, idempotent grants, real error states |
| Fitness-only physique | Configurable attributes (mind/focus/discipline ready) |
| Accessibility undeclared | a11y as a requirement |
| Health share to third parties (Play label) | Least privilege, no silent brokerage |

Helix is a **life OS with a character**, not a gym sheet wearing a HUD.

---

## 5. Architecture (summary)

- Monorepo: `apps/mobile`, `apps/api`, `packages/{shared,rpg,fitness,ai,design}`
- **RewardEngine** is the only XP authority. UI may preview.
- Completions carry **idempotency keys**.
- AI **proposes**; Zod + domain **validate**; server **executes**.
- `NoneProvider` so CI and offline still run.
- `HealthProvider` / pose pipeline are interfaces, not MVP.
- Secrets never on device.

Details: [`../architecture/proposal.md`](../architecture/proposal.md), [`../database/proposal.md`](../database/proposal.md), [`../ai/architecture.md`](../ai/architecture.md).

---

## 6. MVP scope

Must feel excellent:

Onboarding → goals → character → today’s quest → workout → completion → server XP → level → next quest.

Includes: momentum/recovery, background-safe rest timer, deterministic load progression, empty/loading/error, tests for engines.

Excludes: CV, HealthKit, nutrition, guilds, bosses, world map, subscriptions, voice.

Full bar: [`../product/mvp.md`](../product/mvp.md).

---

## 7. Major risks

| Risk | Mitigation |
| --- | --- |
| Recording never arrives; we misread marketing stills | Treat stills as ads; validate UX in our own prototypes |
| Accidental clone (legal + product) | Brand bible: Helix/Operator/Spark-Apex; design tokens not cyan-manhwa |
| Over-building 12 phases | Critical path P1→P2→P3→P4+P5 only |
| LLM unsafe loads / medical tone | Progression engine owns numbers; safety prompt; disclaimers |
| XP cheating | Server grants, anti-replay, humane flags |
| Auth/entitlement outages (category lesson) | Tests, restore, never gray root |
| Cloud env: no Apple/Google keys | Email auth in dev |
| Scope gravity (guilds, CV, world) | Task board: not DONE without verification; PM cuts |

---

## 8. Next implementation step

**Phase 1 skeleton — after this report.**

1. Scaffold pnpm monorepo (Expo + Next.js + Prisma).  
2. Design tokens on a blank Today screen (original visual).  
3. `GET /api/v1/health` + User migration.  
4. CI: typecheck, lint, unit placeholder.  
5. Start Phase 3 engines in `packages/rpg` in parallel (they need no UI).

Do **not** implement pose CV, paywalls, or anime HUD chrome.

---

## 9. Document index

| Doc | Path |
| --- | --- |
| Reverse-engineering | [`../reverse-engineering/`](../reverse-engineering/) |
| Competitive analysis | [`../research/competitive-analysis.md`](../research/competitive-analysis.md) |
| PRD | [`../product/product-requirements.md`](../product/product-requirements.md) |
| Architecture | [`../architecture/proposal.md`](../architecture/proposal.md) |
| Database | [`../database/proposal.md`](../database/proposal.md) |
| Task board | [`task-board.md`](task-board.md) |
| Roadmap | [`roadmap.md`](roadmap.md) |

---

## 10. Readiness verdict

**Phase 0 is complete enough to start Phase 1.**

The missing recording is a UX-research gap, not an architecture blocker. Public listing evidence is sufficient to know what *not* to copy and where the category is weak. Product north star, MVP loop, schema, and agent plan are specified.

Helix should feel like checking **the System** — our System — not opening another workout tracker, and not opening Arise.
