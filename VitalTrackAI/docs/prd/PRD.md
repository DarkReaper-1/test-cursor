# VitalTrack AI — Product Requirements Document

**Version:** 1.0  
**Status:** Approved for implementation planning  
**Platform:** iOS 17+ (iPhone primary; Apple Watch companion for heart rate)  
**Last updated:** 2026-07-25  

> **Medical disclaimer (product-wide):** VitalTrack AI is informational only and not medical advice. It is not a medical device for diagnosing, treating, curing, or preventing disease. Always consult a qualified healthcare professional for medical decisions.

---

## 1. Vision

VitalTrack AI helps people understand their cardiovascular trends with clarity and honesty. Users log blood pressure from **FDA-cleared external monitors**, measure **heart rate via PPG** (camera/flash or Apple Watch), and receive **non-diagnostic** insights that explain patterns—not prescriptions.

We win by being the app people **trust**: transparent about what we can and cannot measure, privacy-first by design, and free of dark patterns.

### Vision statement

> Make cardiovascular self-tracking trustworthy: accurate sources for blood pressure, honest heart-rate measurement, private by default, and insights that educate without pretending to be a doctor.

---

## 2. Problem

People who monitor heart health face a fragmented, often misleading landscape:

- Apps that imply a phone camera can measure blood pressure (it cannot reliably do so; we will never claim this).
- Scattered data across cuffs, HealthKit, PDFs, and paper logs.
- Opaque subscriptions and upsells that hide free capabilities.
- “AI health” products that overclaim diagnosis or treatment.

Users need a single, calm place to capture BP from real devices, measure HR honestly, chart trends, export for clinicians, and optionally sync—without selling their health data.

---

## 3. Goals

### 3.1 Business goals

| Goal | Target (12 months post-launch) |
|------|--------------------------------|
| Trust & retention | Day-30 retention ≥ 35% among users who log ≥ 3 BP readings in week 1 |
| Premium conversion | 4–8% of MAU convert to Premium without dark patterns |
| App Store rating | ≥ 4.7 with claim-related rejection rate of zero |
| Support load | < 5% of tickets about “why can’t camera measure BP” after onboarding v1 |

### 3.2 User goals

1. Log BP quickly from cuff, HealthKit, CSV, or manual entry.
2. Measure resting / session heart rate via PPG or Watch.
3. See trends (day/week/month) that are easy to explain to a clinician.
4. Receive educational insights that never diagnose.
5. Keep data private on-device with optional iCloud sync.
6. Understand free vs Premium before paying.

### 3.3 Product principles

1. **Source integrity** — Every BP reading has an explicit source; no camera BP.
2. **Honest measurement** — Camera/Watch labeled as heart rate (PPG) only.
3. **Informational only** — Disclaimer on AI, reports, and first-run experiences.
4. **Privacy first** — Encrypted local store; HealthKit where appropriate; no sale of health data.
5. **Clear value exchange** — Free tier is genuinely useful; Premium is additive, not hostage.
6. **Calm UX** — Clinical clarity over gamified panic.

---

## 4. Non-goals

VitalTrack AI will **not**:

1. Claim or attempt blood pressure measurement via camera, fingerprint, microphone, or accelerometer.
2. Diagnose hypertension, arrhythmia, or any condition.
3. Provide emergency response, ECG interpretation as a medical device, or medication dosing advice.
4. Replace FDA-cleared BP monitors or clinical care.
5. Require an account or cloud for core tracking.
6. Use dark-pattern subscriptions (forced trials, hidden cancel, fake urgency timers).
7. Sell or broker personally identifiable health data to advertisers or data brokers.
8. Support Android in v1 (future consideration).
9. Act as a telehealth or prescription platform.

---

## 5. Personas

### 5.1 “Careful Tracker” — Maya, 52

- Recently told BP is “borderline”; uses an Omron cuff at home.
- Wants simple logs and printable reports for her GP.
- Distrusts apps that overclaim; needs clear disclaimers.
- **Jobs:** Log BP twice daily, spot weekly patterns, share PDF.

### 5.2 “Quantified Self” — Jordan, 34

- Already in HealthKit / Apple Watch ecosystem.
- Wants HR sessions + imported BP + charts in one place.
- Curious about AI summaries but skeptical of diagnosis language.
- **Jobs:** Import HealthKit, correlate sleep/exercise with HR/BP trends.

### 5.3 “Caregiver Coordinator” — Priya, 48

- Helps aging parent manage cuff readings.
- Needs multi-device pairing, reminders, and CSV export.
- Values accessibility (Dynamic Type, VoiceOver).
- **Jobs:** Pair Bluetooth cuff, set reminders, export history.

