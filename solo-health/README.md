# Solo Health

Solo Leveling–inspired health trainer. **Every quest is verified by an in-app Camera Scanner** (MediaPipe Pose Landmarker + joint-angle rep counting), and every scan is graded by **Critique AI**, a System-voiced reviewer that scores your form.

## Features

- **Anime-accurate System UI**: the boot screen is the show's "Would you like to be registered as a Player?" prompt, the Status Window is the plain cyan stat sheet (Name / Title / Level / Job / HP / MP / Fatigue Level / STR·AGI·VIT·INT·PER), and every panel uses the same sharp-cornered frame with corner-tick brackets
- **Hunter ranks**: E → D → C → B → A → S → National Level, each unlocking a flavor Job (Fighter → Assassin → Tank → Mage → Necromancer → Shadow Monarch)
- **Daily Quests** (camera-only): push-ups, sit-ups, squats, jog-in-place, hydration sips, focus stillness
- **Penalty Quest** if the day ends incomplete — also scanner-verified, styled as the System's red warning frame
- **Critique AI**: grades every scan (S/A/B/C/D/F) on tracking lock, rep depth, and tempo, with a running history and an end-of-day review that flags your weakest stat
- **System UI** with skeleton overlay, form cues, and live progress HUD

## Critique AI

`js/critique-ai.js` turns raw scanner telemetry (`js/scanner.js` → `js/rep-counter.js`) into a graded review:

- **Tracking lock** — % of frames the pose landmarker held your body in view
- **Depth** — how close each rep got to the target joint angle (elbow/knee/torso)
- **Tempo** — consistency of the interval between reps
- **Hold discipline** — for hydration/focus quests, how steady the pose was held

Each scan produces a 0–100 score, a Hunter-style grade, and short System-voice notes. Clearing a full Daily Quest also triggers a **Daily Critique** that reviews streak and calls out your weakest attribute. See the **CRITIQUE** tab in the app for full history.

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
