# User flows

Flows below mix **OBSERVED** public copy with **INFERRED** runtime paths. No paid session was operated in this environment.

---

## Flow A — Acquire and awaken

**OBSERVED (store):**

1. Install free app
2. Answer lifestyle questions
3. Receive custom plan (subscription required)
4. Complete daily quests and earn rewards

**INFERRED:**

```
Install
  → Splash / accept-system prompt
  → Auth (Apple / Google / email — method unconfirmed)
  → Lifestyle questionnaire
  → Character/class assignment
  → Paywall (Arise Pro)
  → Plan generated
  → First daily quest
```

**OBSERVED friction (public reviews / aggregators):**

- Core loop is behind a subscription
- Some users hit the paywall only after setup
- Referral trial (invite 3 friends for 7 days) reported in public reviews; not independently verified here
- Login loops and gray screens reported around v1.4.4

**Helix PROPOSED:**

```
Install
  → Original activation (no competitor copy)
  → Auth
  → Short goal + constraint interview
  → Character created server-side
  → First Today Directive is free and completable
  → Soft upgrade after the loop is felt, not before
```

---

## Flow B — Daily quest completion

**OBSERVED (screenshot 2 + listing):**

```
Open app
  → See daily quest + timer + penalty warning
  → Start Quest
  → (unconfirmed) perform / log exercises
  → Counters fill
  → Rewards / level-up notifications
```

**INFERRED logging methods (from Play changelog + reviews):**

- Manual set/rep/weight entry (weight picker, not free-typed, per a Play review)
- Photo or gallery attachment as workout proof
- Extra sets/exercises can be added beyond the generated session

**INFERRED failure:**

```
Timer expires or day missed
  → Penalty (XP loss mentioned in public reviews)
  → Streak risk
```

**Helix PROPOSED:**

```
Open
  → System states today’s one priority and why
  → Start session
  → Log (manual, NL, or later camera/health)
  → Confirm interpretation
  → Server validates
  → XP / attributes / momentum
  → Tomorrow’s hypothesis shown
```

Missed day:

```
Momentum dips
  → Recovery Directive offered
  → No “YOU FAILED” terminal state
```

---

## Flow C — Program browsing vs today’s work

**OBSERVED:** Training tab is a card catalog of named programs; quest tab is a single daily sheet.

**INFERRED conflict:** Users can select a multi-day named program *and* have a daily “100 push-up” quest. How those compose is unconfirmed. Public reviews mention scheduled days vs forced daily work and having to manually mark rest days.

**Helix PROPOSED:** One adaptive plan. Catalog of “hero programs” is not the home. Optional challenge modules are explicitly opted into and cannot silently override recovery.

---

## Flow D — Progress and rank

**OBSERVED:**

```
Stats tab
  → Exercise history chart
  → Letter rank for that lift
  → Share rank
```

**INFERRED:** Rank is performance-based per exercise, while profile also shows a global rank (S in screenshot 9 vs E on screenshot 4). Global vs per-lift rank relationship is unconfirmed.

**Helix PROPOSED:** Character rank is consistency + multi-domain progress, not a copy of hunter letters. Lift PRs are “capacity marks,” separate from identity rank.

---

## Flow E — Nutrition

**OBSERVED:** Nutrition plan modal with kcal + macros + weight trajectory.

**INFERRED:** Generated at onboarding; meal logging not evidenced in the 10 screenshots. v1.4.8 notes say routines and nutrition plans “speak your language.”

**Helix PROPOSED:** Nutrition is optional in MVP. When present: targets + NL log + confirmation. Never medical treatment.

---

## Flow F — Social / share

**OBSERVED:** Share card, Instagram Story button, Discord mentioned in listing.

**INFERRED:** Community lives off-app (Discord), not a first-party guild system.

**Helix PROPOSED:** First-party privacy-first friends later. Share is opt-in. Guilds are Phase 9.

---

## Flow G — Subscription and account

**OBSERVED:**

- Subscription required for plans/quests/features (listing)
- Multiple Arise Pro price points
- Play data-safety: deletion request supported
- Reviews: random sign-out, lost history after rest days, restore/support pain

**Helix PROPOSED:**

```
Server-authoritative entitlements (RevenueCat later)
  → Restore purchase
  → Export data
  → Delete account
  → Disconnect health
  → Delete AI memory
```

Core loop remains usable without paywall during development and at MVP.

---

## Flow H — Health integration (claimed, UI not shown)

**INFERRED from public category chatter:** Apple Health for weight, exercise, steps.

**UNCONFIRMED:** Write vs read, which HealthKit types, Android Health Connect parity.

**Helix PROPOSED:** `HealthProvider` abstraction; least-privilege permissions; never couple the RPG engine to HealthKit.

---

## Happy-path Helix (PROPOSED MVP)

```
New user
  → Install
  → Onboarding (goals, equipment, time, constraints)
  → Character
  → Today’s quest
  → Workout
  → Completion + user confirmation
  → Server XP + level
  → Coach explains “why this, why next”
  → Next quest
  → Return tomorrow
```

This is the only flow that must feel excellent before other systems exist.
