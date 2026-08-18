# Product requirements — Helix

Status: Phase 0. No application code yet.

## 1. North star

**What should I do today to become better tomorrow?**

The user should not operate a dozen trackers. Helix continuously turns:

real-world data → context → goals → history → recovery → behavior → (optional) AI reasoning → personalized actions → quests → completion → server-validated rewards → long-term identity.

## 2. Brand (PROPOSED)

| Item | Decision |
| --- | --- |
| Product name | **Helix** |
| Metaphor | Personal operating system / Operator identity |
| Tagline | Your operating system for becoming. |
| Daily object | **Directive** (quest in the engine; “quest” is OK in RPG copy) |
| User | **Operator** |
| World | Original regions (Harbor Prime → Threshold → Ironfound → Ember Veil → Pale Ridge → Apex Circuit) — placeholders, replaceable |
| Rank ladder | Spark → Ember → Forge → Current → Lattice → Apex (not E–SSS hunter ranks) |
| Visual | Futuristic, cinematic, premium, minimal. Not cyan-manhwa HUD. Not Solo Leveling. Not Arise. |

Assumption: name is working title until legal/brand review.

## 3. Non-goals (v1)

- Diagnosing disease or prescribing treatment
- Medical-grade form analysis
- Cloning Arise UI/IP
- Paywalling the core loop during development
- Guilds, bosses, seasons as MVP
- Building every health integration on day one

## 4. Personas (PROPOSED)

1. **Returning athlete** — wants intelligent load, not a 100-push-up meme every day
2. **Inconsistent beginner** — needs one action and a humane miss path
3. **Time-poor professional** — 15 minutes, travel, hotel floor
4. **Builder** — training plus reading, deep work, sleep

MVP optimizes for 1–3. Persona 4 must not require a schema rewrite.

## 5. Character

Persistent identity, not a profile page with a BMI.

Configurable attributes (examples, not locked):

- BODY
- VITALITY
- AGILITY
- MIND
- FOCUS
- DISCIPLINE

Architecture: `AttributeDefinition` + `AttributeScore`. New stats are rows, not migrations of 30 columns.

Also: level, rank, XP, titles, momentum, cosmetics (later).

## 6. Functional requirements

### 6.1 Identity

- Sign in with Apple, Google, email
- Onboarding: goal, experience, equipment, time budget, constraints, coaching tone
- Character created on server
- User can edit assumptions Helix has inferred

### 6.2 RPG engine (server-authoritative)

- XP, levels, ranks, attributes, titles, achievements, streaks, momentum, currencies
- `RewardEngine.calculateReward(activity, context)` — never in UI components
- Anti-abuse: idempotency, duplicates, impossible rates — flag, don’t auto-ban on AI suspicion

### 6.3 Momentum

- 0–100 (or equivalent) consistency signal
- Miss: decrease, never “your character died”
- Recovery Directive: partial restore
- Completing all daily priorities: small gain

### 6.4 Quests

Types (engine support; MVP ships a subset): Main, Side, Habit, Challenge, Hidden, Recovery, Boss, Social, Seasonal.

Fields: requirements, conditions, progress, rewards, expiration, difficulty, prerequisites, recurrence, verification method, XP, stat rewards, unlocks.

### 6.5 AI

- Provider-agnostic `AIProvider`
- Tools: read vs write separated
- Writes only after deterministic validation
- Structured memory (profile, goals, behavior, performance, context, conversation summaries)
- Retrieval, not full history dump
- Coach answers: what today, why workout changed, 15 minutes, no gym, missed yesterday, exhausted, what to eat (wellness), what to focus on
- NL log: “bench 135 for 8,8,7” → structured preview → user corrects → store

### 6.6 Fitness

- Exercises, sessions, sets (load, reps, duration, rest, RPE)
- Adaptive next session from history (8,8,7 → 8,8,8 then progress)
- No frozen 90-day PDF
- Failure states: 10-minute emergency, bodyweight alternative, travel, tired (reduce, don’t ego-load)

### 6.7 Health (Phase 7)

`HealthProvider`: HealthKit, Health Connect, future wearables. Least privilege.

### 6.8 Camera (Phase 8)

Push-up, squat, sit-up, lunge, jumping jack, plank. Pipeline: camera → pose → landmarks → reps → form estimate → confidence → user confirm → server → reward. Copy: estimate, not medical.

### 6.9 Nutrition (post-MVP)

Calories, macros, water, meal log, search, NL, suggestions from ingredients. Wellness framing.

### 6.10 World / bosses / guilds / social

Architect now. Ship after MVP. Privacy on every social surface.

### 6.11 Voice (later)

STT → AI → tools → TTS. Same authz as GUI.

### 6.12 Notifications

Contextual, user-configurable, not spam.

## 7. Quality requirements

- Accessibility: Dynamic Type, VoiceOver, large targets, contrast, reduced motion, non-color status
- Offline: local session → sync → server validation → reward
- Performance: fast start, 60fps where practical, paginate, don’t premature-optimize everything
- Security: secrets never in the client; entitlements server-side; Zod on all inputs
- Privacy: export, delete, disconnect, memory delete, AI data controls
- Observability: errors, latency, AI fail, funnel; no sensitive health in logs
- Testing: unit engines, API integration, security cases, later E2E

## 8. Monetization

After the core loop is genuinely useful. Do not block the product behind a paywall in development. RevenueCat when implementation begins.

## 9. Metrics (privacy-preserving)

Onboarding completion, first quest, first workout, D1/D7/D30, WAU, quest/workout completion, momentum retention, AI usage, later conversion.

## 10. AI safety

Assistant, not clinician. No diagnosis, no prescriptions, no invented certainty, no unsafe “push through injury.” Escalate to professional care when appropriate.
