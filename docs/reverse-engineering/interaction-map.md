# Interaction map

This map is **INFERRED** from public screenshots and copy. No runtime session was captured.

```
                    ┌─────────────┐
                    │  Store /    │
                    │  Install    │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │ Activation  │  (screenshot 1 fantasy)
                    │ + Auth      │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │ Lifestyle   │  (listing step 1)
                    │ questions   │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  Paywall    │  OBSERVED: required for plan/quests
                    └──────┬──────┘
                           │
              ┌────────────┼────────────────┐
              │            │                │
       ┌──────▼─────┐ ┌────▼─────┐   ┌──────▼─────┐
       │ Training   │ │  Quest   │   │   Stats    │
       │ (dumbbell) │ │ (scroll) │   │  (chart)   │
       └──────┬─────┘ └────┬─────┘   └──────┬─────┘
              │            │                │
        program cards   daily quest    charts, ranks,
        (screenshot 3)  (screenshot 2) nutrition, profile
                                           mix
```

## Tab interactions (OBSERVED icons)

| Control | Observed on | Likely result (INFERRED) |
| --- | --- | --- |
| Dumbbell tab | 03, 07, 08, 09 | Training catalog |
| Scroll tab | 02 (highlighted) | Daily quest |
| Chart tab | 07, 08 (highlighted) | Progress / nutrition |
| Profile tab | 02–09 | Character sheet |
| Start Quest | 02 | Enter workout player (unconfirmed UI) |
| + tile | 02 | Add/swap exercise |
| Close (X) | 05, 08 | Dismiss modal |
| Share Rank | 05 | OS share / Instagram |
| ADD / STORY / SAVE / SHARE | 04 | Share pipeline |
| Copy ID | 09 | Clipboard |
| Chart point | 07 | Tooltip with timestamped PR |

## Animation / transition (OBSERVED vs INFERRED)

**OBSERVED in stills:** glow borders, lightning textures, hexagonal rank language, stacked “Leveled up!” chips.

**INFERRED, unconfirmed:** quest start crossfade, XP count-up, rank-up modal, rest-timer tick, haptic on complete.

**PROPOSED for Helix:** tokens for motion; `prefers-reduced-motion` disables non-essential glow; haptics only on complete / level / error.

## State changes worth modeling

| Action | Likely client state | Likely server state |
| --- | --- | --- |
| Start quest | session_active | quest.status=in_progress |
| Log set | local draft | pending until confirm |
| Complete quest | celebration | xp_event + idempotency key |
| Miss day | warning UI | penalty or streak break (Arise I); momentum dip (Helix P) |
| Subscribe | entitlement cache | RevenueCat + server grant |
| Sign out | wipe tokens | revoke refresh |

## Anti-patterns to avoid (PROPOSED)

- Blank/gray root with no recovery (public v1.4.4 reports)
- Rest timer bound to a foreground Activity only
- Weight entry that cannot be typed
- Paywall before the user has felt the loop
- Penalty copy as the primary missed-day interaction
- Home that is a catalog instead of “what now?”
