# Parkour Race — Freerun (3D)

A playable **one-to-one gameplay replica** of Madbox-style rooftop parkour racing, built with **Three.js + TypeScript + Vite**. Stickmen auto-run across city rooftops; you only steer. Jumps, vaults, slides and backflips fire automatically from speed and trajectory. All art, audio, and UI are original and generated at runtime — no third-party assets.

Race a packed AI crowd: hit glowing yellow speed bumpers, leap rooftop to rooftop, and cross the finish first.

![engine](https://img.shields.io/badge/engine-three.js-blue)

---

## How to run

```bash
cd parkour-rush
npm install
npm run dev          # → http://localhost:5173
```

```bash
npm test             # Vitest unit tests (physics, race, AI, saves)
npm run build && npm run preview
```

## Controls

Parkour Race is a **one-thumb** game. The stickman always sprints forward.

| Input | Action |
|---|---|
| **Drag left / right** (or hold A/D, ←/→) | Steer |
| Approach a ledge | **Auto-jump** — distance = forward speed |
| Approach a low bar | **Auto-slide** |
| Run at a low obstacle | **Auto-vault** |
| Fast / long jump | **Auto-backflip** (speed bonus on landing) |
| Hug a side wall in a gap | **Auto wall-run** |

Optional: swipe up / Space still jumps; swipe down / S still slides. You should not need them.

**Skill:** stay on line, hit every yellow bumper, avoid wide steering (it bleeds speed). Miss a bumper and you will not clear the next rooftop.

## Physics (what “getting the jump right” means)

- Jump **height** is almost constant. Jump **distance** is `speed × hangTime`.
- Hang time ≈ `2 × jumpVelocity / gravity` (~0.76s). At base speed (~13.2) you clear ~10 units; at bumper speed (~20+) you clear 15+.
- Auto-jump fires at the **lip of the ledge**, not early, so hang time is spent over the gap.
- Yellow bumpers apply a speed multiplier. Chain them to keep the glide.
- Over-steering applies **steer drag** so micro-adjustments beat sweeping turns.
- Landing a backflip grants a small extra burst.

## Project structure

```
parkour-rush/
├── src/game/MovementController.ts   # auto-run / auto-jump / vault / flip
├── src/game/CharacterRig.ts         # procedural stickman
├── src/levels/                      # 12 city rooftop courses
└── tests/                           # physics + race unit tests
```

## Features

- Stickman crowd (12–20 racers) with rubber-band AI
- Cities: Brooklyn, Midtown, Paris, Tokyo, Shanghai, neon nights
- Speed bumpers, vaults, slides, wall-runs, launch pads, glass-break walls
- Coins, power-ups, cosmetics, stars, local saves
- Touch + keyboard, 60 FPS target, auto quality

Original implementation inspired by the public gameplay of *Parkour Race - Freerun Game* (Madbox). Not affiliated with Madbox.
