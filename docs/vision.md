# Phase 7 — SYSTEM VISION

Camera is a **recorder**, not a progression engine. Verified sets still go to `POST /api/v1/workouts`. XP, quests, achievements, streak, level, and rank stay server-owned.

Footage is not user data. Process locally, keep movement numbers, discard the video unless the operator later opts in to save a recording (not in V1).

Manual logging stays. Camera will fail in crowded gyms, bad light, machines, low battery, and whenever someone does not want to be on camera.

## Stages

### V1 — Guided camera logging (this release)

User selects the exercise. SYSTEM watches that movement, counts reps, closes sets, and submits the same workout contract as manual log.

```text
Select exercise → Camera → Movement detection → Rep counting → Set completion
                 → POST /api/v1/workouts
```

Supported now: squat, push-up, hinge, hip bridge, split squat. Everything else uses manual log.

### V2 — Exercise recognition

No selection. SYSTEM labels the movement (`Detected: SQUAT`). Same workout POST. Not built.

### V3 — Workout session recognition

SYSTEM observes work and rest across movements and assembles the session. Not built.

### V4 — Form analysis

ROM, tempo, stability, symmetry, technique as signals — still not XP. Not built.

### V5 — Adaptive training

Exercise, reps, sets, duration, performance, tempo, volume, and history feed a **deterministic** adaptive system. Not built. Do not add AI coaching here.

## Privacy

```text
Camera → local / temporary processing → movement data → workout record → video discarded
```

No upload of frames, blobs, or recordings in V1.
