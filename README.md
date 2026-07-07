# test-cursor

This repository contains two independent projects:

1. **[Square App Reverse Engineering](#square-app-reverse-engineering)** — Security research toolkit for analyzing Square Android apps
2. **[Spider-Man Web Swing](#spider-man-web-swing)** — Browser-based web-swinging game

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
./scripts/download_apk.sh --apkeep          # download from APKPure
./scripts/download_apk.sh                    # from USB device
./scripts/download_apk.sh --from /path/to.apk  # manual copy

# 3. Run full analysis pipeline (--fast recommended for large APKs)
./scripts/analyze.sh apks/com.squareup.apk --fast

# 4. Review results
cat output/com.squareup/ANALYSIS.md
cat output/com.squareup/scan-report.txt

# 5. Run full test suite + generate demo video
./scripts/test.sh
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
    ├── analyze.sh         # End-to-end pipeline
    ├── test.sh            # Verification + demo video
    ├── record_tutorial.sh # Generate step-by-step tutorial video
    ├── record_ui_video.sh # Generate actual app UI walkthrough video
    ├── record_demo.sh     # Record live terminal demo
    └── generate_demo_video.py
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

See [docs/methodology.md](docs/methodology.md), [docs/intent-api.md](docs/intent-api.md), and [docs/test-results.md](docs/test-results.md) for full documentation.

### Tutorial Video

Generate a step-by-step walkthrough video:

```bash
./scripts/record_tutorial.sh
# → /opt/cursor/artifacts/videos/square-re-tutorial.mp4
```

The tutorial covers setup, APK download, analysis, reviewing findings, and Frida dynamic analysis.

### Actual App UI Video

See what the real Square POS app looks like (official Play Store screenshots):

```bash
./scripts/record_ui_video.sh
# → /opt/cursor/artifacts/videos/square-app-ui.mp4
```

Shows 14 screens: register, checkout, payments, inventory, reports, appointments, and more.

### Verified Test Results

Tested against **Square Point of Sale v7.13.2** (`com.squareup`). See [docs/test-results.md](docs/test-results.md) for full findings including POS intent API, SSL pinning, Play Integrity, and embedded SDK keys.

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
