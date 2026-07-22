# Camera Scanner Research Notes

## Goal

Every Solo Health quest must be completed in front of a **fully functional camera scanner** — no manual “I did 10 push-ups” logging.

## Approach evaluated

| Option | Pros | Cons |
|--------|------|------|
| **MediaPipe Pose Landmarker** (`@mediapipe/tasks-vision`) | 33 landmarks, fitness WASM/GPU, fitness-oriented lite model, strong browser docs | Model download ~ few MB first load |
| **TF.js MoveNet** | Very fast 17-point model | Fewer landmarks for sit-ups / drink gestures |
| **Server-side video AI** | Heavier models | Latency, privacy, not needed |

**Choice:** MediaPipe **Pose Landmarker (lite)** in the browser via `getUserMedia` + `detectForVideo`, matching patterns used by open projects such as *rep-sensor*, *Gym Lens Coach*, and PhysTech-style angle counters.

## How reps are counted

1. Request webcam (`facingMode: user`).
2. Run Pose Landmarker each animation frame.
3. Map 33 landmarks → joints.
4. Compute joint angles (shoulder–elbow–wrist, hip–knee–ankle, shoulder–hip–knee).
5. **State machine:** `up → down → up` crosses angle thresholds ⇒ +1 rep (with cooldown to avoid double-counts).
6. Draw skeleton overlay + HUD progress.

### Exercise mapping

| Quest | Signal |
|-------|--------|
| Push-ups | Elbow angle cycle |
| Squats | Knee angle cycle |
| Sit-ups | Torso (shoulder–hip–knee) cycle |
| Run | Alternating knee-lift steps → km estimate |
| Hydration | Wrist near face hold (~1.4s) = 1 glass |
| Focus | Low motion while pose visible → minutes |

## Demo / CI without a person

Headless Chromium’s fake camera has no human body. The scanner supports:

- `?demo=1` — synthetic landmark trajectories that exercise the **same** angle counters and UI
- **SIM FEED** button — enable simulation if the live camera sees no body

Production path remains: real camera → real landmarks → real counts.

## Privacy

All pose inference runs **client-side**. Video frames are not uploaded.
