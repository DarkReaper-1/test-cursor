# Design direction

**Feeling:** futuristic + cinematic + premium + minimalist + motivating.

**Not:** Arise UI, Solo Leveling System windows, anime HUD chrome, neon everything, cluttered game admin.

## Principles

1. Typography and spacing do the work
2. Motion is rare and meaningful
3. Depth via layers, not particle spam
4. One focal action per screen
5. Color is accent, not information
6. Dark default, true black only in cinematic beats
7. Original iconography (geometric lattice, not hunter emblems)

## Tokens (Phase 1)

`packages/design` (or `apps/mobile/src/design`):

- color (bg, surface, text, accent, warning, success — plus shape/label)
- space (4-pt)
- type (display, title, body, mono for numbers)
- radius, elevation, motion durations
- haptics map

Components: Button, Card, Modal, Progress, Stat, QuestRow, Nav, Toast.

## Accessibility

- Dynamic Type
- Reduce motion → crossfade, no orbit glows
- Contrast ≥ WCAG AA
- Status: icon + text, not color alone
- Hit targets ≥ 44pt

## Sound (later)

Original or licensed: quest accept/complete, level, rank, achievement. None required for MVP.
