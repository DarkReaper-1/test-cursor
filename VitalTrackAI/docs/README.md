# VitalTrack AI — Documentation Index

**VitalTrack AI** is a trust-first iOS cardiovascular tracking app. Blood pressure comes **only** from FDA-cleared external monitors (manual entry, Bluetooth cuff, HealthKit import, or CSV). Camera, flash, and Apple Watch measure **heart rate (PPG) only** — never blood pressure.

> **This is informational only and not medical advice.**

---

## Critical product rules

These rules apply across product, design, engineering, legal, and marketing:

1. **Never** claim camera/fingerprint can measure blood pressure.
2. **BP sources only:** manual entry, Bluetooth cuff, HealthKit import, CSV import — from FDA-cleared external monitors.
3. **Camera / flash / Apple Watch = heart rate (PPG) only.**
4. Always surface: *“This is informational only and not medical advice.”*
5. No dark-pattern subscriptions; clear free vs premium.
6. Privacy-first: HealthKit, encrypted local database, optional iCloud.

---

## Product

| Document | Description |
|----------|-------------|
| [prd/PRD.md](prd/PRD.md) | Product requirements: vision, goals, personas, features, trust, subscription, risks |
| [prd/USER_STORIES.md](prd/USER_STORIES.md) | User stories by epic with acceptance criteria |

## Design

| Document | Description |
|----------|-------------|
| [design/INFORMATION_ARCHITECTURE.md](design/INFORMATION_ARCHITECTURE.md) | Navigation, screen inventory, deep links, settings hierarchy |
| [design/NAVIGATION_FLOW.md](design/NAVIGATION_FLOW.md) | Launch, onboarding, tabs, deep links, sheets |
| [design/WIREFRAMES.md](design/WIREFRAMES.md) | Text wireframes for every primary screen |
| [design/UI_COMPONENT_LIBRARY.md](design/UI_COMPONENT_LIBRARY.md) | Design tokens, components, accessibility, dark mode |

## Architecture

| Document | Description |
|----------|-------------|
| [architecture/DATABASE_SCHEMA.md](architecture/DATABASE_SCHEMA.md) | Core Data / SQLite schema, indexes, encryption, migrations |
| [architecture/SWIFT_PROJECT_ARCHITECTURE.md](architecture/SWIFT_PROJECT_ARCHITECTURE.md) | Clean Architecture + MVVM + DI, modules, folder structure |
| [architecture/FOLDER_STRUCTURE.md](architecture/FOLDER_STRUCTURE.md) | Complete repository / package tree |
| [architecture/API_SPECIFICATIONS.md](architecture/API_SPECIFICATIONS.md) | Local + optional cloud REST/JSON specs (offline-first) |
| [architecture/BLUETOOTH_INTEGRATION.md](architecture/BLUETOOTH_INTEGRATION.md) | BLE for BP cuffs & scales, GATT, DeviceAdapter |
| [architecture/AI_ASSISTANT.md](architecture/AI_ASSISTANT.md) | Insight pipeline, safety rules, offline heuristics + optional LLM |
| [architecture/HEALTHKIT_INTEGRATION.md](architecture/HEALTHKIT_INTEGRATION.md) | Types, read/write, observers, Watch HR, permission UX |
| [architecture/ERROR_HANDLING.md](architecture/ERROR_HANDLING.md) | Error catalog with actionable recovery |

## Testing

| Document | Description |
|----------|-------------|
| [testing/TESTING_PLAN.md](testing/TESTING_PLAN.md) | Unit, UI, integration, mocks, AI validation, a11y |

## Legal

| Document | Description |
|----------|-------------|
| [legal/PRIVACY_POLICY.md](legal/PRIVACY_POLICY.md) | Draft privacy policy (GDPR-ready, HIPAA-conscious) |
| [legal/TERMS_OF_SERVICE.md](legal/TERMS_OF_SERVICE.md) | Draft terms with medical disclaimer |

## Marketing

| Document | Description |
|----------|-------------|
| [marketing/APP_STORE_DESCRIPTION.md](marketing/APP_STORE_DESCRIPTION.md) | App Store listing — no misleading BP claims |
| [marketing/MARKETING_COPY.md](marketing/MARKETING_COPY.md) | Website & social copy that builds trust |

---

## Suggested reading order

1. [PRD](prd/PRD.md) → product intent and non-goals  
2. [User Stories](prd/USER_STORIES.md) → acceptance criteria  
3. [Information Architecture](design/INFORMATION_ARCHITECTURE.md) → navigation  
4. [Swift Project Architecture](architecture/SWIFT_PROJECT_ARCHITECTURE.md) → engineering shape  
5. Feature-specific architecture (HealthKit, Bluetooth, AI, Database)  
6. [Testing Plan](testing/TESTING_PLAN.md)  
7. Legal & marketing before release  

---

## Document ownership

| Area | Primary owner |
|------|----------------|
| Product / PRD / Stories | Product |
| Design / IA / Wireframes / UI | Design |
| Architecture / Schema / APIs | Engineering |
| Testing | Engineering + QA |
| Legal | Legal counsel (drafts for review) |
| Marketing | Marketing + Product (claim review) |

*Draft legal and marketing copy must be reviewed by counsel before publication.*
