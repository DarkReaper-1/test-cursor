# VitalTrack AI — Information Architecture

**Version:** 1.0  
**Platform:** iOS (SwiftUI)  
**Related:** [WIREFRAMES.md](WIREFRAMES.md), [UI_COMPONENT_LIBRARY.md](UI_COMPONENT_LIBRARY.md)

> Navigation and copy must reinforce: BP from FDA-cleared external monitors only; camera/Watch = heart rate (PPG) only; informational, not medical advice.

---

## 1. Mental model

Users think in four jobs:

1. **Capture** — Log BP (external sources) or measure HR (PPG/Watch).
2. **Understand** — Dashboard, charts, AI insights (educational).
3. **Connect** — Devices, HealthKit, optional iCloud.
4. **Control** — Privacy, subscription, reminders, export.

The tab bar maps to Capture/Understand first; Connect and Control live primarily under Devices and Settings.

---

## 2. High-level sitemap

```
App Launch
├── Splash
├── Onboarding (first launch only)
│   ├── Welcome
│   ├── What We Measure (trust)
│   ├── Disclaimer Acknowledgment
│   ├── HealthKit Explainer → System permission
│   ├── Personal Targets & Units
│   ├── Notifications Explainer → System permission
│   └── Ready / First Action
├── Main Tabs
│   ├── Dashboard (Home)
│   ├── Heart Rate
│   ├── Blood Pressure
│   ├── Analytics
│   └── More
│       ├── History
│       ├── Devices
│       ├── Reports
│       ├── AI Assistant
│       ├── Reminders
│       ├── Subscription
│       ├── Settings
│       │   ├── Profile & Goals
│       │   ├── Units & Display
│       │   ├── HealthKit
│       │   ├── iCloud Sync
│       │   ├── Privacy & Security
│       │   ├── Notifications
│       │   ├── Accessibility shortcuts
│       │   ├── Help & FAQ
│       │   ├── Privacy Policy
│       │   ├── Terms of Service
│       │   └── About / Licenses
│       ├── Help
│       └── FAQ
└── Modal / Sheets (global)
    ├── Manual BP Entry
    ├── CSV Import Wizard
    ├── HR Measurement Session
    ├── Device Pairing
    ├── Paywall
    ├── Export Share Sheet
    └── App Lock (auth gate)
```

---

## 3. Tab bar structure

| Tab | Symbol (SF) | Primary job | Notes |
|-----|-------------|-------------|-------|
| Dashboard | `house.fill` | Status + quick actions | Default landing after onboarding |
| Heart Rate | `heart.fill` | PPG measure + HR history | Labeled “Heart Rate” — never BP |
| Blood Pressure | `waveform.path.ecg` | Log/import BP + BP list | Source badges always visible |
| Analytics | `chart.xyaxis.line` | Charts & trends | Disclaimer footer |
| More | `ellipsis.circle` | Secondary destinations | History, Devices, AI, Settings, etc. |

**Tab rules**
- Five tabs maximum (HIG).
- Badges sparingly (e.g., disconnected preferred cuff — optional).
- Measuring HR or logging BP can be launched from Dashboard quick actions without changing IA.

---

## 4. Screen inventory

### 4.1 System / entry

| ID | Screen | Entry |
|----|--------|-------|
| S-00 | Splash | Cold start |
| S-01 | App Lock | Resume if enabled |

### 4.2 Onboarding

| ID | Screen |
|----|--------|
| O-01 | Welcome |
| O-02 | What We Measure (HR vs BP honesty) |
| O-03 | Medical Disclaimer |
| O-04 | HealthKit Explainer |
| O-05 | Units & Personal Targets |
| O-06 | Notifications Explainer |
| O-07 | You’re Ready |

### 4.3 Dashboard

| ID | Screen |
|----|--------|
| D-01 | Dashboard Home |

### 4.4 Heart Rate

| ID | Screen |
|----|--------|
| H-01 | Heart Rate Hub |
| H-02 | PPG Session |
| H-03 | PPG Result / Save |
| H-04 | HR Detail |
| H-05 | HR History (if not embedded) |

### 4.5 Blood Pressure

| ID | Screen |
|----|--------|
| B-01 | Blood Pressure Hub |
| B-02 | Manual Entry |
| B-03 | Bluetooth Capture |
| B-04 | HealthKit Import |
| B-05 | CSV Import Wizard |
| B-06 | BP Detail / Edit |

### 4.6 Analytics & History

| ID | Screen |
|----|--------|
| A-01 | Analytics |
| A-02 | Chart Detail / Fullscreen |
| Y-01 | History Timeline |
| Y-02 | History Filters |

### 4.7 Devices

| ID | Screen |
|----|--------|
| V-01 | Devices List |
| V-02 | Device Detail |
| V-03 | Pairing / Scan |
| V-04 | Compatibility List |

### 4.8 Reports & AI

| ID | Screen |
|----|--------|
| R-01 | Reports Home |
| R-02 | Report Builder |
| R-03 | Report Preview |
| I-01 | AI Assistant |
| I-02 | Insight Detail |
| I-03 | Cloud AI Consent |

### 4.9 Subscription, Help, Settings

