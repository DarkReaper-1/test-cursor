# Skyline Drifter — 3D Web-Swing Traversal Sandbox

A fully original, browser-based third-person traversal game inspired by the
*movement* of superhero web-swinging games — built from scratch with
[Three.js](https://threejs.org/). No copyrighted assets, characters, maps,
dialogue, or story: the hero ("Skyline Drifter"), the city, and every mechanic
are original and generated procedurally.

![Gameplay](./demo.mp4)

> A recorded 10-second demo lives at [`demo.mp4`](./demo.mp4).

## Play it

It's plain static files — no build step. Serve the folder over HTTP (module
scripts need `http://`, not `file://`):

```bash
cd swing3d
python3 -m http.server 8099
# open http://localhost:8099
```

Then click **CLICK TO PLAY** to lock the pointer and go.

## Controls

| Input | Action |
| --- | --- |
| `W` `A` `S` `D` | Move (camera-relative) |
| `Shift` | Sprint |
| `Space` | Jump · wall-jump · vault |
| `Space` (into a wall) | Wall-run / wall-climb |
| Mouse | Aim / look |
| Left-Click (hold) | Fire &amp; hold web to swing; release to launch |
| Right-Click | Web-zip — pull rapidly toward an aimed surface |
| `F` | Punch combo / air attack |
| `E` | Web projectile |
| `C` | Dodge roll |

Aim at a building and hold Left-Click. Gravity turns the taut web-line into a
swing arc; release near the bottom of the arc to fling forward and chain into
the next web.

## Features

- **Procedural city** — a seeded grid of streets, alleyways and buildings of
  varied heights with walkable rooftops, water towers, HVAC units, parapets and
  antennae. Deterministic given its seed.
- **Physics web-swinging** — a position-based distance constraint models a rope
  that can pull but not push, so momentum carries realistically through swings.
  Webs attach to **buildings only**, verified by a ray cast along your aim.
- **Fluid traversal** — sprint, jump (with coyote time), air control, wall-run,
  wall-climb, auto ledge-mantle, obstacle vaulting, and a landing roll after
  long falls.
- **Web-zip** — a rapid pull toward a rooftop or facade for repositioning.
- **Combat** — grounded punch combo, downward air attack, dodge, and a web
  projectile.
- **Procedural animation** — the hero is an articulated primitive rig animated
  with weight-blended poses (animation blending), so state transitions
  cross-fade smoothly, with a layered run/climb cycle.
- **Dynamic lighting** — a moving sun with a shadow frustum that follows the
  player, a gradient sky dome, and a **day/night cycle** that ramps up building
  window glow after dusk.

## Performance

Targeted at desktop browsers:

- Buildings share a handful of materials; rooftop props use `InstancedMesh`
  (one draw call per prop type).
- Collision uses a uniform-grid **spatial hash**, so only the handful of
  buildings near the player are tested each frame.
- Windows are a baked canvas texture on a single box mesh per building, not real
  geometry.
- Fog + modest draw distance, a single shadow-casting light, and a capped pixel
  ratio (≤ 2).

## Code layout

The project is intentionally split so it's easy to extend:

| File | Responsibility |
| --- | --- |
| `index.html` | Markup, import map, HUD/overlay scaffolding |
| `style.css` | HUD, crosshair and start-overlay styling |
| `js/main.js` | Renderer, scene, lighting, day/night cycle, game loop, HUD |
| `js/player.js` | Hero rig, movement state machine, web-swing, combat, animation |
| `js/city.js` | Procedural city + collision boxes + instanced props |
| `js/physics.js` | Vector math, spatial hash, capsule collision, rope solver, raycasts |
| `js/controls.js` | Input, pointer-lock, third-person follow camera |
| `js/vendor/three.module.js` | Vendored Three.js (r160) so the game runs offline |

### Extending it

- **New moves**: add a state to `Player.state`, a handler `_updateX`, and a pose
  in `POSES` (it will blend automatically).
- **New city content**: extend `generateCity` in `city.js`; push any solid into
  the `SpatialHash` and it becomes swing-able and collidable for free.
- **Tuning**: the constants at the top of `player.js` and `physics.js` control
  speeds, gravity, rope behaviour and camera feel.

## How the demo was recorded

`demo.mp4` was captured headlessly with a scripted "autopilot" that drives the
same input the player uses (via the `window.__AUTOPILOT__` hook in `main.js`),
stepping the simulation at a fixed 30 fps for deterministic, smooth frames. The
hook is inert during normal play.
