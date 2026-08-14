# Parkour Dash — rooftop parkour racing

A fully playable 3D parkour racing game in the style of the mobile "steer-only freerun racer" genre
(à la *Parkour Race* by Madbox): you **only steer** — running, jumping, vaulting, flipping and
grinding all happen **automatically** based on your speed and trajectory. All code, art and audio
here are original and generated procedurally at runtime; no assets are copied from any other game.

Built with **Three.js** and vanilla ES modules — **zero build step**. Serve the folder statically
and play.

## Run it

```bash
cd parkour-race
python3 -m http.server 8080     # or: npx serve, or any static server
# open http://localhost:8080
```

Works on desktop and mobile (touch drag to steer).

## How to play

| Input | Action |
|---|---|
| **Drag** left/right (touch or mouse) | Steer |
| **A / D** or **← / →** | Steer (keyboard) |
| Tap / Space | Start the race |

Everything else is automatic — that's the point of the genre:

- **Run off a ledge** → your runner jumps automatically. The arc scales with your speed:
  come in fast and you clear the gap, come in slow and you drop into the void.
- **Yellow ramps** → big launch + automatic front-flip (double flip on big launches).
  Land with the rotation complete → **PERFECT!** speed boost. Under-rotate → faceplant stumble.
- **Glowing speed pads** → instant boost.
- **Trampolines** (blue) → huge vertical launch with a double flip onto higher rooftops.
- **Pink low barriers** → auto-vault at speed; they stop you dead if you're slow.
- **Rails** → land on one to auto-grind across the gap (hard steer to hop off early).
- **Purple walls** → bonk. Bumping walls collapses your speed — smooth lines win races.
- **Fall off the rooftops** → respawn at the last checkpoint (the light-blue arches).

You race **7 AI runners** who obey the exact same physics. Finish on the podium (top 3)
to unlock the next level. Progress is saved locally.

## Physics model (tuned for the genre's feel)

- Gravity **34 m/s²** (arcade-fast falls), base run speed **11.2 m/s**, boost ×1.5.
- Steering turns your heading up to ~35°; oversteering bleeds forward speed, so
  micro-corrections beat sweeping turns.
- Ledge auto-jumps probe ahead for a landing deck and pop you with `vy = 3.9 + 5.1·(speed/max)` —
  the signature "carry your momentum" jump physics.
- Flip ramps launch along the ramp slope (`vy = slope · speed · 1.55`, clamped), with the flip
  animation timed to the predicted airtime so a clean run lands exactly on rotation.
- Wall collision is circle-vs-AABB with impact-based stumbles: hard hits cut speed to 30%.
- Fixed 120 Hz simulation timestep, decoupled from rendering.

## Structure

```
parkour-race/
├── index.html          # UI overlay (menu / HUD / countdown / results) + styles
├── vendor/three.module.js
└── src/
    ├── main.js         # scene, race flow state machine, fixed-timestep loop
    ├── runner.js       # THE physics: shared character controller (player + AI)
    ├── track.js        # level builder DSL, collision queries, merged geometry
    ├── ai.js           # steering-only AI brains (same physics as the player)
    ├── stickman.js     # procedural stickman rig + pose state machine
    ├── camera.js       # chase camera: heading follow, boost FOV, shake
    ├── effects.js      # one-draw-call pooled particles (dust/sparks/confetti)
    ├── input.js        # drag + keyboard steering, smoothed
    ├── audio.js        # 100% synthesized WebAudio SFX
    └── ui.js           # DOM HUD: position, progress dots, toasts, results
```

## Levels

6 authored layouts (looping with rising AI skill after level 6) composed from segments:
runways with speed pads, gaps, flip ramps, vault lines, wall slaloms, rail bridges,
trampoline pits, fast/safe route splits and big drops. Checkpoints every couple of segments.
