# NIGHTWIRE — Technical Architecture (Phase 1)

**Proposed engine:** Unreal Engine 5  
**Fallback checkpoint:** Unity (mobile-first) if device lab fails UE5 targets before Phase 4 content surge.

---

## 1. Goals

- Cinematic rendering with scalable quality tiers  
- Data-driven cases (designers author without engine recompiles where possible)  
- Clean modular gameplay systems  
- Save/load reliability  
- Asset streaming for semi-open districts  
- Single project → Windows / macOS / (Linux optional) / Android / iOS  

---

## 2. High-Level Diagram

```
┌─────────────────────────────────────────────┐
│                  Game Client                │
│  ┌─────────┐  ┌──────────┐  ┌────────────┐  │
│  │  UI/UMG │  │ Camera / │  │  Audio /   │  │
│  │  Views  │  │ Sequencer│  │  Music RPG │  │
│  └────┬────┘  └────┬─────┘  └─────┬──────┘  │
│       └────────────┼──────────────┘         │
│              ┌─────▼──────┐                 │
│              │ Game Mode  │                 │
│              │ Case Flow  │                 │
│              └─────┬──────┘                 │
│     ┌──────────────┼────────────────┐       │
│     ▼              ▼                ▼       │
│ Evidence     Dialogue/AI      World/Traffic │
│ Board/Kit    Memory           Streaming     │
│ Vision       Schedules        Weather/Time  │
│     └──────────────┬────────────────┘       │
│              ┌─────▼──────┐                 │
│              │ Save Graph │                 │
│              └────────────┘                 │
└─────────────────────────────────────────────┘
         Data: Case JSON/DataAssets
```

---

## 3. Module Breakdown

| Module | Responsibility |
|--------|----------------|
| `CaseRuntime` | Active case state, objectives, flags |
| `Evidence` | Kit, lab, photo metadata |
| `Board` | Graph nodes/links validation |
| `Vision` | Trace rendering & attention |
| `Dialogue` | Branching, present-evidence hooks |
| `NPC` | Schedules, memory, perception |
| `Stealth` | Detection, lockpick |
| `Hack` | Signal minigames |
| `Drive` | Vehicle pawn, chase directors |
| `WorldTime` | Day/night, weather, tip expiry |
| `Save` | Serialization of case + world |
| `Input` | KBM / gamepad / touch abstraction |
| `Scalability` | Quality tiers, device profiles |

---

## 4. Data-Driven Cases

Cases authored as data assets:
- Exhibits, hotspots, board truth graph + red herrings  
- Dialogue scripts with condition keys  
- Timeline cards  
- Unlock gates  

Allows narrative iteration without core code changes.

---

## 5. Save / Load

Serialize: case flags, inventory, board links, NPC memory hashes, world time, district unload state, ending axes.  
Versioned save schema with migration hooks.

---

## 6. Streaming & Perf

- Districts as streaming levels / world partitions  
- HLOD / nanite where platform allows; fallback meshes on mobile  
- Texture streaming budgets per tier  
- Rain: GPU particles mid+; simplified splash decals on low  

### Target frames (design)
| Tier | Device class | Target |
|------|--------------|--------|
| High | Desktop high | 60 fps 1080p+ |
| Mid | Desktop mid / high tablet | 40–60 fps |
| Mobile | Current-gen phones | 30 fps stable |

---

## 7. Input

Common action set: Move, Look, Interact, Vision, Camera, Board, Kit, Phone, Sprint, Crouch.  
Touch virtual sticks + radial; remappable.

---

## 8. Online (Optional Later)

No multiplayer in v1. Optional: cloud saves, analytics events (opt-in), crash reporter.

---

## 9. Pipeline & VCS

- Git LFS for large assets  
- Content validation CI (data lint for broken board links)  
- Automated smoke: boot → load slice → save/load  

---

## 10. Early Tech Spikes (before Phase 4 content)

1. UE5 mobile lighting path on 2 target phones  
2. Board UI performance with 80 nodes  
3. Rain + reflections cost  
4. Touch investigation UX prototype  

Spike results can amend engine choice without rewriting the GDD pillars.
