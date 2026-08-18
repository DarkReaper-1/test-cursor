# Screen inventory

Evidence source: **public App Store marketing screenshots** (10 iPhone frames from iTunes lookup `id=6743036247`) plus listing copy.

**OBSERVED:** The supplied screen recording was not available. These frames are promotional composites. They show intended fantasy and feature categories, not confirmed production navigation, animation timing, or hidden states.

Runtime screens, transitions, and button behavior inside a paid session remain **UNCONFIRMED**.

---

## Screen 01 — Awakening hero (marketing)

**Source:** Store screenshot 1 (`1.jpg`)

**OBSERVED purpose:** Store hook. Sells the “become a Player” fantasy, not a functional form.

**OBSERVED UI hierarchy:**

1. Headline: “YOUR AWAKENING”
2. Framed anime-style illustration of a person curling a dumbbell
3. Overlay titled “NOTIFICATION”: “You have acquired the qualifications to be a Player. Will you accept?”
4. Badge: “LVL 1” / “Day 1”
5. Subhead: “STARTS HERE”
6. Social proof: “Trusted by 1M Players”, “4.8 avg. rating”

**OBSERVED buttons / inputs:** None interactive in the still. Notification copy implies a yes/accept decision.

**OBSERVED animations:** Lightning/energy textures; glow borders. Motion not confirmed.

**OBSERVED information architecture:** Level and day-count are first-class identity signals.

**INFERRED navigation:** First-run gate that asks the user to “accept” the system before onboarding questions.

**INFERRED hidden state:** Account, subscription, and locale are not shown.

**Possible user actions (INFERRED):** Accept → onboarding; decline path unknown.

**Likely backend (INFERRED):** User + character record created on accept.

**Edge cases (INFERRED):** Reinstall, restore purchase, already-subscribed user seeing this again.

**Helix PROPOSED analogue:** Operator activation, original copy and art. No “Player / Awakening” Solo Leveling phrasing.

---

## Screen 02 — Daily quest / training arc (marketing)

**Source:** Store screenshot 2 (`2.jpg`)

**OBSERVED purpose:** Present a time-boxed daily bodyweight quest and a start action.

**OBSERVED UI hierarchy:**

1. Headline: “FINISH DAILY QUEST”
2. Identity: “LVL 67” / “Day 50”
3. Stacked “NOTIFICATION” chips: “Leveled up!”
4. Background character doing a push-up
5. Panel “QUEST INFO” / “Main Character Training Arc”
6. Goal list with counters:
   - PUSH-UP [0/100]
   - SIT-UP [0/100]
   - SQUAT [0/100]
   - DUMBBELL-CURL [0/36]
7. Warning: failure within allotted time incurs a penalty
8. Countdown: `06:52:29`
9. Primary CTA: “Start Quest”
10. Two preview tiles (exercise thumbnail; “+”)
11. Bottom tabs: dumbbell, scroll, chart, profile (scroll highlighted)

**OBSERVED buttons:** Start Quest; tab bar; “+” tile.

**OBSERVED inputs:** None visible (counters at 0).

**OBSERVED visible state:** Incomplete daily quest, ~7h remaining, high level / long streak-or-day count.

**INFERRED hidden state:** Penalty amount, timezone for reset, whether extras beyond the four movements are required, subscription lock.

**INFERRED user actions:** Start → workout player; tap exercise → demo; “+” → add/swap exercise.

**INFERRED resulting state:** Completing all counters → XP / level notifications; missing timer → penalty.

**Likely backend (INFERRED):** Daily quest instance, expiry timestamp, per-exercise progress, XP ledger, penalty rule.

**Likely database (INFERRED):** `quests`, `quest_items`, `quest_progress`, `xp_events`, `penalties`.

**Edge cases (INFERRED):** Timezone travel; backgrounding during countdown; partial completion; injury; rest day vs quest day.

**Helix PROPOSED analogue:** Today’s Directive with recovery path instead of a fear-based penalty warning.

---

## Screen 03 — Training catalog (marketing)

**Source:** Store screenshot 3 (`3.jpg`)

**OBSERVED purpose:** Browse named training programs as horizontal cards.

**OBSERVED UI hierarchy:**

1. Title: “TRAINING”
2. Large cards:
   - “Adaptive Fighter Physique” — 3-day mix (weighted dips, pull-ups, pistols…)
   - “Black Swords[man] Strength” — barbell full-body (deadlifts, squats…)
3. Smaller cards:
   - “Basic Quest” — 100 push-ups, sit-ups, squats, 10k…
   - “Shadow Compound…” — 3-day barbell split
4. Bottom tabs: dumbbell (active), scroll, chart, profile

