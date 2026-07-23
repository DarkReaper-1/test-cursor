# PressWell

Simple, elegant blood-pressure companion for **Google Play** and **iPhone**.

Finger wellness checks + real cuff logging. No ads. No account. Large type for every age.

## Research-backed design

Before building, we reviewed why people like and dislike fingerprint BP apps (Harvard Health, ASA rulings, App Store / Play reviews, MedM, JAMA/PMC). Summary: [docs/research-findings.md](docs/research-findings.md).

**We deliberately avoid the common traps:** misleading “medical fingerprint BP” claims, ad spam, paywalls, tiny text, broken camera flows, and missing cuff logging.

> **Important:** No phone can medically measure blood pressure with a fingerprint today. PressWell’s finger check is a **wellness estimate**. Use a validated cuff for care decisions.

## Features

- Honest onboarding gate (must accept disclaimer)
- Finger-pad wellness scan with live pulse wave
- Large-stepper cuff logging (recommended path)
- AHA-style categories + crisis alert
- History + trend chart + print/export
- Extra-large text, high contrast, reduce motion
- Local-only storage (privacy)
- Offline-capable PWA + Capacitor wrappers for stores
- Lightweight: plain HTML/CSS/JS, no heavy UI framework

## Run locally

```bash
cd presswell
npm install
npm start
# open http://127.0.0.1:8787/presswell/
```

Demo mode (auto tour): `http://127.0.0.1:8787/presswell/?demo=1`

## Record demo video

```bash
cd presswell
npm install
npm start   # in one terminal
npm run demo
# writes /opt/cursor/artifacts/presswell-demo.mp4
```

## Ship to Google Play & iPhone

PressWell is a Progressive Web App that installs standalone, and can be wrapped with Capacitor:

```bash
cd presswell
npm install
npx cap add android
npx cap add ios
npx cap sync
npx cap open android   # Android Studio → AAB for Play Console
npx cap open ios       # Xcode → Archive for App Store Connect
```

Store listing must state clearly that finger checks are wellness estimates and that the app is not a medical device.

## Project layout

```
presswell/
  index.html          # App shell
  css/style.css       # Senior-friendly visual system
  js/                 # BP helpers, storage, scan, app
  docs/research-findings.md
  capacitor.config.json
  manifest.webmanifest
  sw.js               # Offline cache
  demo/record-demo.js
```
