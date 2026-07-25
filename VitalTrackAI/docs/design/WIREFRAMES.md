# VitalTrack AI — Wireframes (Text)

**Version:** 1.0  
**Format:** Structured ASCII / markdown regions  
**Related:** [INFORMATION_ARCHITECTURE.md](INFORMATION_ARCHITECTURE.md), [UI_COMPONENT_LIBRARY.md](UI_COMPONENT_LIBRARY.md)

Design notes: teal/health aesthetic, calm clinical clarity. No purple-on-white AI clichés. Always reinforce measurement honesty and the medical disclaimer where relevant.

---

## Global chrome

```
┌─ Safe area ─────────────────────────────────────┐
│ [Nav title]                    [trailing action] │
│─────────────────────────────────────────────────│
│                                                 │
│                 CONTENT REGION                  │
│                                                 │
│─────────────────────────────────────────────────│
│ VTDisclaimerBanner (where required)             │
│─────────────────────────────────────────────────│
│  Home  │  HR  │  BP  │  Charts  │  More         │
└─────────────────────────────────────────────────┘
```

**VTDisclaimerBanner (compact):** “Informational only — not medical advice.”

---

## S-00 Splash

```
┌─────────────────────────────────────┐
│                                     │
│         [VitalTrack mark]           │
│          VitalTrack AI              │
│     Cardiovascular tracking         │
│                                     │
│         ○ progress (subtle)         │
│                                     │
│  Privacy-first · On-device first    │
└─────────────────────────────────────┘
```

| Region | Content |
|--------|---------|
| Center | Logo + wordmark (brand hero) |
| Footer | Short trust line |
| CTA | None (auto-advance ≤ 1.5s) |
| Empty/Error | If DB migrate fails → blocking error with Retry / Contact Support |

---

## Onboarding

### O-01 Welcome

```
┌─────────────────────────────────────┐
│                              Skip?  │  ← Skip only to disclaimer (cannot skip disclaimer)
│                                     │
│         VitalTrack AI               │
│   Track BP from real monitors.      │
│   Measure heart rate with PPG.      │
│                                     │
│   [Full-bleed calm health visual]   │
│                                     │
│        [ Get Started ]              │
└─────────────────────────────────────┘
```

**Primary CTA:** Get Started  
**Empty/Error:** N/A  

### O-02 What We Measure (trust)

```
┌─────────────────────────────────────┐
│ What VitalTrack measures            │
│                                     │
│ ┌ Blood Pressure ─────────────────┐ │
│ │ From FDA-cleared external       │ │
│ │ monitors: Manual · Bluetooth    │ │
│ │ cuff · HealthKit · CSV          │ │
│ └─────────────────────────────────┘ │
│ ┌ Heart Rate ─────────────────────┐ │
│ │ Camera/flash PPG or Apple Watch │ │
│ │ Heart rate only — NOT blood     │ │
│ │ pressure.                       │ │
│ └─────────────────────────────────┘ │
│                                     │
│        [ Continue ]                 │
└─────────────────────────────────────┘
```

**Primary CTA:** Continue  
**Must include:** Explicit “NOT blood pressure” for camera/Watch  

### O-03 Medical Disclaimer

```
┌─────────────────────────────────────┐
│ Please read                         │
│                                     │
│ This app is informational only and  │
│ not medical advice. It does not     │
│ diagnose, treat, or prevent disease.│
│ BP values come from external        │
│ monitors you use or import.         │
│                                     │
│ ☐ I understand and agree            │
│                                     │
│        [ Continue ] (disabled until)│
└─────────────────────────────────────┘
```

**Primary CTA:** Continue (enabled after acknowledgment)  
**Error:** Attempt Continue without check → shake/highlight checkbox  

### O-04 HealthKit Explainer

```
┌─────────────────────────────────────┐
│ Connect Apple Health                │
│                                     │
│ We can import blood pressure and    │
│ heart rate you’ve already recorded. │
│ You choose what to share.           │
│                                     │
│ Reads: BP, HR, (optional sleep…)    │
│ Writes: BP/HR you log in-app (opt)  │
│                                     │
│ [ Enable HealthKit ]  [ Not Now ]   │
└─────────────────────────────────────┘
```

**Primary CTA:** Enable HealthKit  
**Secondary:** Not Now  

### O-05 Units & Personal Targets

```
┌─────────────────────────────────────┐
│ Your preferences                    │
│ Pressure unit   ( mmHg ▼ )          │
│                                     │
│ Personal BP targets                 │
│ (goals you set — not a diagnosis)   │
│ Systolic   [ 120 ]                  │
│ Diastolic  [  80 ]                  │
│                                     │
│        [ Continue ]                 │
└─────────────────────────────────────┘
```

