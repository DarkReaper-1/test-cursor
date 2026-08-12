# Parkour Race — Freerun Game

Browser recreation of a 3D rooftop parkour racer in the style of MADBOX’s *Parkour Race*. Original code and assets (procedural geometry, no copied art). Play in any modern browser.

## Play

```bash
python3 -m http.server 8080 --directory parkour-race
```

Open http://localhost:8080

Or from the repo root:

```bash
python3 -m http.server 8080
# http://localhost:8080/parkour-race/
```

## Controls

| Input | Action |
| --- | --- |
| **A / D** or **← / →** | Steer left / right |
| **Drag** (mouse or touch) | Steer |
| **Esc** | Pause |
| **R** | Restart race |

Running is automatic. Vaults, flips, slides, wall-runs, and ziplines trigger when you hit the right line at speed.

## Features

- Third-person 3D race across white rooftops (NYC, Paris, Tokyo, Dubai)
- Crowd of 12 racers with rubber-banding AI
- Glowing chevron speed pads, hurdles, fences, trampolines, scaffolds, water towers
- Auto parkour: jump gaps, vault, slide, wall-run, zip
- Checkpoint respawn if you fall
- Outfit + trail locker (coins from race placement)
- Portrait and landscape layout

## Stack

Three.js (CDN) · vanilla ES modules · Web Audio SFX · localStorage save
