# PressWell — System Architecture

Matches the intended product design: **camera PPG for heart rate**, **manual cuff entry for blood pressure**.

## High-level flow

```
                User
                  │
                  ▼
        iPhone / Android / Watch*
                  │
      ┌───────────┴───────────┐
      │                       │
 Camera Sensor            Manual Input
 (Heart Rate · PPG)     (Blood Pressure)
      │                       │
      └───────────┬───────────┘
                  ▼
         Signal Processing Layer
                  │
                  ▼
         Health Data Database
                  │
      ┌───────────┼───────────┐
      ▼           ▼           ▼
 Analytics    Charts      Trends
      │           │           │
      └───────────┼───────────┘
                  ▼
      Reports / Export / Sharing
```

\* Apple Watch / HealthKit hooks are prepared for native Capacitor builds.

## Main software components

| Module | Role | Code |
|---|---|---|
| User Interface | Dashboard, HR screen, BP log, charts, history, settings | `index.html`, `js/app.js`, `css/` |
| Sensor Layer | Camera + torch PPG capture | `js/camera.js` |
| Signal Processing | Noise removal → peaks → BPM (+ simple HRV) | `js/pulse-engine.js` |
| Health Database | Local readings store | `js/database.js` |
| Analytics Engine | Averages, highs/lows, weekly/monthly, insights | `js/analytics.js` |
| Visualization | Line charts, trend canvases | `js/charts.js` |
| Reminder System | Local scheduled check-in prompts | `js/reminders.js` |
| Export Module | CSV + printable PDF-style report | `js/export.js` |
| AI Insight Module | Lifestyle pattern notes (not diagnoses) | `js/analytics.js` (`insights`) |

## Internal data flow (heart rate)

```
Finger
  │
Camera (+ torch when available)
  │
Raw video frames
  │
Red-channel sampling
  │
Digital filtering / moving average
  │
Peak detection
  │
Beat-to-beat timing → BPM (+ RMSSD-style HRV)
  │
Database
  │
Graphs / Reports
```

## Important limitation

**This app does not measure blood pressure with the phone.**  
Blood pressure must be entered from an external cuff monitor.  
The camera estimates **heart rate** via photoplethysmography (PPG) for wellness tracking only — not clinical diagnosis.

## Native APIs (store builds)

| Capability | Web / PWA | iOS (Capacitor) | Android (Capacitor) |
|---|---|---|---|
| Camera PPG | `getUserMedia` + torch constraint | AVFoundation via WebView / plugin | Camera2 via WebView |
| Local DB | `localStorage` / Indexed-ready schema | Core Data / SQLite plugin (optional) | Room / SQLite plugin (optional) |
| Reminders | Notification API | UserNotifications | AlarmManager / FCM local |
| Health sync | — | HealthKit plugin | Health Connect plugin |
| Export | CSV download + print/PDF | Share sheet | Share intent |

## Record shape

```json
{
  "id": "…",
  "date": "2026-07-22T09:15:00.000Z",
  "type": "combined",
  "heartRate": 72,
  "hrvMs": 42,
  "systolic": 118,
  "diastolic": 76,
  "stress": "Low",
  "source": { "hr": "camera", "bp": "cuff" },
  "note": "Morning"
}
```
