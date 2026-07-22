# Solo Health

A Solo Leveling–inspired health trainer. Complete **Daily Quests**, raise your **Hunter Rank** (E → National Level), and survive the **Penalty Quest** if you fail.

## Features

- **Hunter ranks**: E, D, C, B, A, S, National Level — based on total XP
- **Status window**: Level, XP bar, streak, STR / AGI / VIT / INT / SEN
- **Daily Quest**: Push-ups, sit-ups, squats, run, hydration, focus training
- **Penalty Quest**: Issued when a day ends with incomplete objectives — clear it or take stat/XP penalties
- **System log**: Quest clears, rank-ups, and warnings

## Run locally

```bash
cd solo-health
python3 -m http.server 8765 --directory ..
```

Open http://127.0.0.1:8765/solo-health/

## Demo video

```bash
cd solo-health
npm install
npx playwright install chromium
npm start &   # serves repo root on :8765
npm run demo
```

Output: `/opt/cursor/artifacts/solo-health-demo.mp4`

## Controls

| Action | Effect |
|--------|--------|
| **LOG / LOG +10** | Add progress toward a daily objective |
| **NEXT DAY** | Advance the day (incomplete → Penalty Quest) |
| **COMPLETE TRIAL** | Clear an active Penalty Quest |
| **SURRENDER** | Fail the penalty (stat loss + XP loss) |
