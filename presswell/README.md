# PressWell

Blood pressure companion for **Google Play** and **iPhone**.

- **Camera PPG** → heart rate (and simple HRV / stress cue)
- **Manual cuff entry** → blood pressure
- Analytics, charts, reminders, CSV/PDF export
- No ads, no account, senior-friendly UI

> The phone does **not** measure blood pressure. Camera estimates pulse only.

## Architecture

See [docs/architecture.md](docs/architecture.md) for the full system diagram and module map.

```
Camera (PPG) ──┐
               ├──► Signal Processing ──► Database ──► Charts / Analytics / Export
Cuff (manual) ─┘
```

## Modules

| Component | Path |
|---|---|
| UI | `index.html`, `css/style.css`, `js/app.js` |
| Camera sensor | `js/camera.js` |
| Pulse engine | `js/pulse-engine.js` |
| Health DB | `js/database.js` |
| Analytics + insights | `js/analytics.js` |
| Charts | `js/charts.js` |
| Reminders | `js/reminders.js` |
| Export CSV/PDF | `js/export.js` |

## Run

```bash
cd presswell
npm install
npm start
# http://127.0.0.1:8787/presswell/
# Demo tour: http://127.0.0.1:8787/presswell/?demo=1
```

## Demo video

```bash
npm start    # terminal 1
npm run demo # terminal 2 → /opt/cursor/artifacts/presswell-demo.mp4
```

## Store packaging

```bash
npx cap add android
npx cap add ios
npx cap sync
```

Native hooks prepared for HealthKit / Health Connect and UserNotifications in Capacitor builds.
