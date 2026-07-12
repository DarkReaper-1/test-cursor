# test-cursor

This repository contains three independent projects:

1. **[Square App Reverse Engineering](#square-app-reverse-engineering)** — Security research toolkit for analyzing Square Android apps
2. **[Spider-Man Web Swing](#spider-man-web-swing)** — Browser-based web-swinging game
3. **[The Midnight Manor](#the-midnight-manor)** — Browser-based murder mystery detective game

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

## The Midnight Manor

A noir murder mystery set in a Victorian manor. Lord Ashworth is dead — examine crime scenes, interview five suspects, collect evidence, and solve the case.

### Play

```bash
python3 -m http.server 8080
```

Then visit http://localhost:8080/mystery/

### How to Play

1. **Explore locations** — Search the library, kitchen, study, garden, and ballroom for clues
2. **Interview suspects** — Question Elena, Marcus, Victoria, Dr. Whitmore, and Thomas
3. **Build your case** — Clues unlock new dialogue options; watch for contradictions and lies
4. **Make your accusation** — Once you have at least 4 clues, accuse the killer with the correct method and motive

### Features

- Cinematic intro briefing with typewriter narrative
- Illustrated scene exploration with interactive hotspots
- 5 locations, 14 clues (critical evidence vs. red herrings)
- 5 suspects with branching dialogue, lie detection, and confrontation options
- Evidence journal, case timeline, and deduction board
- Suspicion meter and case progress tracking
- Ambient rain/thunder audio (procedural Web Audio)
- Save/resume via localStorage
- Letter-grade scoring (S/A/B/F) on completion