### O-06 Notifications Explainer

```
┌─────────────────────────────────────┐
│ Reminders (optional)                │
│ BP check reminders help consistency.│
│ Medication reminders use schedules  │
│ you enter — not dosing advice.      │
│                                     │
│ [ Enable Notifications ] [ Not Now ]│
└─────────────────────────────────────┘
```

### O-07 You’re Ready

```
┌─────────────────────────────────────┐
│ You’re ready                        │
│ Log BP from your cuff, or measure   │
│ heart rate with the camera.         │
│                                     │
│ [ Log blood pressure ]              │
│ [ Measure heart rate ]              │
│ [ Go to Dashboard ]                 │
└─────────────────────────────────────┘
```

---

## D-01 Dashboard

```
┌─────────────────────────────────────┐
│ Good morning                        │
│ VitalTrack AI                       │
│─────────────────────────────────────│
│ Latest BP                           │
│ 128 / 82  mmHg                      │
│ Source: Bluetooth · Omron · 7:12a   │
│                                     │
│ Latest HR                           │
│ 72 bpm · Camera PPG · Yesterday     │
│─────────────────────────────────────│
│ [ Log BP ]     [ Measure HR ]       │
│─────────────────────────────────────│
│ Today’s insight (heuristic)         │
│ “3 of 4 morning readings were near  │
│ your personal target this week.”    │
│ Informational only — not medical…   │
│─────────────────────────────────────│
│ VTDisclaimerBanner                  │
└─────────────────────────────────────┘
```

| State | UI |
|-------|----|
| Empty | Illustration + “Add BP from a cuff (manual, Bluetooth, HealthKit, or CSV). Camera measures heart rate only.” CTAs: Log BP / Measure HR |
| Error | Inline banner if HealthKit sync failed — Retry |
| Primary CTAs | Log BP, Measure HR |

---

## Heart Rate

### H-01 Heart Rate Hub

```
┌─────────────────────────────────────┐
│ Heart Rate                          │
│ Camera PPG or Apple Watch — not BP  │
│─────────────────────────────────────│
│ [ Measure with Camera ]             │
│ [ Import from Health ]              │
│─────────────────────────────────────│
│ Recent                              │
│ 72 bpm  Camera   Today 8:01a        │
│ 68 bpm  Watch    Yesterday          │
│ …                                   │
└─────────────────────────────────────┘
```

**Empty:** “No heart rate yet. Measure with the camera or connect Health.”  
**Error:** Camera unavailable → Open Settings  

### H-02 PPG Session

```
┌─────────────────────────────────────┐
│ Measuring heart rate          [X]   │
│ Cover the rear camera gently.       │
│ Keep still. Flash may turn on.      │
│                                     │
│         ┌───────────┐               │
│         │  live BPM │               │
│         │    74     │               │
│         └───────────┘               │
│ Signal ████████░░ Good              │
│ ⏱ 0:18 / 0:30                       │
│                                     │
│ Informational only — not medical…   │
└─────────────────────────────────────┘
```

**Primary CTA:** none during run; Cancel (X)  
**Error:** Low signal → “Adjust finger” coaching; timeout → Retake  

### H-03 PPG Result

```
┌─────────────────────────────────────┐
│ Result                              │
│ 72 bpm                              │
│ Confidence: High · 30s · Camera PPG │
│ Notes [ optional ]                  │
│ [ Save ]            [ Retake ]      │
│ Disclaimer                          │
└─────────────────────────────────────┘
```

### H-04 HR Detail

```
┌─────────────────────────────────────┐
│ 72 bpm                         [···]│
│ Mar 12, 2026 · 8:01 AM              │
│ Source: Camera PPG                  │
│ Confidence: High · Duration 30s     │
│ Notes: —                            │
│ [ Delete ]                          │
└─────────────────────────────────────┘
```

---

## Blood Pressure

### B-01 Blood Pressure Hub

```
┌─────────────────────────────────────┐
│ Blood Pressure                      │
│ From FDA-cleared external monitors  │
│─────────────────────────────────────│
│ [ Manual ] [ Bluetooth ]            │
│ [ HealthKit ] [ CSV ]               │
│─────────────────────────────────────│
│ Recent                              │
│ 128/82  BT·Omron   Today            │
│ 130/84  Manual     Yesterday        │
└─────────────────────────────────────┘
```

**Empty:** Explain four allowed sources; **never** suggest camera for BP.  
**Primary CTAs:** Manual / Bluetooth / HealthKit / CSV  

