# test-cursor

This repository contains independent projects:

1. **[Halal Detector](#halal-detector)** — Cross-platform AI-powered Halal / Doubtful / Haram scanner (Expo + FastAPI)
2. **[VitalTrack AI](#vitaltrack-ai)** — Trust-first iOS cardiovascular tracking (SwiftUI)
3. **[Solo Health](#solo-health)** — Solo Leveling–inspired health app (ranks + penalty quests)
4. **[Square App Reverse Engineering](#square-app-reverse-engineering)** — Security research toolkit for analyzing Square Android apps
5. **[Spider-Man Web Swing](#spider-man-web-swing)** — Browser-based web-swinging game
6. **[Parkour Race](#parkour-race)** — 3D rooftop freerun racer (browser / Three.js)
7. **[Health & Longevity Book](#health--longevity-book)** — A three-part book on living longer, preventing chronic disease, and maximizing energy

---

## Halal Detector

Accessible mobile app for adults 40+ that analyzes barcodes, ingredient lists, medicines, cosmetics, and restaurant menus. Includes offline E-number database, scholar modes, voice assistant, and AI chat.

```bash
cd halal-detector/backend
python3 -m pip install -r requirements.txt
PYTHONPATH=. python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000

cd ../mobile
npm install
npx expo start
```

Details: [halal-detector/README.md](halal-detector/README.md)

> Informational only — not a religious ruling. Unknown ingredient origins are labeled Doubtful.

---

## VitalTrack AI

Production-oriented **SwiftUI** iOS app for heart rate (camera PPG / Watch / HealthKit) and **honest blood pressure logging** from FDA-cleared external monitors only — never camera-estimated BP.

```bash
cd VitalTrackAI
./Scripts/generate-xcodeproj.sh   # requires XcodeGen
open VitalTrackAI.xcodeproj       # requires Xcode
# library tests:
swift test
```

Docs (PRD, IA, architecture, legal, marketing): [VitalTrackAI/docs/README.md](VitalTrackAI/docs/README.md)  
App overview: [VitalTrackAI/README.md](VitalTrackAI/README.md)

> This app tracks blood pressure readings that you obtain from an FDA-cleared blood pressure monitor. Informational only — not medical advice.

---

## Solo Health

Hunter-ranked workout trainer with Daily Quests, Penalty Quests, and a **fully functional Camera Scanner** (MediaPipe pose tracking) inspired by Solo Leveling.

```bash
cd solo-health
python3 -m http.server 8765 --directory ..
# open http://127.0.0.1:8765/solo-health/
```

See [solo-health/README.md](solo-health/README.md) and [solo-health/docs/camera-scanner-research.md](solo-health/docs/camera-scanner-research.md).

---

## Square App Reverse Engineering

Educational security research toolkit for statically and dynamically analyzing Square Android applications (Point of Sale, Team, Dashboard).

> **Disclaimer:** Reverse engineering is for authorized security research, education, and interoperability analysis only. Only analyze apps you have legal permission to test. Do not use findings to commit fraud, bypass payment security, or steal cardholder data.

### Quick Start

```bash
# 1. Install toolchain (jadx, apktool, frida, adb)
chmod +x scripts/*.sh
./scripts/setup.sh
source .env.tools

# 2. Obtain the Square POS APK
./scripts/download_apk.sh                    # from USB device
./scripts/download_apk.sh --from /path/to.apk  # manual copy

# 3. Run full analysis pipeline
./scripts/analyze.sh apks/com.squareup.apk

# 4. Review results
cat output/com.squareup/ANALYSIS.md
cat output/com.squareup/scan-report.txt
```

### Project Structure

```
├── apks/                  # Place APK files here (gitignored)
├── config/targets.yaml    # Package names, intent API, scan patterns
├── docs/                  # Methodology and reference documentation
├── frida/                 # Dynamic analysis Frida scripts
├── output/                # Decompiled artifacts (gitignored)
└── scripts/               # Automation pipeline
    ├── setup.sh           # Install RE toolchain
    ├── download_apk.sh    # Pull APK from device
    ├── decompile.sh       # apktool + jadx decompilation
    ├── scan_secrets.sh    # Static security scan
    └── analyze.sh         # End-to-end pipeline
```

### Target Applications

| App | Package | Purpose |
|-----|---------|---------|
| Square Point of Sale | `com.squareup` | Primary POS / Register app |
| Square Team | `com.squareup.team` | Team management |
| Square Dashboard | `com.squareup.dashboard` | Business analytics |

### Analysis Workflow

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌──────────────┐
│  Obtain APK │ -> │  Decompile   │ -> │ Static Scan │ -> │   Dynamic    │
│  (adb/copy) │    │ jadx+apktool │    │ secrets/API │    │ Frida + mitm │
└─────────────┘    └──────────────┘    └─────────────┘    └──────────────┘
```

### Dynamic Analysis

```bash
# SSL pinning bypass + traffic capture
frida -U -f com.squareup \
  -l frida/ssl_pinning_bypass.js \
  -l frida/root_detection_bypass.js \
  --no-pause

# Trace POS intent API handling
frida -U com.squareup -l frida/trace_pos_intents.js
```

See [docs/methodology.md](docs/methodology.md) and [docs/intent-api.md](docs/intent-api.md) for full documentation.

---

## Spider-Man Web Swing

A basic browser-based Spider-Man web-swinging game built with HTML5 Canvas.

### Play

Open `index.html` in a browser, or run a local server:

```bash
python3 -m http.server 8080
```

Then visit http://localhost:8080

### Controls

| Input | Action |
|-------|--------|
| **A / D** or **← / →** | Move left / right |
| **Space** | Jump (also wall-jump when on a building side) |
| **Click** | Shoot web at a building and start swinging |
| **Release click** | Let go of the web |

### Features

- Procedural city skyline with lit windows
- Web-swing physics (pendulum-style rope constraint)
- Wall climbing and rooftop landing
- Side-scrolling camera that follows Spider-Man
- Auto-respawn if you fall off the map

Swing from building to building and see how far you can go!

---

## Parkour Race

3D rooftop parkour racer inspired by MADBOX’s *Parkour Race*. Auto-run, steer left/right, automatic vaults/flips, speed pads, and a crowd of AI racers across New York, Paris, Tokyo, and Dubai. Original procedural assets.

```bash
python3 -m http.server 8080 --directory parkour-race
# open http://localhost:8080
```

Details: [parkour-race/README.md](parkour-race/README.md)

---

## Health & Longevity Book

A three-part educational book on living longer, preventing chronic disease, and maximizing physical and mental energy:

1. **The Longevity Blueprint** — How to live longer, avoid chronic disease, and stay energetic into old age.
2. **Reverse Your Health** — A practical system for preventing obesity, diabetes, high blood pressure, and heart disease.
3. **The Energy Code** — Sleep, nutrition, exercise, and stress management to maximize physical and mental energy.

Read it here: [books/health-and-longevity/](books/health-and-longevity/README.md)

> Educational content only — not medical advice. Consult a healthcare provider before making significant changes to diet, exercise, or medication.
