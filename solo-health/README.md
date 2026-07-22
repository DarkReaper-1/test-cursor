# Solo Health

Solo Leveling–inspired health trainer. **Every quest is verified by an in-app Camera Scanner** (MediaPipe Pose Landmarker + joint-angle rep counting).

## Features

- **Hunter ranks**: E → D → C → B → A → S → National Level
- **Status window**: level, XP, streak, STR / AGI / VIT / INT / SEN
- **Daily Quests** (camera-only): push-ups, sit-ups, squats, jog-in-place, hydration sips, focus stillness
- **Penalty Quest** if the day ends incomplete — also scanner-verified
- **System UI** with skeleton overlay, form cues, and live progress HUD

## Camera Scanner

Research notes: [docs/camera-scanner-research.md](docs/camera-scanner-research.md)

- Live webcam via `getUserMedia`
- MediaPipe Pose Landmarker (lite) runs fully in-browser
- Reps counted with up/down joint-angle state machines
- `?demo=1` enables a synthetic pose feed for demos/CI (same counters)

## Run locally

```bash
cd solo-health
python3 -m http.server 8765 --directory ..
```

Open http://127.0.0.1:8765/solo-health/  
Allow camera access, tap **SCAN** on a quest, perform the movement in frame.

## Demo video

```bash
cd solo-health
npm install
npx playwright install chromium
python3 -m http.server 8765 --directory .. &
npm run demo
```

Output: `/opt/cursor/artifacts/solo-health-scanner-demo.mp4`
