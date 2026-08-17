# NIGHTWIRE — Game Design Document (Phase 1)

**Document status:** Phase 1 deliverable — awaiting approval to begin Phase 2 (World Design)  
**Version:** 1.0  
**Studio frame:** Meridian Pictures Interactive  
**Classification:** Production bible seed (design-locked pillars; details expand in later phases)

---

## 1. Executive Summary

**NIGHTWIRE** is a cinematic 3D detective game for PC and mobile. It blends the mood of 1980s–1990s neo-noir crime cinema with modern investigation systems: evidence gathering, Detective Vision, an Evidence Board, living NPCs, driving/tailing, and branching interrogations.

Players inhabit **Detective Mara Quinn** in **Port Meridian**, a rainy semi-open city where a “closed” missing-person case opens into wiretap corruption, organized crime, and institutional rot. Every clue is designed to matter; false leads are intentional; endings depend on what you prove and what you sacrifice.

| Field | Decision |
|--------|----------|
| Genre | Neo-noir investigation / narrative adventure with light stealth & driving |
| Perspective | Third-person cinematic (investigation) with optional first-person inspect/aim for evidence cam |
| Platforms | Windows, macOS, Linux (optional), Android, iOS |
| Input | Keyboard+Mouse, gamepad, touch |
| Session length | Case chapters 45–90 min; full campaign 12–18 hrs + New Game+ cold cases |
| Engine (proposed) | Unreal Engine 5 primary; scalability tiers for mid-PC & mobile |
| Content rating target | Mature (violence implied, corruption, language; avoid gratuitous gore) |

---

## 2. Design Pillars

1. **Cinema first** — Lighting, camera, rain, and score sell “premium crime film,” not checklist UI.
2. **Clues that bite** — Every exhibit can open a path, close a path, or change a relationship. No filler loot.
3. **The city lies on a schedule** — NPCs have routines; truth moves with time of day and weather.
4. **Pressure over power fantasy** — Stealth, tails, and chases exist to protect the investigation, not as arcade combat.
5. **Moral residue** — Choices leave stains on the board, the precinct, and Quinn’s ending.

**Anti-pillars (explicitly out of Phase 1 scope as core fantasy):**
- Loot grind / RPG stat trees as primary progression
- Open-world busywork without case relevance
- Cover shooter as default verb

---

## 3. Fantasy & Player Promise

> “I am the detective in the movie — wet streets, neon, a board full of string, and a city that remembers what I did last night.”

**Core fantasy loop:** Arrive → Observe → Collect → Connect → Confront → Live with the fallout.

---

## 4. Narrative Frame (GDD-level; full bible = Phase 3)

### 4.1 Logline
Reinstated homicide detective Mara Quinn is ordered to rubber-stamp a cold missing-person file. The blood at the Meridian Motel isn’t the victim’s, a ghost radio channel links the docks to Precinct 7, and closing the case would make Quinn complicit.

### 4.2 Themes
- Institutional silence vs. personal conscience  
- Surveillance as both tool and weapon  
- Family loyalty vs. civic truth  
- What “proof” means when records can be rewritten  

### 4.3 Structure (campaign)
| Act | Chapters (working) | Player focus |
|-----|--------------------|--------------|
| I — Static | 1–3 | Motel crime scene, first board links, precinct politics |
| II — Crosstalk | 4–7 | Docks, wire rooms, false suspects, tailing Calder |
| III — Dead Air | 8–10 | Corruption reveal, moral choke points, endings |

**Multiple endings (design intent):** Proof-based (who you can charge), Loyalty-based (who you protect), and Silence-based (what you bury). Exact trees locked in Phase 3.

**Phase 3 will deliver:** full outline, scene list, dialogue sample packs, twist map, ending matrix.

---

## 5. World Frame (GDD-level; full design = Phase 2)

**Port Meridian** — coastal industrial city, perpetual weather drama, 1989-coded fashion/tech mixed with modern systems UX.

