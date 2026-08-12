# Parkour Race — Freerun

A playable, from-scratch homage to the Madbox rooftop racer *Parkour Race – FreeRun Game*.
Built with **Three.js** and vanilla JS — no build step, no external runtime dependencies
(Three.js is vendored locally so it runs fully offline).

> This is an **original re-implementation** of the game's mechanics using original code and
> simple primitive graphics. It contains none of the original app's assets, art, or code.

## Play

```bash
# from the repo root
python3 -m http.server 8090
# then open http://127.0.0.1:8090/parkour-race/
```

Or open `parkour-race/index.html` through any static file server (ES modules need HTTP, not `file://`).

## Controls

| Input | Action |
|-------|--------|
| **Hold Space** / **tap & hold** | Charge a jump — hold longer to jump higher & farther, release to leap |
| **A / D** or **← / →** | Steer left / right across the rooftops |
| **Pointer drag** (touch/mouse) | Hold to charge; drag left/right of centre to steer at the same time |

## How it plays (the mechanics being replicated)

- **Auto-run momentum system.** Your stickman always runs forward; you never press "run". Speed relaxes toward a cruising pace and is gained or lost by how you traverse.
- **Charged jumps over gaps.** Rooftops are separated by gaps of varying width. Hold to charge and release to clear them — the core skill is jump timing and reading gap distance.
- **Automatic vaults & flips.** Running into a low barrier auto-triggers a vault; jumps play a front-flip in the air. A clean landing after a flip grants a small speed boost.
- **Glowing speed bumpers.** Steer over the yellow pads for an instant momentum burst.
- **Race the pack.** Seven AI runners race alongside you with a spread of skill levels and light rubber-banding, so 1st place is winnable but contested.
- **Fall & recover.** Miss a gap and you tumble, then respawn on the last rooftop with reduced momentum — you lose time but the race continues.
- **HUD & results.** Live rank (1st/2nd/…), a course progress bar, and a speed meter; a finish screen shows your placement and time.

## Structure

```
parkour-race/
├── index.html          # shell, HUD, start/end overlays
├── css/style.css       # UI styling
├── src/main.js         # game: world gen, physics, AI, camera, controls
└── vendor/three.module.js   # pinned Three.js r160 (vendored for offline use)
```

Everything in `src/main.js` is original: procedural course generation, the runner model
(assembled from capsules/spheres with a hand-animated run/flip/crouch cycle), player physics,
AI pathing over the course profile, camera follow, and the race/UI flow.

## Notes

- Each race regenerates a fresh procedural course (rooftop heights, gaps, bumpers, barriers).
- No characters/skins/cosmetics are included — the focus is a faithful core gameplay loop.
