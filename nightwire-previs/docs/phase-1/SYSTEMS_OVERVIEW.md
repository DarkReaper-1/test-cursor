# NIGHTWIRE — Gameplay Systems Overview (Phase 1)

Companion to the GDD. Spec level: design-complete enough to schedule; implementation details lock in Phase 4+.

---

## 1. Evidence Pipeline

```
World Prop → Interact → (Vision optional) → Photograph / Collect / Sample
  → Case Kit entry → Optional Lab Analyze → Board Node available
  → Link / Present / Timeline slot
```

### Evidence types
| Type | Player actions | Output |
|------|----------------|--------|
| Physical | Collect, photo | Exhibit ID |
| Document | Read, photo, compare | Transcript + keywords |
| Trace | Vision required often | Footprint cast, fiber |
| Bio | Swab (DNA/blood) | Lab report delay (diegetic hours) |
| Photo | Evidence Cam | Timestamped image |
| Device | Hack / dump | Logs, contacts, ghost channel ID |

**Rule:** Every main-path exhibit changes at least one of: board topology, dialogue option, map pin, timeline constraint, or ending flag.

---

## 2. Detective Vision

- Toggle with cooldown/battery (tiered by platform).  
- Reveals: footprints, fingerprints, blood, hidden compartments, wire conduits, disturbed dust.  
- Restricted zones: vision use raises **Attention** if guards/NPCs have line of sight.  
- Does **not** auto-solve puzzles; it reveals interactables.

---

## 3. Evidence Board

### Nodes
Clue · Suspect · Location · Event · Faction

### Links
Player-drawn. Server/logic validates against a hidden truth graph + red-herring graph.
- **Confirmed link:** unlocks lead  
- **Plausible wrong link:** consumes time / tips subject  
- **Impossible link:** soft reject with diegetic reason  

### Tabs
Links · Timeline · Motives · Relationships

### Case Temperature
Internal 0–100 derived from open leads, heat, and time pressure; drives music and some NPC schedules.

---

## 4. Notebook

Auto sections: Objectives · Witness Notes · Crime Reports · Theories (player) · Unlocked Codes.  
Never auto-spoiler the killer; theories are player-authored pins.

---

## 5. Dialogue & Interrogation

### Axes
Empathy · Pressure · Bluff · Evidence Present

### Memory
NPCs remember prior choices (Phase 6 expands). Contradictions unlock when timeline + exhibits disagree with testimony.

### Fail states
Soft fail: witness shuts down for a time block. Hard fail (rare): chapter-critical witness leaves city unless recovered via alternate lead.

---

## 6. Surveillance & Tailing

### On foot
Distance band + LOS + disguise/environment cover. Heat meter.

### Vehicle
Stay in trail camera cone; traffic density; rain reduces NPC perception slightly, increases player driving difficulty.

Break = lose lead; optional radio tip to recover once per chapter.

---

## 7. Stealth & Infiltration

Detection = sight + noise. Lockers/doors use lockpick tension minigame. Cameras optional in later chapters. Non-lethal preference; alarms call patrols on timers.

---

## 8. Hacking / Signal Trace

Period-flavored “Nightwire nodes”: frequency hops, pager XOR puzzles, cable patching. Success yields device evidence or opens doors. Failure can ping syndicate heat.

---

## 9. Driving

Semi-open district roads; no full traffic sim at slice. Destination markers for case pins. Garage/safehouse snapshots. Chase sequences are authored corridors with light branching.

---

## 10. Timeline Reconstruction

Place event cards on a clock rail. Contradictions highlight. Solving unlocks “what really happened” board state without naming the culprit automatically.

---

## 11. Lab Analysis

Diegetic delay (skipable on Story difficulty). Results appear as reports in Notebook + Board.

---

## 12. Phone / Pager

Contacts, missed calls, tip line, chapter-critical rings. Some messages expire at dawn.

---

## 13. Save System

- Auto-save on chapter beats + district transitions  
- Manual save slots (3–10 by platform)  
- Cloud save where store supports  

---

## 14. Mobile Adaptations

| System | Mobile change |
|--------|---------------|
| Vision | Shorter battery, larger highlight |
| Board | Chapter-filtered nodes; pinch zoom |
| Driving | Auto-assist steer option |
| Lockpick | Snap assist on Story |
| UI | Radial quick actions |

---

## 15. Out of Scope for v1 Systems

Full police career mode · multiplayer · user-generated cases · photoreal facial mocap for all NPCs (hero cast prioritized).