### 5.4 “Privacy Maximalist” — Alex, 41

- Will not create accounts or enable iCloud.
- Needs offline-only mode with local encryption.
- **Jobs:** Manual + CSV entry, local PDF export, no cloud AI.

---

## 6. Success metrics

| Metric | Definition | Target |
|--------|------------|--------|
| Activation | Completes onboarding + first BP **or** first HR within 24h | ≥ 60% |
| BP source honesty | % of BP readings with non-null `sourceType` | 100% |
| Claim compliance | App Review / marketing claim audit failures | 0 |
| Insight safety | AI outputs failing safety classifier in prod | < 0.1% |
| Crash-free sessions | MetricKit / Firebase | ≥ 99.5% |
| Accessibility | VoiceOver critical path (log BP, measure HR) passes | 100% of release checklist |
| Subscription clarity | Support tickets “unexpected charge” | < 0.5% of Premium starts |
| Privacy | Confirmed zero health-data sale partners | Always |

---

## 7. Trust principles (non-negotiable)

### 7.1 Measurement honesty

| Signal | Allowed sources | Forbidden |
|--------|-----------------|-----------|
| Blood pressure | Manual, Bluetooth cuff (FDA-cleared), HealthKit import, CSV import | Camera, flash, fingerprint, mic, “AI estimate,” Watch BP claims |
| Heart rate | Camera PPG, Apple Watch / HealthKit HR | Presenting HR as BP or SpO₂ substitute without clear labeling |

Every BP UI must show source (e.g., “Bluetooth · Omron,” “Manual,” “HealthKit,” “CSV”).

### 7.2 Medical positioning

- Banner or footer on AI, Analytics, Reports: *“This is informational only and not medical advice.”*
- Never use words: diagnose, treat, cure, prescribe, detect hypertension as a clinical claim.
- Insights may say “your readings were often above your personal target” — not “you have hypertension.”

### 7.3 Subscription ethics

- Free tier permanently includes: manual BP, HR measurement, basic charts, local storage, CSV import/export, basic reminders.
- Premium clearly listed before purchase; restore purchases always visible.
- No paywall interrupting emergency-adjacent flows with fake urgency.
- Trial (if offered): length, price after trial, and cancel path stated in plain language on paywall.

### 7.4 Privacy

- Encrypted local database at rest (SQLCipher or equivalent).
- HealthKit authorization granular and explained.
- iCloud sync optional and off by default until user opts in.
- Optional cloud AI requires explicit consent; offline heuristics available without cloud.

---

## 8. Feature requirements

### 8.1 Onboarding

- Welcome + trust framing (what we measure / what we don’t).
- Explicit screen: **Camera measures heart rate only — not blood pressure.**
- HealthKit permission request with plain-language benefits.
- Optional notification permission for reminders.
- Optional profile: age range, units (mmHg), personal BP targets (user-set, not diagnostic).
- Medical disclaimer acknowledgment.

### 8.2 Heart rate (PPG)

- Camera + flash PPG session with guidance (finger placement, stillness).
- Duration options (e.g., 30s / 60s).
- Quality indicators (signal confidence); discard low-quality with explanation.
- Apple Watch / HealthKit HR import and display.
- History of HR sessions with timestamps and source.
- **Never** show BP estimate from PPG.

### 8.3 Blood pressure

- Manual entry: systolic, diastolic, optional pulse, arm, notes, tags.
- Bluetooth cuff via modular adapters (standard BP service 0x1810 + vendor adapters as needed).
- HealthKit import of BP samples.
- CSV import with column mapping and validation.
- Per-reading source badge and device name when known.
- Personal targets (user-defined); color cues are educational, not diagnosis.

### 8.4 Devices

- Discovery, pairing, forget device.
- Supported categories: BP cuff, weight scale (optional v1.1).
- Connection status, last sync, error recovery tips.
- Compatibility list in Help.

### 8.5 Dashboard

- Today’s latest BP and HR (with sources).
- Quick actions: Log BP, Measure HR, Ask AI (informational).
- Disclaimer strip.
- Empty states that teach correct BP sources.

### 8.6 Charts & analytics

- Time ranges: 24h / 7d / 30d / 90d / custom.
- BP (sys/dia), HR, optional weight, sleep, exercise overlays (where data exists).
- Filters by source and tags.
- Premium: advanced correlations and longer history retention UI (local data may still keep more).

### 8.7 History

- Unified timeline of readings and lifestyle logs.
- Edit / delete with confirmation.
- Search and filter.

### 8.8 Reports

- PDF / CSV export for clinician visits.
- Date range selection.
- Includes disclaimer and source legend.
- Premium: branded multi-section reports, scheduled email-to-self (optional, user-initiated).