### B-02 Manual Entry

```
┌─────────────────────────────────────┐
│ Log blood pressure            [X]   │
│ Systolic   [ 128 ]                  │
│ Diastolic  [  82 ]                  │
│ Pulse      [  70 ] optional         │
│ When       [ Now ▼ ]                │
│ Arm        [ Left ▼ ]               │
│ Notes      [ … ]                    │
│ Source will be saved as Manual      │
│ [ Save reading ]                    │
│ Disclaimer                          │
└─────────────────────────────────────┘
```

**Error:** Dia ≥ Sys → inline validation; out-of-range → warning confirm  

### B-03 Bluetooth Capture

```
┌─────────────────────────────────────┐
│ Bluetooth cuff                      │
│ Device: Omron · Connected ●         │
│ Take a reading on your cuff.        │
│ Waiting for measurement…            │
│                                     │
│ [ Retry connection ]                │
│ [ Enter manually instead ]          │
└─────────────────────────────────────┘
```

**Error states:** Powered off / Unauthorized / Disconnect — see Error Handling  
**Success:** Preview sys/dia → Save  

### B-04 HealthKit Import

```
┌─────────────────────────────────────┐
│ Import from Health                  │
│ Last import: 2h ago                 │
│ [ Import new readings ]             │
│ Results: 12 added · 2 duplicates    │
└─────────────────────────────────────┘
```

### B-05 CSV Import Wizard

```
Step 1 Pick file → Step 2 Map columns → Step 3 Validate → Step 4 Confirm
┌─────────────────────────────────────┐
│ Map columns                         │
│ Date     → [ timestamp ▼ ]          │
│ Systolic → [ sys ▼ ]                │
│ Diastolic→ [ dia ▼ ]                │
│ [ Continue ]                        │
└─────────────────────────────────────┘
```

**Error:** Bad rows listed with Skip / Cancel import  

### B-06 BP Detail / Edit

```
┌─────────────────────────────────────┐
│ 128 / 82 mmHg                  Edit │
│ Source: Bluetooth · Omron           │
│ vs personal target: near goal       │
│ (not a diagnosis)                   │
│ Notes / tags                        │
│ [ Delete ]                          │
│ Disclaimer                          │
└─────────────────────────────────────┘
```

---

## A-01 Analytics

```
┌─────────────────────────────────────┐
│ Analytics                [7D▼] [⚙]  │
│─────────────────────────────────────│
│ Blood pressure                      │
│ [===== sys/dia chart =====]         │
│ Avg 126/81 · Source mix legend      │
│─────────────────────────────────────│
│ Heart rate                          │
│ [===== hr chart =====]              │
│─────────────────────────────────────│
│ Disclaimer footer                   │
└─────────────────────────────────────┘
```

**Empty:** “Log a few readings to see trends. BP from external monitors; HR from PPG/Watch.”  
**Error:** Chart render fail → Retry  
**Primary CTA:** Adjust range / Log reading  

### A-02 Chart Detail

Fullscreen chart, scrubber, VoiceOver summary button, share as image (Premium optional).

---

## Y-01 History

```
┌─────────────────────────────────────┐
│ History                    [Filter] │
│ Today                               │
│ · BP 128/82 BT                      │
│ · HR 72 Camera                      │
│ Yesterday                           │
│ · BP 130/84 Manual                  │
│ · Mood Good · Water 6 cups          │
└─────────────────────────────────────┘
```

**Empty:** Prompt first log  
**Filter sheet:** type, source, date range  

---

## Devices

### V-01 Devices List

```
┌─────────────────────────────────────┐
│ Devices                  [+ Pair]   │
│ Omron BP    Connected ●   Last 7:12 │
│ Scale       Not paired              │
│─────────────────────────────────────│
│ Compatible monitors only. Phone     │
│ camera cannot measure blood pressure│
└─────────────────────────────────────┘
```

### V-02 Device Detail

Name, model, transport, last reading, Forget device, Troubleshooting  

### V-03 Pairing / Scan

```
┌─────────────────────────────────────┐
│ Pair device                         │
│ Scanning…                           │
│ · Omron XXXX                        │
│ · Unknown device (may be unsupported)│
│ [ Cancel ]                          │
└─────────────────────────────────────┘
```

**Error:** BT permission → Open Settings; timeout → Manual entry CTA  

### V-04 Compatibility List

Searchable list + “Use Manual / CSV / HealthKit if unsupported.”  

---

## Reports

### R-01 Reports Home