### Districts (planned)
Downtown Core · Neon Strip · Harbor Docks · Train Yard / Wire Rooms · Westend Suburbs · Precinct 7 HQ · Motel Row · Factory Belt · Underground Tunnels · Hospital Hill · Library Archives · Abandoned Broadcast Tower

Each district must contain **environmental storytelling props** tied to at least one case thread.

**Phase 2 will deliver:** district dossiers, traversal graph, POI list, streaming layout, landmark map.

---

## 6. Core Gameplay Loop

```
Case Brief → Travel / Explore → Investigate Hotspot
    → Gather Evidence (photo / print / sample / document)
    → Update Notebook (auto) + Board (player links)
    → Interview / Interrogate / Tail / Hack as unlocked
    → Reconstruct Timeline → Accuse / Confront / Choose
    → Fallout (world + ending flags) → Next chapter beat
```

### 6.1 Primary verbs
| Verb | Description |
|------|-------------|
| Examine | Close look, notes, micro-inspect |
| Photograph | Evidence Cam stamps time/location metadata |
| Scan (Detective Vision) | Reveal traces (prints, blood, footprints, conduits) — limited charge / cooldown on mobile tiers |
| Collect | Bag exhibit into Case Kit |
| Link | Evidence Board connections (clue↔suspect↔place↔time) |
| Interview | Branching dialogue with pressure / empathy / bluff |
| Tail | Foot or vehicle; heat meter for suspicion |
| Infiltrate | Stealth enter, lockpick, signal trace |
| Drive | Semi-open street navigation between districts |
| Reconstruct | Timeline minigame: order events until contradiction breaks |

### 6.2 Combat posture
NIGHTWIRE is **not** a shooter-first game. Armed confrontation is rare, scripted, and escapable when possible (flee, bargain, evidence leverage). Gunplay, if present, is short, deadly, and narrative-gated.

---

## 7. Detective Systems (Overview)

Detailed specs expand in `SYSTEMS_OVERVIEW.md`. Summary:

### 7.1 Case Kit (Inventory)
Typed slots: Physical · Document · Trace · Bio · Photo · Device.  
Items support **Analyze** (lab), **Compare**, **Present in dialogue**.

### 7.2 Notebook
Auto-updates objectives, witness notes, crime reports, unlocked map pins. Player can pin personal theories (non-spoiling).

### 7.3 Evidence Board
Nodes + strings. Valid links unlock leads; invalid links cost time or tip suspects. Tabs: Links · Timeline · Motives · Relationships.

### 7.4 Detective Vision
Highlight mode for latent evidence. Overuse can attract NPC attention in restricted areas (design tension).

### 7.5 Lab / Analysis
Fingerprint match confidence, DNA partials, blood typing, document forensics — presented as readable results, not abstract percentages alone.

### 7.6 Phone
Calls, pager ghosts (period flavor), contacts, tip line. Some tips expire with time-of-day.

---

## 8. NPC & AI (Design Intent)

NPCs have: schedule blocks, job, relationships, personality tags, memory of player actions, weather reactions, and lie/cooperate policies.

**Crimes as systemic flavor (careful scope):** background incidents can fire (robbery call, street fight) without derailing the main case; player can optionally investigate as side cases (Phase 4+ content packing).

Full AI behavior trees and memory schemas = Phase 6.

---

## 9. Progression & Difficulty

- **Case progression** via leads unlocked, not XP levels.  
- **Quinn’s loadout** upgrades are narrative/tooling (better lens, longer vision battery, improved lockpick set) gated by chapter.  
- **Difficulty:** Story · Standard · Hardboiled (shorter vision, harsher tails, fewer UI breadcrumbs).  
- **Accessibility:** subtitle size, colorblind board colors, hold-to-press alternatives, reduced camera shake, touch remapping.

---

## 10. Camera, Cinematography & Tone