### 8.9 AI insights (informational)

- Offline heuristic engine (defaults on).
- Optional cloud LLM with consent.
- Safety layer: never diagnose; refuse emergency/medical advice requests; cite user’s data patterns only.
- Examples: adherence nudges, variability explanations, questions to ask a clinician (not answers).

### 8.10 Notifications & reminders

- BP measurement reminders (user-scheduled).
- Medication reminders (user-entered schedule; not dosing advice).
- Insight digests (opt-in).
- Respect Focus / system notification settings.

### 8.11 Lifestyle companions (supporting, not primary)

- Mood, water, sleep, exercise logs — to contextualize trends, not clinical scoring.

### 8.12 Subscription

| Capability | Free | Premium |
|------------|------|---------|
| Manual BP + CSV/HealthKit import | ✓ | ✓ |
| Bluetooth cuff | ✓ (core adapters) | ✓ (+ priority device packs) |
| Camera / Watch HR | ✓ | ✓ |
| Basic charts (30d) | ✓ | ✓ |
| Advanced analytics / correlations | — | ✓ |
| AI cloud insights | — | ✓ (opt-in) |
| Offline heuristic insights | ✓ (limited) | ✓ (full) |
| PDF clinician report | Basic | Advanced |
| iCloud sync | Optional free (basic) | Optional + conflict resolution UI |
| Reminders | Basic | Multiple schedules / smart quiet hours |

Paywall must show comparison table; cancel via Apple Subscriptions settings with in-app link.

### 8.13 Privacy & settings

- Export all data / delete all data.
- Toggle iCloud, HealthKit, analytics (privacy-preserving, non-health if any).
- Biometric app lock (optional).
- Disclaimer & licenses.

### 8.14 Accessibility

- Dynamic Type, VoiceOver, Reduce Motion, sufficient contrast.
- Large tap targets on measurement flows.

---

## 9. Out of scope (v1)

- Android / web clinical dashboard
- Continuous BP estimation models
- ECG / AFib detection as a regulated feature
- Medication interaction checking
- Multi-user household profiles (single primary user; caregiver may use same device carefully)
- Social feeds or leaderboards
- In-app clinician chat
- Advertising SDK with health data access

---

## 10. Risks & mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| App Review rejection for medical claims | Launch delay | Central claim review checklist; marketing gated; screenshot captions audited |
| Users expect camera BP | Support / trust damage | Onboarding + empty states + FAQ + in-measure copy |
| BLE fragmentation across cuffs | Failed pairings | DeviceAdapter protocol; compatibility list; manual fallback always available |
| AI overclaim / hallucination | Safety / legal | Offline-first heuristics; safety classifier; refuse diagnosis; human-readable citations to user data only |
| Health data breach | Severe | Encryption at rest; minimal cloud; no sale; breach process in privacy policy |
| Subscription backlash | Reviews | Clear free tier; no dark patterns; easy restore/cancel |
| Regulatory misclassification | Business risk | Position as wellness tracker; BP from cleared external devices only; counsel review |

---

## 11. Release phases

### MVP (v1.0)

- Onboarding with trust screens  
- Manual BP, HealthKit BP import, CSV import  
- Camera PPG HR + HealthKit HR  
- Dashboard, history, basic charts  
- Basic PDF/CSV export  
- Offline heuristic insights  
- Settings, privacy controls, subscription scaffold (Premium soft-launch)  
- Disclaimer everywhere relevant  

### v1.1

- Expanded Bluetooth cuff adapters  
- Weight scale adapter  
- Advanced reports  
- Optional cloud AI insights  

### v1.2+

- Deeper Watch complications (HR only)  
- Caregiver export packs  
- Additional localization  

---

## 12. Dependencies

- Apple HealthKit, Core Bluetooth, AVFoundation (camera PPG)
- StoreKit 2 for subscriptions
- Optional CloudKit for iCloud sync
- Optional backend for LLM insights (consent-gated)
- Legal review of Privacy Policy & Terms before store submission

---

## 13. Open questions (tracked, not blocking PRD)

1. Exact Premium price points by region (Marketing + Finance).
2. Initial Bluetooth cuff SKU allowlist for launch marketing.
3. Whether medication reminders ship in MVP or v1.1 (lean: MVP basic reminders only).

---

## 14. Approval

| Role | Sign-off |
|------|----------|
| Product | Required |
| Engineering | Required |
| Design | Required |
| Legal / Compliance | Required before public marketing |
| Marketing | Required for store copy |

---

*End of PRD. Related: [USER_STORIES.md](USER_STORIES.md), [../design/INFORMATION_ARCHITECTURE.md](../design/INFORMATION_ARCHITECTURE.md).*