**OBSERVED buttons:** Implicit card tap; tabs.

**OBSERVED information architecture:** Program discovery is a marketplace of themed splits, not a single “today” card.

**INFERRED:** Programs are templates with anime/hero naming. “Basic Quest” is a One Punch Man–style challenge workout (public reviews also mention this category).

**INFERRED backend:** Program catalog, equipment tags, split length, maybe popularity.

**Edge cases (INFERRED):** Empty catalog for unsubscribed users; equipment mismatch; selecting a program while a daily quest is active.

**Helix PROPOSED analogue:** Adaptive plan generated from history, not a shelf of copyright-adjacent hero programs. Original names only.

---

## Screen 04 — Share workout card (marketing)

**Source:** Store screenshot 4 (`10.jpg` in Apple’s filename order)

**OBSERVED purpose:** Export a completed daily quest as a shareable card.

**OBSERVED UI hierarchy:**

1. Headline: “SHARE YOUR WORKOUTS”
2. Background tiles: “+60 XP”, “2 STREAK”, “E RANK”, “CLASS: FI…”
3. Share card: “[Daily Quest] - Main Character Training Arc”
4. Completed goals: PUSH-UP/SIT-UP/SQUAT [100/100]
5. XP bar: 45/100
6. Fatigue: 80
7. Actions: ADD, STORY (Instagram), SAVE, SHARE (primary)

**OBSERVED buttons:** ADD, STORY, SAVE, SHARE.

**OBSERVED visible state:** Completed quest plus identity chips (XP, streak, rank, class).

**INFERRED:** Native share sheet + Instagram Stories deep link; local image export.

**INFERRED backend:** Share is client-rendered from already-earned stats; may not need a share API.

**Privacy edge cases (INFERRED):** ID, weight, or other PII leaking onto share cards.

**Helix PROPOSED analogue:** Optional share with privacy defaults off for health numbers; no competitor watermark/art.

---

## Screen 05 — Per-exercise rank (marketing)

**Source:** Store screenshot 5 (`5.jpg`)

**OBSERVED purpose:** Show a letter rank for one lift and invite sharing.

**OBSERVED UI hierarchy:**

1. Title: “RANK” with close (X)
2. Hexagon “S”
3. Exercise: “HAMMER CURL”
4. Performance: “40 lbs x 8 reps”
5. Rank ladder hexagons: E, D, C, B, A, S, SS, SSS (S selected)
6. Watermark: “ARISE”
7. Instagram circle + “Share Rank”

**OBSERVED inputs:** None. This is a result modal.

**INFERRED:** Rank is a lookup from load × reps (or similar). SS/SSS exist as aspirational tiers.

**INFERRED backend:** Rank tables per exercise, unit system (lb/kg), maybe bodyweight scaling (unconfirmed).

**Edge cases (INFERRED):** Bodyweight moves; machines vs free weights; unit conversion; cheating via typed weight.

**Helix PROPOSED analogue:** Strength indices that are explainable and not hunter-rank clones. Optional “personal best bands” instead of E→SSS as brand identity.

---

## Screen 06 — Achievements (marketing)

**Source:** Store screenshot 6 (`6.jpg`)

**OBSERVED purpose:** Collectible achievement grid.

**OBSERVED UI hierarchy:**

1. Hero art (pull-up) + energy aura
2. Progress bar: Complete 100%
3. Copy: “EARN YOUR REWARDS”
4. “You have unlocked 6/32 achievements”
5. Hex grid: Total Volume, Total Workout, Beta Player, plus locked “Unknown / ?”

**OBSERVED visible state:** 6 of 32 unlocked; some titles hidden until earned.

**INFERRED backend:** Achievement definitions, unlock events, rarity.

**Helix PROPOSED analogue:** Achievements exist, but copy and iconography are original. Hidden quests can remain secret without “Unknown” clutter on the home surface.

---

## Screen 07 — Exercise progress / stats (marketing)

**Source:** Store screenshot 7 (`7.jpg`)

**OBSERVED purpose:** History for one exercise (bench press) plus rank.

**OBSERVED UI hierarchy:**

1. “BENCH PRESS” / “3 logs recorded”
2. Grid icon (top right)
3. Line chart of heaviest weight: 205 → 220 → 225 across Aug 5 / 12 / 19
4. Tooltip: “205.0 lbs”, “Heaviest weight used”, timestamp
5. Rank hex grid E–SSS, B highlighted
6. Tabs: chart active

**OBSERVED inputs:** Chart point selection (inferred from tooltip).

**INFERRED:** Logs are dated sessions; “heaviest weight” is a derived metric; 3 logs in ~2 weeks implies weekly-ish tracking.

