# VitalTrack — Product Requirements Document

## 1. Problem

Reviews of existing blood-pressure/heart-rate tracking apps cluster around
five complaints: misleading "measure your blood pressure with your camera"
claims, cluttered/confusing UI, forced accounts, deceptive subscriptions
(hidden trials, unclear cancellation), and manual-entry friction (no way
to import from a real cuff, no CSV/Health import). VitalTrack is scoped
directly against that list.

## 2. Core philosophy

1. **Never mislead users.** If the iPhone cannot measure something, the
   app says so — in onboarding, in the FAQ, in store copy, on first launch.
2. **Build trust before features.** Every feature ships with the honest
   version of its copy, not the more exciting version.
3. **Feel like an Apple-designed health app.** HIG-first, minimal, native
   components over custom chrome.

## 3. Non-negotiable claims

VitalTrack never says, in any surface (in-app, App Store, marketing):
- "Measure blood pressure using your camera"
- "Instant blood pressure scan"
- "Use your finger to measure BP"

It always says, on onboarding, first launch, the FAQ, and in store copy:
> "This app tracks blood pressure readings that you obtain from an
> FDA-cleared blood pressure monitor."

## 4. Scope of this build

| Area | Status in this pass |
|---|---|
| Heart rate (camera PPG) | Implemented — `PPGProcessor`, `CameraPPGCaptureService` |
| Heart rate (Apple Watch) | Not implemented — requires a separate watchOS target; see §9 Roadmap |
| Blood pressure: manual entry | Implemented — `BloodPressureLogView` |
| Blood pressure: Bluetooth cuff | Implemented — standard BLE Blood Pressure Service (0x1810) client |
| Blood pressure: Apple Health import | Implemented (read path) — `HealthKitManager.readBloodPressureHistory` |
| Blood pressure: CSV import | Implemented — `BloodPressureLogViewModel.importCsv` |
| Blood pressure: proprietary cuff SDKs | Not implemented — the standard GATT profile covers the majority of BLE-certified cuffs without per-vendor SDKs; see §9 |
| Analytics (averages/trends) | Implemented — `AnalyticsViewModel`, week/month/year systolic averages |
| Charts | Implemented — Swift Charts, 7d/30d/90d/1y ranges |
| Smart Insights ("AI Assistant") | Implemented as rule-based, on-device statistics — see §6 |
| Reminders | Implemented — local notifications, 7 reminder kinds, user-set times |
| Reminders: adaptive scheduling | Not implemented as a black-box heuristic — see §6 |
| Export (CSV, PDF summary, PDF doctor report) | Implemented — `ExportManager` |
| HealthKit sync (write) | Implemented, opt-in, off by default |
| iCloud sync | Architected (`NSPersistentCloudKitContainer` toggle), off by default |
| Subscription | UI + honest copy implemented; StoreKit 2 purchase flow stubbed pending App Store Connect product IDs |
| Widgets / Live Activities / Watch companion | Not implemented as Xcode targets in this pass — see §9 |
| Dashboard cards beyond HR/BP/weekly trend (medication, water, sleep, exercise, goals, mood, stress) | Not implemented — see §6 |

## 5. Users

- **Primary:** adults 40+ managing hypertension or a cardiac condition,
  tracking readings for themselves or a doctor.
- **Secondary:** general wellness users curious about resting heart rate
  and HRV trends.
- **Tertiary:** caregivers logging readings for a family member (out of
  scope for this pass — would need a profile-switcher, not an account
  system; see §9).

## 6. Deliberate deviations from the brief, and why

The originating brief asked for several things that would work against
the app's own "never mislead users" principle if built literally:

- **"AI Assistant" → Smart Insights.** What's shipped is rule-based
  statistics over your own logged data (trend deltas, consistency checks,
  reference-range lookups), computed on-device. It is not a generative
  model and doesn't call a cloud AI service. The in-app copy says "Smart
  Insights" and explains how the numbers were produced; "VitalTrack AI" is
  a product name, not a claim about the mechanism. A real conversational
  assistant is a distinct, larger feature (cloud LLM dependency, cost
  controls, a privacy review of what health context gets sent) and belongs
  on the roadmap, not silently implied by this build.
- **"Adaptive scheduling using user behavior" → fixed, user-set reminder
  times.** Silently retiming a user's reminders based on inferred behavior
  is an opaque "smart" feature; it's excluded here in favor of a future
  explicit version ("suggest a better time based on when you usually
  respond") that the user approves rather than one that acts on their
  behalf.
- **Dashboard cards (medication, water, sleep, exercise, goals, mood,
  stress) → not shipped as placeholder widgets.** Each of those is a real
  tracker in its own right; a half-built version of each would be worse
  than the smaller, fully-working dashboard shipped here (heart rate,
  blood pressure, weekly trend). `DashboardCard`-style extensibility is
  designed for, not faked.

## 7. Success metrics (proposed)

- % of App Store reviews mentioning "clear about limitations" / "honest"
  (qualitative, via review monitoring)
- Bluetooth cuff pairing success rate
- 7/30-day logging retention (both heart rate and blood pressure)
- Subscription cancellation flow: zero support tickets about "can't find
  how to cancel"

## 8. Out of scope for v1

- Diagnosis, risk scoring, or any medical-certainty language
- Multi-user / family accounts
- Server-side anything (there is no VitalTrack backend)

## 9. Roadmap (architected, not built in this pass)

- **Apple Watch companion**: a separate watchOS app target reading
  `HKQuantityTypeIdentifier.heartRate` live and pushing readings into the
  same `HealthRepository` via App Group-shared Core Data or WatchConnectivity.
- **Widgets / Lock Screen widgets**: a WidgetKit extension target showing
  latest HR/BP via a shared `HealthRepository` (App Group container).
- **Live Activities**: for an in-progress heart rate measurement, showing
  live signal quality on the Lock Screen.
- **Adaptive reminder suggestions**: opt-in, user-approved retiming based
  on when the user historically responds to a reminder.
- **Caregiver / multi-profile support**: a local profile switcher over the
  same on-device database — explicitly not a cloud account system.
- **StoreKit 2 wiring**: once product identifiers exist in App Store
  Connect, replace the stubbed Subscribe button in `SubscriptionView`.