- Investigation: stable over-shoulder / inspect cams.  
- Scripted scenes: directed cinematic cameras (trailer language).  
- Rain, wet reflections, neon practicals, volumetric night — art direction north star.  
- UI is diegetic where possible (board, notebook, pager) without harming clarity on mobile.

---

## 11. Audio Direction

- Adaptive score: exploration / tension / chase / interrogation stems.  
- City bed: rain, traffic, neon buzz, harbor horns, distant radio.  
- Precinct: HVAC, typewriters/CRT flavor, muffled arguments.  
- Foley: footsteps by surface, coat movement, evidence bagging.  
Dynamic music intensity follows heat (tailing) and board “case temperature.”

Phase 7 owns full audio design bible.

---

## 12. UI / UX (GDD-level)

Screens: HUD · Case Kit · Board · Notebook · Map · Phone · Camera · Dialogue · Pause/Settings · Save/Load.

Mobile: thumb-zone actions, radial for vision/camera/phone, larger board nodes, chaptered board subsets.

Wireframes: `UI_WIREFRAMES.md`.

---

## 13. Technical Direction (Summary)

**Proposed engine:** Unreal Engine 5  
**Why:** cinematic lighting (Lumen), large-world streaming, sequencer for trailer-quality scenes, single codebase with scalability groups for mobile/mid-PC.

Fallback: Unity if Phase 1 postmortem with stakeholders prefers mobile toolchain velocity — decision checkpoint at Phase 1 approval + tech spike (short), before Phase 4 coding surge.

Full architecture: `TECHNICAL_ARCHITECTURE.md`.

---

## 14. Scope & Vertical Slice

**First playable vertical slice (post Phase 4 start):**  
Chapter 1 — Motel 214 + Precinct lobby + one interview + board tutorial + short drive to docks overlook.

Must prove: evidence gather, vision, board link, dialogue branch, save/load, rain atmosphere.

---

## 15. Success Metrics (Design)

| Metric | Target |
|--------|--------|
| Chapter 1 completion (playtest) | ≥70% without critical softlock |
| “Felt cinematic” survey | ≥4.2 / 5 |
| Board comprehension | ≥80% correctly form first required link |
| Mobile frame budget | Stable tier FPS on mid-range Android / recent iPhone |
| Trailer-to-demo fantasy match | Playtesters recognize previs verbs in slice |

---

## 16. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| UE5 mobile cost | Aggressive scalability; bake lighting variants; early device lab |
| Overwide open city | Semi-open district streaming; case-gated unlocks |
| Clue confusion | Notebook breadcrumbs + optional assistant difficulty |
| Scope creep systems | Phase gates; vertical slice before full district art |

---

## 17. Phase Gate

**Phase 1 complete when:** this GDD + companion docs reviewed.  
**Next:** Phase 2 — World Design (district dossiers, map, POIs, traversal).  

**No Phase 2 work begins until explicit approval.**

---

## Companion Documents (Phase 1 pack)

| Doc | Purpose |
|-----|---------|
| `SYSTEMS_OVERVIEW.md` | Gameplay systems documentation |
| `UI_WIREFRAMES.md` | UI wireframes |
| `TECHNICAL_ARCHITECTURE.md` | Tech architecture |
| `ASSET_LIST.md` | Preliminary asset list |
| `DEVELOPMENT_ROADMAP.md` | Phased roadmap |
| `MARKETING_PLAN.md` | Marketing plan |
| `LAUNCH_CHECKLIST.md` | Launch checklist |
| `STORY_OUTLINE_PREVIEW.md` | Story seed (full bible = Phase 3) |
| `CHARACTER_PROFILES_PREVIEW.md` | Cast seed (full = Phase 3) |
| `WORLD_OVERVIEW_PREVIEW.md` | World seed (full = Phase 2) |
| `PHASE_1_SUMMARY.md` | Approval summary |
