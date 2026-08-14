# Parkour Dash — Freerun Race

A browser-based 3D freerun racing game inspired by one-touch mobile parkour racers.
All code, art, names, and audio are original — the game recreates the *mechanics*
(auto-run, hold-to-charge jumps, speed pads, auto-vaults, rail slides, rubber-banded
AI opponents), not any copyrighted assets.

## Play

Serve the folder with any static server and open it in a browser:

```bash
cd parkour-race
python3 -m http.server 8080
# → http://localhost:8080
```

No build step. Three.js is loaded from a pinned CDN import map.

## Controls

| Input | Action |
| --- | --- |
| **Hold** (tap / click / Space / W / ↑) | Crouch and charge a jump — longer hold = bigger leap |
| **Release** | Jump. A full charge triggers a front flip |
| **A / D** or **← / →** or **drag** | Steer left / right (oversteering bleeds speed) |

## Mechanics

- **Auto-run** — your runner sprints forward on their own; you manage jumps and lines.
- **Charged jumps** — hold to crouch (you slow down slightly), release to leap.
  Jump power scales with hold time up to 0.55 s. Two-phase gravity (floaty rise,
  snappy fall) gives the classic arcade arc.
- **Perfect landings** — clear a gap and touch down just past the far edge for a
  `PERFECT!` speed boost. Land clumsy from very high and you stumble.
- **Speed pads** — glowing orange bumpers add a big burst of speed (which slowly
  bleeds back down).
- **Auto-parkour** — low walls are vaulted automatically at speed; short ledges are
  climbed; trampolines launch you with an automatic flip; sloped rails catch you
  mid-air and grind you down at high speed.
- **Wall hits** — jump short into a roof face and you either ledge-grab (if close
  to the top) or faceplant and fall. Fall off the course and you respawn at your
  last safe spot with a time penalty.
- **7 AI racers** — they run the exact same physics, plan their jumps at gap edges
  with skill-based error, seek speed pads, and rubber-band to keep the race tense.

## Files

- `js/runner.js` — all movement physics (`TUNE` at the top holds every constant)
- `js/course.js` — track layout, obstacles, collision queries
- `js/bots.js` — AI jump planning + rubber-banding
- `js/stickman.js` — procedural character animation (run, charge, flip, vault, rail, stumble)
- `js/camera.js`, `js/ui.js`, `js/audio.js`, `js/input.js`, `js/main.js`
