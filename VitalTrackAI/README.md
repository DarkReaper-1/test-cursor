# VitalTrack AI (iOS)

Modular SwiftUI app + Swift Package libraries for logging vital signs with **strict trust boundaries**.

## Trust principles

- **Never** claim the camera measures blood pressure.
- Blood pressure comes **only** from FDA-cleared external monitors via manual entry, Bluetooth cuff, Apple Health, or CSV.
- Camera / Apple Watch paths are **heart rate PPG only**.
- Insights are **informational only** — not medical advice, diagnosis, or treatment.

Canonical copy lives in `VitalTrackCore.TrustPolicy` and `VitalTrackDesignSystem.TrustCopy`.

## Demo video (HTML walkthrough)

Interactive iPhone-framed UI that mirrors the SwiftUI trust flow (onboarding → PPG HR → cuff BP → insights):

```bash
cd VitalTrackAI/demo
python3 -m http.server 8799 --directory ../..
# open http://127.0.0.1:8799/VitalTrackAI/demo/index.html?demo=1
npm run demo   # records /opt/cursor/artifacts/vitaltrack-ai-demo.mp4 (needs Playwright)
```

## Open in Xcode

```bash
cd VitalTrackAI
./Scripts/generate-xcodeproj.sh
open VitalTrackAI.xcodeproj
```

Requirements: Xcode 15+, iOS 17 SDK, [XcodeGen](https://github.com/yonaskolb/XcodeGen) (`brew install xcodegen`).

You can also open `Package.swift` alone to build/test libraries:

```bash
swift test
```

> Full HealthKit / CoreBluetooth / camera behavior requires an Apple device or simulator with the app target.

Bundle ID: `com.vitaltrack.ai`

## Architecture

| Module | Role |
|--------|------|
| `VitalTrackCore` | Models, repository protocols, errors, DI, trust policy |
| `VitalTrackData` | Actor JSON stores, CSV import, reading facade |
| `VitalTrackHealthKit` | HealthKit sync (+ mock fallback) |
| `VitalTrackBluetooth` | BLE manager, BP service adapter, scale stub |
| `VitalTrackAIInsights` | Offline heuristic insights + safety filter |
| `VitalTrackNotifications` | Reminder scheduling |
| `VitalTrackExport` | CSV / PDF / clinician summary |
| `VitalTrackDesignSystem` | Teal tokens, components, trust banners |
| `VitalTrackFeatures` | Shared validation helpers |
| `VitalTrackAI` (app) | SwiftUI composition root, onboarding, tabs |

Pattern: Clean boundaries + MVVM. ViewModels / views talk to protocols; platform adapters live in HealthKit/Bluetooth packages.

Docs: [`docs/`](docs/) (PRD, architecture, legal, design).

## App navigation

Splash → multi-step onboarding (includes **What we cannot do** / FDA-cleared BP messaging) → tabs:

**Home · Heart · BP · Insights · More** (Analytics, History, Devices, Reports, Settings, Subscription, Privacy, Help)

## Tests

- `Tests/VitalTrackCoreTests` — BP categories, trust rules
- `Tests/VitalTrackAIInsightsTests` — never diagnoses
- `Tests/VitalTrackDataTests` — repository CRUD + CSV
- `Tests/VitalTrackExportTests` — CSV / report disclaimers
- `Tests/UI` — UI test stubs for the app scheme

## Design

Calm teal health aesthetic (`VitalTrackDesignSystem`). Avoid purple “AI slop” gradients and misleading medical marketing.
