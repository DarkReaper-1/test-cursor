# VitalTrack AI — Complete Folder Structure

```
VitalTrackAI/
├── Package.swift                 # SPM libraries (iOS 17+)
├── project.yml                   # XcodeGen app project
├── README.md
├── Scripts/
│   └── generate-xcodeproj.sh
├── AppStore/
│   ├── metadata.json
│   └── SCREENSHOT_CAPTIONS.md
├── docs/                         # PRD, IA, architecture, legal, marketing
├── Sources/
│   ├── VitalTrackCore/           # Models, protocols, errors, trust, DI
│   ├── VitalTrackData/           # Repositories, CSV import, persistence
│   ├── VitalTrackHealthKit/      # HealthKit (+ mock fallback)
│   ├── VitalTrackBluetooth/      # BLE manager + device adapters
│   ├── VitalTrackAIInsights/     # Heuristic AI + safety filter
│   ├── VitalTrackNotifications/  # Reminder scheduling
│   ├── VitalTrackExport/         # CSV / PDF / doctor report
│   ├── VitalTrackDesignSystem/   # Tokens, components, TrustCopy
│   └── VitalTrackFeatures/       # Shared feature helpers (optional)
├── VitalTrackAI/                 # SwiftUI application target
│   ├── App/                      # @main, router, composition, session
│   ├── Features/
│   │   ├── Splash/
│   │   ├── Onboarding/
│   │   ├── Dashboard/
│   │   ├── HeartRate/
│   │   ├── BloodPressure/
│   │   ├── Analytics/
│   │   ├── History/
│   │   ├── Devices/
│   │   ├── Reports/
│   │   ├── AIAssistant/
│   │   ├── Settings/
│   │   ├── Help/
│   │   ├── Subscription/
│   │   ├── Privacy/
│   │   └── More/
│   ├── Widgets/                  # Home / Lock Screen widget placeholders
│   ├── WatchCompanion/           # watchOS companion stubs
│   ├── LiveActivities/           # Live Activity stubs
│   └── Resources/                # Info.plist, entitlements, Assets
└── Tests/
    ├── VitalTrackCoreTests/
    ├── VitalTrackDataTests/
    ├── VitalTrackAIInsightsTests/
    ├── VitalTrackExportTests/
    └── UI/                       # UI test stubs
```

## Module dependency direction

```
VitalTrackAI (app)
  → DesignSystem, Features, Data, HealthKit, Bluetooth, AIInsights, Notifications, Export
       ↓
     Core  (no outward dependencies)
```

Clean Architecture layers inside each feature: **View → ViewModel → Repository protocol → Data/HealthKit/Bluetooth implementations**.