| ID | Screen |
|----|--------|
| P-01 | Subscription / Paywall |
| K-01 | Help Center |
| K-02 | FAQ |
| K-03 | Article Detail |
| T-01 | Settings Root |
| T-02 | Profile & Goals |
| T-03 | HealthKit Settings |
| T-04 | iCloud Sync |
| T-05 | Privacy & Security |
| T-06 | Notifications & Reminders |
| T-07 | About |

### 4.10 Lifestyle (supporting)

| ID | Screen |
|----|--------|
| L-01 | Quick Log (mood / water / sleep / exercise) — sheet from Dashboard or History |

---

## 5. Navigation patterns

| Pattern | Use |
|---------|-----|
| TabView | Primary five destinations |
| NavigationStack per tab | Hierarchical push |
| Sheet | Manual BP, CSV wizard, PPG session, paywall, quick logs |
| Full-screen cover | Onboarding, App Lock, critical pairing when needed |
| Alert / confirmation dialog | Deletes, irreversible privacy actions |
| ShareLink / UIActivity | Exports |

**Back behavior:** Standard iOS interactive pop; measurement sheets confirm discard if in progress.

---

## 6. Deep links

Base URL scheme: `vitaltrack://`  
Universal links (prod): `https://links.vitaltrack.app/...` (optional)

| Deep link | Destination | Notes |
|-----------|-------------|-------|
| `vitaltrack://dashboard` | D-01 | |
| `vitaltrack://hr/measure` | H-02 | Opens PPG; labels HR only |
| `vitaltrack://bp/log` | B-02 | Manual entry sheet |
| `vitaltrack://bp/bluetooth` | B-03 | Requires paired device or routes to V-03 |
| `vitaltrack://bp/import/healthkit` | B-04 | |
| `vitaltrack://devices` | V-01 | |
| `vitaltrack://devices/pair` | V-03 | |
| `vitaltrack://analytics` | A-01 | |
| `vitaltrack://history` | Y-01 | |
| `vitaltrack://reports` | R-01 | |
| `vitaltrack://ai` | I-01 | |
| `vitaltrack://settings` | T-01 | |
| `vitaltrack://settings/privacy` | T-05 | |
| `vitaltrack://subscription` | P-01 | |
| `vitaltrack://help` | K-01 | |
| `vitaltrack://help/faq` | K-02 | |
| `vitaltrack://reminder/bp` | B-01 or B-02 | From notifications |

**Security:** Deep links never auto-exfiltrate data. App Lock, if enabled, gates content after cold start from link.

---

## 7. Settings hierarchy

```
Settings
├── Profile & Goals
│   ├── Display name (local)
│   ├── Birth year / age range (optional)
│   ├── Sex (optional, HealthKit-aligned)
│   ├── Personal BP targets (sys/dia) — “not a diagnosis”
│   └── Resting HR personal goal (optional)
├── Units & Display
│   ├── Pressure: mmHg | kPa
│   ├── Weight: lb | kg
│   ├── Temperature (future)
│   └── First day of week
├── HealthKit
│   ├── Connection status
│   ├── Types read / written
│   ├── Sync now
│   └── Open system Health access
├── Devices (shortcut to V-01)
├── iCloud Sync
│   ├── Enable / disable
│   ├── Last sync
│   └── Conflict help
├── Privacy & Security
│   ├── App Lock (Face ID / Touch ID)
│   ├── Export all data
│   ├── Delete all data
│   ├── Cloud AI consent
│   ├── Privacy Policy
│   └── Terms of Service
├── Notifications & Reminders
│   ├── System permission status
│   ├── BP reminders
│   ├── Medication reminders
│   └── Insight digest
├── Subscription
│   ├── Current plan
│   ├── Upgrade / Manage
│   └── Restore Purchases
├── Help & FAQ
├── About
│   ├── Version / build
│   ├── Acknowledgments
│   └── Licenses
└── Debug (DEBUG builds only)
```

---

## 8. Cross-links that reinforce trust

| From | To | Purpose |
|------|----|---------|
| Onboarding O-02 | FAQ “Can the camera measure BP?” | Education |
| BP Hub empty state | Devices + Manual + CSV + HealthKit | Correct sources |
| HR Hub | FAQ “PPG explained” | Expectation setting |
| AI Assistant header | Disclaimer + Privacy | Safety |
| Paywall | Free vs Premium table | No dark patterns |
| Every Analytics/Report | Disclaimer footer | Medical positioning |

---

## 9. Notification → screen mapping

| Notification type | Opens |
|-------------------|-------|
| BP reminder | `bp/log` or BP Hub with Log CTA |
| Medication reminder | Reminders detail / Quick complete sheet |
| Insight digest | AI Assistant |
| Sync error (rare) | iCloud Sync settings |

Copy must not say “measure your blood pressure with the camera.”

---

## 10. Localization & content keys (IA impact)

- All trust strings are centralized (`TrustCopy` / `L10n.Trust`).
- Measurement type names are not reused across BP and HR.
- FAQ articles are first-class routes for support macros.

---

## 11. Future IA (post-v1)

- Watch app tab mirror (HR glance + complication) — still HR only.
- Caregiver share packs as Reports subflow.
- Multi-profile only if legal/UX bar cleared (not v1).

---

*End of Information Architecture.*
