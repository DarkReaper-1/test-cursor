# test-cursor

This repository contains two independent projects:

1. **[Square App Reverse Engineering](#square-app-reverse-engineering)** — Security research toolkit for analyzing Square Android apps
2. **[Skyline Sentinel](#skyline-sentinel)** — Original 3D browser traversal game

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

## Skyline Sentinel

An original, full-screen 3D web-swinging and parkour game built with Three.js.
Astra Vale and the procedural city of Neon Harbor were created for this
project; the game does not use third-party characters, stories, maps, or art.

### Play

Open `index.html` in a browser, or run a local server:

```bash
python3 -m http.server 8080
```

Then visit http://localhost:8080. An internet connection is required to load
the pinned Three.js ES module from jsDelivr.

### Controls

| Input | Action |
|-------|--------|
| **W / A / S / D** | Camera-relative movement and air control |
| **Shift** | Sprint, wall run, and wall climb |
| **Space** | Jump or wall kick |
| **Hold left mouse** | Attach a kinetic filament to an aimed building |
| **Release left mouse** | Release the filament with momentum intact |
| **Right mouse** | Zip toward the aimed facade or roof |
| **E** | Ground punch combo or aerial strike |
| **Q** | Fire a snaring filament projectile |
| **Ctrl** | Dodge |

### Features

- Large, deterministic procedural city with roads, alleys, varied towers,
  rooftop routes, obstacles, and thousands of instanced windows
- Rope-constraint swing physics, momentum-preserving release, and web zip
- Sprinting, air control, wall running, climbing, vaulting, ledge grabs, and
  automatic impact rolls
- Original procedural hero and drone models with blended state animation
- Punch chains, air attacks, dodges, projectiles, and respawning training drones
- Smooth third-person camera, dynamic field of view, and camera obstruction
  handling
- Three-minute day/night cycle with dynamic sun, moon, stars, fog, windows,
  and street lighting
- Fixed-step simulation and instanced city geometry for desktop performance

### Architecture

The browser game is split into focused ES modules:

- `main.js` — renderer, camera, lighting, HUD, and game loop
- `controls.js` — keyboard, mouse, and pointer-lock input
- `city.js` — procedural generation, instanced rendering, and city queries
- `player.js` — player model, animation blending, and combat
- `physics.js` — character collision, parkour, swinging, and zip physics
