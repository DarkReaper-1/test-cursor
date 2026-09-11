# Phase 7 — SYSTEM VISION

Camera is a **recorder**, not a progression engine. Verified sets still go to `POST /api/v1/workouts` with `source: "CAMERA"`. XP, quests, achievements, streak, level, and rank stay server-owned.

Footage is not user data. Process locally, keep movement numbers, discard the video.

**SYSTEM only files work it has seen.** There is no manual log. Every exercise in the catalog is counted on-device.

## Stages

### V1 — Guided camera logging (this release)

User selects the exercise. SYSTEM watches that movement, counts reps or hold time, closes sets, and submits the workout contract.

```text
Select exercise → Camera → Movement detection → Rep counting → Set completion
                 → POST /api/v1/workouts { source: "CAMERA" }
```

Catalog: squat, push-up, hinge, hip bridge, split squat, plank, row, walk.

### V2 — Exercise recognition

No selection. SYSTEM labels the movement (`Detected: SQUAT`). Not built.

### V3 — Workout session recognition

SYSTEM observes work and rest across movements and assembles the session. Not built.

### V4 — Form analysis

ROM, tempo, stability, symmetry, technique as signals — still not XP. Not built.

### V5 — Adaptive training

Exercise, reps, sets, duration, performance, tempo, volume, and history feed a **deterministic** adaptive system. Not built.

## Privacy

```text
Camera → local / temporary processing → movement data → workout record → video discarded
```

No upload of frames, blobs, or recordings in V1.