**Likely database (INFERRED):** `workout_sets` with exercise_id, load, reps, timestamp.

**Edge cases (INFERRED):** Sparse data; deleted logs; unit change; same-day multiple sessions.

**Helix PROPOSED analogue:** Progress charts exist, but home should not lead with charts. History is a drill-down.

---

## Screen 08 — Nutrition plan (marketing)

**Source:** Store screenshot 8 (`8.jpg`)

**OBSERVED purpose:** Show calorie/macro targets and a weight goal chart.

**OBSERVED UI hierarchy:**

1. Modal title “NUTRITION PLAN” + close
2. Calorie goal: 3,148 kcal/day
3. Macros: Protein 150g, Carbs 440g, Fat 87g
4. Target chart: 150 lbs → 170 lbs
5. Tabs: chart highlighted

**OBSERVED inputs:** None on this still (targets look computed).

**INFERRED:** Targets come from onboarding (age, height, weight, goal, activity). Meal logging UI is not shown here.

**INFERRED backend:** Nutrition profile; maybe TDEE formula; weight log.

**Medical note (OBSERVED):** Store listing disclaims medical advice.

**Edge cases (INFERRED):** Eating disorders; aggressive surplus/deficit; pregnancy; athlete vs sedentary mismatch.

**Helix PROPOSED analogue:** Wellness-framed nutrition, editable assumptions, no medical certainty. Logging and suggestions in later phases.

---

## Screen 09 — Character / profile (marketing)

**Source:** Store screenshot 9 (`4.jpg`)

**OBSERVED purpose:** Character identity plus biometrics.

**OBSERVED UI hierarchy:**

1. Avatar card labeled “PLAYER” / “FIGHTER”
2. RANK S, LEVEL 99, STREAK 50
3. Headline: “RISE THROUGH THE RANKS”
4. Four rings: Rank S, Level 99, Workouts 70, Streak 50
5. Two-column facts: Class Fighter, Title Player, Age 21, ID (masked + copy), Height 5'8", Weight 150 lbs, Target 170 lbs

**OBSERVED buttons:** Copy ID.

**OBSERVED information architecture:** RPG identity and body metrics share one profile surface.

**INFERRED hidden state:** Email, subscription, HealthKit, privacy, notification settings not shown.

**Privacy (OBSERVED on this mock):** Height/weight/age shown on character screen; ID is masked.

**Helix PROPOSED analogue:** Character surface emphasizes attributes and today’s directive. Biometrics live behind privacy settings. Original titles/classes.

---

## Screen 10 — Level-up identity (marketing)

**Source:** Store screenshot 10 (`9.jpg`)

**OBSERVED purpose:** Brand/endcard: character + LVL 99 / Day 90 + “NEVER STOP LEVELING UP”.

**OBSERVED UI:** Logo lockup, character in energy aura, repeated “Leveled up!” chips, “NOTIFICATION” control.

**INFERRED:** Level-up is a frequent, highly celebrated event in the fantasy, even if actual cadence is slower.

**Helix PROPOSED analogue:** Celebrate level-up, but do not spam “Leveled up!” as wallpaper. Motion is reserved for meaningful rank/level changes.

---

## Screens claimed in copy but not shown in these 10 frames

These are **OBSERVED as product claims**, not as UI:

| Claimed surface | Source | Inventory status |
| --- | --- | --- |
| Lifestyle question onboarding | App Store “HOW TO USE” | Not shown |
| Paywall / Arise Pro | Listing + IAP list | Not shown |
| Login | v1.4.8 notes “supercharged our login” | Not shown |
| Workout player / rest timer | Play reviews | Not shown |
| Photo/gallery workout log | Play changelog | Not shown |
| Exercise swap | Public reviews (category) | Not shown |
| Apple Health | Public support/FAQ category | Not shown |
| Settings / cancel / restore | Required for IAP apps | Not shown |
| Discord deep link | Listing | Not shown |

**INFERRED tab map from screens 02, 03, 07, 08, 09:**

| Tab | Icon | Likely job |
| --- | --- | --- |
| 1 | Dumbbell | Training catalog / workout |
| 2 | Scroll | Daily quest |
| 3 | Chart | Stats, progress, nutrition |
| 4 | Person | Character / profile |

Home-of-the-day is **not clearly a fifth tab**. Daily quest may live on tab 2.

---

## Helix screen list (PROPOSED, not a clone)

Phase 1–3 product surfaces (original):

1. Operator activation
2. Goal and constraint interview
3. Character reveal
4. Today (single priority)
5. Session player
6. Completion + XP
7. Recovery (when behind)
8. Character
9. History (secondary)
10. Coach (contextual, not a junk drawer chatbot)
11. Settings / privacy / health permissions
