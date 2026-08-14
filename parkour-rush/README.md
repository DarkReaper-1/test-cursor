# Skyline Rush — 3D Parkour Racing (Mobile)

An original, fully playable 3D arcade **parkour racing** game built with **Three.js + TypeScript + Vite**, designed mobile-first (touch controls, 60 FPS target, portrait or landscape). Every asset — characters, levels, VFX, UI, and audio — is generated procedurally at runtime; nothing is copied from any other game.

Race AI opponents across rooftop obstacle courses: sprint, jump, double-jump, slide, vault, wall-run, and wall-jump your way to the finish line while collecting coins and power-ups.

![gameplay](https://img.shields.io/badge/engine-three.js-blue) ![tests](https://img.shields.io/badge/tests-53%20passing-brightgreen)

---

## How to run

```bash
cd parkour-rush
npm install
npm run dev          # dev server → http://localhost:5173
```

Production build & preview:

```bash
npm run build
npm run preview
```

Unit tests (Vitest):

```bash
npm test
```

Playable smoke test (boot → race → finish → results → save persist):

```bash
npm run build && npm run preview -- --host 127.0.0.1 --port 5173
# in another terminal:
npm run smoke
```

To ship as a native iOS/Android app, the `dist/` output can be wrapped with [Capacitor](https://capacitorjs.com/) unchanged (the game is fully touch-driven and uses no server).

## Controls

### Touch (default: swipe scheme)
| Gesture | Action |
|---|---|
| Swipe **left / right** | Move sideways (hold + drag to steer continuously) |
| Swipe **up** (or quick tap) | Jump / double jump / wall-jump |
| Swipe **down** | Slide (on ground) / fast-fall (in air) |
| Run at low barriers | **Auto-vault** |
| Jump near side wall panels | **Wall-run**, jump again to **wall-jump** |

An alternative **on-screen button** scheme (◀ ▶ ▼ ▲) can be enabled in Settings, plus adjustable swipe sensitivity.

### Keyboard (desktop testing)
| Key | Action |
|---|---|
| `A/D` or `←/→` | Steer |
| `Q` / `E` | Snap one lane left / right |
| `Space` / `W` / `↑` | Jump |
| `S` / `↓` / `Shift` | Slide / fast-fall |
| `Esc` | Pause |

## Project structure

```
parkour-rush/
├── index.html                  # entry, canvas + UI root
├── src/
│   ├── main.ts                 # composition root + game flow wiring
│   ├── core/                   # engine-agnostic infrastructure
│   │   ├── types.ts            # shared data types (colliders, levels, save)
│   │   ├── EventBus.ts         # typed pub/sub decoupling systems
│   │   ├── GameStateManager.ts # boot→menu→race→results FSM
│   │   ├── SaveManager.ts      # versioned, validated localStorage saves
│   │   ├── InputManager.ts     # swipe/drag/buttons/keyboard input
│   │   ├── AudioManager.ts     # 100% procedural WebAudio SFX + music
│   │   └── Haptics.ts          # vibration wrapper
│   ├── game/
│   │   ├── Game.ts             # scene, fixed-timestep loop, orchestration
│   │   ├── MovementController.ts # arcade kinematics: jump/slide/vault/wall-run…
│   │   ├── ParkourController.ts  # surface detection/classification ahead
│   │   ├── PlayerController.ts   # input → movement + events + stunt score
│   │   ├── AIController.ts       # waypoint AI with skill tiers & mistakes
│   │   ├── CameraController.ts   # chase cam: anticipation, FOV, shake
│   │   ├── CharacterRig.ts       # procedural stylized runner model
│   │   ├── AnimationController.ts# blended procedural animation states
│   │   ├── race/                 # RaceManager, RacePositionManager, CheckpointManager
│   │   └── systems/              # Obstacle / Collectible / PowerUp / VFX systems
│   ├── levels/
│   │   ├── LevelTypes.ts       # piece/theme definitions + palettes
│   │   ├── LevelBuilder.ts     # modular piece builders + collision world
│   │   ├── LevelRenderer.ts    # batched static geometry, skyline, lights
│   │   └── levels.ts           # 12 original level layouts
│   ├── progression/            # Currency, Progression (XP/stars/unlocks), Characters
│   └── ui/                     # UIManager (menus/HUD/results) + styles.css
└── tests/                      # 52 Vitest unit tests
```

## Implemented features

- **Movement**: auto-run, lateral steering + lane snaps, tuned jump arcs with apex hang and fast descent, double jump (flip), slide + fast-fall, auto-vault, wall-run, wall-jump, ledge mantle, air control, coyote time + jump buffering, blended landing recovery with impact grades, boost momentum, stumble, fall/hazard death with checkpoint respawn.
- **Parkour system**: reusable surface scanner classifying gaps, vaults, slide bars, walls, wall-run panels, launch pads, breakables, hazards — drives tutorial prompts and AI recovery.
- **Camera**: smooth chase cam with lateral anticipation, speed-based FOV, impact shake (toggleable), never clips below the deck.
- **Racing**: countdown, timer, live placement (1st–8th), gap indicators, checkpoints, finish detection, final standings with DNF handling.
- **AI**: 3 skill tiers (easy/normal/hard) built from per-racer profiles (speed, reaction, mistake chance), annotation-driven actions + reactive fallback scanning, believable rubber-banding disabled near the finish, checkpoint recovery after falls.
- **Levels**: 12 original courses across 7 themes built from ~20 modular pieces: gaps, vault barriers, slide bars, wall-run gaps, floating/moving/falling platforms, rotating sweepers, launch pads, speed strips, breakable walls, narrow beams, stepped ramp jumps, and risk/reward split routes.
- **Pickups**: instanced coins (magnet-aware) and 5 power-ups (Speed Surge, Shield, Coin Magnet, Slow-Mo, Air Boost) with HUD timers, VFX and audio — shield correctly absorbs one hazard/stumble then expires.
- **Progression**: coins, XP + runner level, 1–3 stars per race, sequential level unlocks, best times, character/color/trail unlock shop (no pay-to-win — everything earned by racing).
- **Characters**: 5 original procedural runners with distinct palettes/proportions, unlockable accent colors, and 6 trail cosmetics.
- **Animation**: blended procedural state machine — idle, run, sprint, jump, double-jump flip, fall, land, slide, vault, wall-run L/R, wall-jump, stumble, dead, victory, defeat.
- **VFX**: pooled one-draw-call particles (landing dust, jump puffs, wall-run sparks, coin sparkles, power-up bursts, debris, confetti) + additive speed trail ribbon.
- **Audio**: fully synthesized WebAudio — footsteps, jump/land/slide/wall-run, coins, power-ups, countdown, finish fanfare, victory/defeat stingers, UI taps, and a generative 128 BPM music loop.
- **UI**: boot, main menu with one-tap **Race** (plus Levels), level select (stars/best times/locks), customization shop, settings, gameplay HUD (position, timer, progress, coins, power-ups, pause), pause menu, results/rewards screen, first-run tutorial toast + contextual prompts.
- **Accessibility**: swipe **or** button controls, sensitivity slider, music/SFX/haptics toggles, camera-shake toggle, reduced-motion mode, low/medium/high/auto graphics quality.
- **Performance**: whole static course merged into 2 draw calls, instanced coins & skyline, z-bucketed collision queries, pooled particles, fixed-timestep simulation, FPS-driven auto quality scaling, no per-frame allocations in hot paths.
- **Persistence**: versioned localStorage save (coins, XP, unlocks, stars, best times, cosmetics, settings, tutorial state) with corruption recovery and input sanitization.

## Known limitations

- Tracks are straight-line courses (no curved splines); variety comes from vertical layout and obstacle mix.
- The character rig is intentionally low-poly/stylized; no skeletal mesh import pipeline.
- Slow-Mo affects rivals/obstacles rather than a full time-dilation post effect.
- No multiplayer; AI-only opponents.
- Haptics depend on the platform Vibration API (unavailable on iOS Safari).

## Recommended next steps

1. Spline-based curved track sections with banked turns.
2. Ghost replays of your best run per level.
3. Daily challenges + rotating medal objectives.
4. More obstacle pieces (swinging hammers, zip lines, crumbling stairs).
5. Character abilities (e.g. longer wall-run for Wisp) balanced for fairness.
6. Capacitor wrapper + App Store/Play Store packaging with native haptics.
7. Cloud save sync.
