# Phase 6.5 — Playtest & Balance

**Status: locked.** Not a feature phase.

SYSTEM now has a progression state machine. The next question is not what to add. It is:

> Does SYSTEM actually make you want to come back tomorrow?

Do not implement AI, dungeons, builds, social, or adaptive training during this phase.

---

## Architecture freeze

```text
WORKOUT
   ↓
XP
   ↓
LEVEL ──────────────── automatic
   │
   ├── QUESTS
   │
   └── ACHIEVEMENTS
           │
           ↓
      RANK ELIGIBILITY
           │
           ↓
   PLAYER ACCEPTS
           │
           ↓
       RANK UP
```

> **Level is what you earn. Rank is what you are recognized as.**

That distinction is Phase 6. Do not blur it while playtesting.

---

## The loop to test

A session should travel this path without extra systems:

```text
TODAY
  ↓
Directive
  ↓
TRAIN
  ↓
Workout complete
  ↓
XP
  ↓
Quest progress
  ↓
Quest completion
  ↓
Achievement progress/unlock
  ↓
Level progression
  ↓
Promotion becomes available
  ↓
Promotion ceremony
  ↓
Tomorrow
```

Each layer must provide a **different psychological reward**. If they collapse into “+XP, level went up,” the architecture is stronger than the feeling.

| Layer | Reward |
| --- | --- |
| Workout | I did something. |
| Quest | I completed today’s objective. |
| XP / Level | I’m getting stronger in the system. |
| Achievement | I’ve accomplished something permanently. |
| Rank | I’ve become someone different. |

---

## Daily log

Track for **about 14 sessions** (one row per day you open SYSTEM). Do not add features in order to “make the log more interesting.”

Copy this table into `docs/playtest-log.md` (or keep a private copy). Honest “no” answers are the point.

| Date | Opened? | Understood today’s objective immediately? | Workout felt worth doing? | Completing it felt rewarding? | Cared about quest completion? | XP mattered? | Noticed streak? | Checked rank? | Cared when promotion became available? | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |  |  |  |  |  |

### Circuit checkpoint

When the file first shows **CIRCUIT AVAILABLE**, answer in the notes:

1. Do I actually want to press ACCEPT?
2. After pressing it: did CIRCUIT feel earned?

Voltage and later ranks use the same two questions. Sovereign must not feel like a larger daily quest.

---

## Reward inflation watch

The live file already emits many events:

```text
+ Workout XP
+ Quest XP
+ Achievement XP
+ Level Up
+ Achievement Unlock
+ Promotion Available
+ Rank Promotion
+ Streak
```

Do **not** add celebration, sound, or animation to every event. If everything is a ceremony, nothing is.

Locked hierarchy for later UX (do not implement a new feedback system in 6.5):

| Weight | Events |
| --- | --- |
| LOW | Workout XP, quest progress |
| MEDIUM | Quest complete, level up, achievement progress |
| HIGH | Achievement unlock, streak milestone |
| VERY HIGH | Rank promotion |

Sovereign is not a bigger push-up quest. It is a different class of recognition.

---

## Explicit non-goals

Do not start these until playtest notes exist and the loop has been lived:

- AI coach, explanations, or generated programs
- Builds (POWER / SPEED / ENDURANCE / BALANCED)
- Attribute effects on XP, quests, or directives
- Dungeons, social, wearables, camera, payments
- Adaptive training / “what should I train today?” beyond the current fixed directive
- Economy redesign (XP formulas, quest rewards, achievement XP, rank thresholds)

Attributes (STR / END / AGI / VIT / DIS) may stay visible and unused. Observe behavior **without** builds steering the economy.

---

## After playtest (not now)

The next **major** system, if the loop holds, is **Adaptive Training**: deterministic, not AI.

It should eventually answer “what should I train today?” from recent workouts, exercise history, volume, performance, recovery spacing, attributes, completed quests, current rank, and progression — connecting workout, quest, attributes, and progression.

Build that only after this playtest, and only if the current fixed loop already has behavioral gravity.
