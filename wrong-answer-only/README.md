# Wrong Answer Only — Roblox Party Game

A party/elimination game where each round shows a **fake rule**. Doing what the rule says eliminates you. Last player standing wins.

## Rojo layout

```
wrong-answer-only/
├── default.project.json
├── tools/MapBuilder.lua          ← run once in Studio command bar
└── src/
    ├── server/                   → ServerScriptService
    ├── client/                   → StarterPlayerScripts
    ├── shared/                   → ReplicatedStorage
    └── maps/                     → map mechanic Scripts
```

## Studio setup

1. Install [Rojo](https://rojo.space/) and sync this project into a place, **or** manually create the Instance tree and paste each script.
2. Open the command bar and run `tools/MapBuilder.lua` once to build Baseplate + Lobby + all 5 maps.
3. (Optional) Parent map mechanic scripts under their models:
   - `LavaKill` / `PlatformKill` → `Map_Platform`
   - `ChaseMechanic` → `Map_Chase`
   - `CoinMechanic` → `Map_Coins`
   - `SwapMechanic` → `Map_Swap`  
   They also work from `Maps.MapScripts` (they find parts by name).
4. Publish with DataStores enabled for wins tracking.
5. Play with ≥2 players (minimum is set for testing). Lobby countdown is 30 seconds.

## Rounds (the lies)

| # | Map | Fake rule | Truth |
|---|-----|-----------|--------|
| 1 | Platform | Step on SAFE | Green kills, red is safe |
| 2 | Button | Do not press buttons | One button saves you |
| 3 | Chase | Reach the finish | The arch chases you — run away |
| 4 | Coins | Collect 10 coins | Every coin kills |
| 5 | Swap | Stay in blue | Zones swap at 20s and 40s |

## Hard rules enforced in code

- All elimination is **server-side only**
- 0.5s debounce on every kill `Touched`
- Never eliminate the same player twice
- Safety timeout = `timeLimit + 10`
- Disconnect → auto-eliminate; rejoin → spectator
- Every map Part is `Anchored = true`
