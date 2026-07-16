# WEBLINE — High-Quality Spider-Man Web Swing

A polished **3D browser** Spider-Man-style web-swinging game built with Three.js.

## Play

```bash
python3 -m http.server 8080
```

Open [http://localhost:8080](http://localhost:8080)

Or open `index.html` via any local static server (ES modules require HTTP).

## Controls

| Input | Action |
|-------|--------|
| **A / D** or ← → | Steer / run |
| **Space** | Jump |
| **Click / hold** | Shoot web at rooftops & swing |
| **Release** | Drop web (fling) |
| **Shift** or **S** | Zip (shorten web while swinging) |

## Features

- Night New York skyline with lit windows, street lamps, river, stars
- Momentum-based pendulum web physics with aim assist
- Combo multiplier for chained swings
- Collectible rooftop rings
- Speed FOV kick, motion trail, attach particles
- Procedural audio (no asset downloads)
- Branded title screen + run-complete score screen
- Desktop + touch-friendly pointer controls

## Stack

- Three.js r170 (CDN)
- Vanilla ES modules
- Outfit + Bebas Neue typography