```
┌─────────────────────────────────────┐
│ Reports                             │
│ [ Export CSV ]   Free               │
│ [ PDF summary ]  Free basic         │
│ [ Advanced PDF ] Premium            │
│ Includes source legend + disclaimer │
└─────────────────────────────────────┘
```

### R-02 Report Builder

Date range, metrics toggles (BP, HR, lifestyle), include personal targets yes/no  

### R-03 Report Preview

PDF preview, Share, Save to Files  
**Footer on PDF:** Informational only — not medical advice; BP from external monitors  

---

## AI Assistant

### I-01 AI Assistant

```
┌─────────────────────────────────────┐
│ Insights                            │
│ Offline heuristics · On             │
│ Cloud AI · Off (Premium + consent)  │
│─────────────────────────────────────│
│ Conversation / cards                │
│ “Your evening readings varied more  │
│ than mornings this week…”           │
│ Sources: 14 BP readings (Manual/BT) │
│─────────────────────────────────────│
│ [ Ask about my trends… ]            │
│ VTDisclaimerBanner                  │
└─────────────────────────────────────┘
```

**Empty:** Need N readings  
**Error / Safety refusal:** “I can’t diagnose. Please consult a clinician. If urgent symptoms, contact emergency services.”  
**Primary CTA:** Generate insight / Ask  

### I-02 Insight Detail

Full text, citations, timestamp, Delete, Share (with disclaimer appended)  

### I-03 Cloud AI Consent

What is sent, retention, revoke path, Premium requirement, decline = stay offline  

---

## P-01 Subscription / Paywall

```
┌─────────────────────────────────────┐
│ VitalTrack Premium                  │
│─────────────────────────────────────│
│ Comparison                          │
│ Feature        Free    Premium      │
│ Manual/BT/HK/CSV BP  ✓      ✓       │
│ Camera HR            ✓      ✓       │
│ Basic charts         ✓      ✓       │
│ Advanced analytics   —      ✓       │
│ Cloud AI insights    —      ✓       │
│ Advanced PDF         —      ✓       │
│─────────────────────────────────────│
│ $X.XX/mo · $Y.YY/yr                 │
│ [ Start Premium ]                   │
│ [ Restore Purchases ]               │
│ Cancel anytime in Apple Subscriptions│
│ No dark patterns · data stays yours │
└─────────────────────────────────────┘
```

**Error:** Purchase fail → Try again / Restore  
**Dismiss:** Always available (X) — core tracking remains free  

---

## Settings & Privacy

### T-01 Settings Root

Grouped list per IA hierarchy (Profile, Units, HealthKit, iCloud, Privacy, Notifications, Subscription, Help, About).

### T-05 Privacy & Security

```
┌─────────────────────────────────────┐
│ Privacy & Security                  │
│ App Lock              [ Face ID ]   │
│ Export all data       ›             │
│ Delete all data       ›             │
│ Cloud AI consent      [ Off ]       │
│ Privacy Policy        ›             │
│ Terms of Service      ›             │
│ We do not sell health data.         │
└─────────────────────────────────────┘
```

**Delete flow:** Type DELETE → confirm → progress → done  

### T-04 iCloud Sync

Toggle, last sync, conflict help, “Optional — app works fully offline.”  

---

## Help & FAQ

### K-01 Help Center

Search + categories: Blood Pressure Sources, Heart Rate PPG, Devices, Privacy, Subscription, Troubleshooting  

### K-02 FAQ (key entries must include)

1. Can the camera measure blood pressure? → **No.** Camera measures heart rate (PPG) only. BP requires an external FDA-cleared monitor.  
2. Is this medical advice? → **No.** Informational only.  
3. What is free vs Premium? → Clear table.  
4. Is my data sold? → **No.**  

### K-03 Article Detail

Title, body, related links, Still need help?  

---

## Lifestyle quick log (L-01 sheet)

```
┌─────────────────────────────────────┐
│ Quick log                     [X]   │
│ Mood  ☺ 😐 ☹                        │
│ Water [ +1 cup ]                    │
│ Sleep [ hours ]                     │
│ Exercise [ type · minutes ]         │
│ [ Save ]                            │
└─────────────────────────────────────┘
```

---

## Component placement checklist (all screens)

| Screen | Disclaimer | Source honesty |
|--------|------------|----------------|
| Splash | Soft tagline | — |
| Onboarding trust/disclaimer | Required | Required |
| Dashboard | Banner | Source on metrics |
| HR flows | Banner | “Not BP” label |
| BP flows | Banner | Source badges |
| Analytics / Reports / AI | Banner / PDF footer | Legend |
| Paywall | Trust line | Free includes real BP logging |
| FAQ | Explicit camera BP denial | — |

---

*End of wireframes.*
