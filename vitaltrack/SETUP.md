# VitalTrack — setup

There is no Swift toolchain or Xcode in the sandbox this was written in, so
**nothing in this package has been compiled, run in a simulator, or had
`swift test`/XCTest executed against it.** Every file was hand-traced for
correctness, but treat it as a first draft to build and fix on a Mac with
Xcode before relying on it.

## 1. What's a Swift Package vs. what needs Xcode

`VitalTrackCore` and `VitalTrackApp` are plain Swift packages (`Package.swift`
at the repo root) so the logic — models, persistence, HealthKit, Bluetooth,
PPG processing, insights, the SwiftUI screens themselves — can be developed,
diffed, and (once you have Xcode) unit-tested without a full Xcode project.

What a Swift package **cannot** provide, and what only an actual Xcode app
target gives you:
- An `Info.plist` (permission usage strings, background modes)
- Entitlements (HealthKit, Bluetooth background modes, App Groups)
- Asset catalogs (app icon, launch screen)
- Code signing / provisioning
- Widget, Live Activity, and Apple Watch companion **targets** — these are
  genuinely separate build targets in Xcode; hand-authoring their
  `.xcodeproj` entries outside Xcode is fragile enough that it wasn't
  attempted here. They're architected (see `docs/PRD.md` §Roadmap) but not
  implemented as targets in this pass.

## 2. Create the Xcode project

```bash
# In Xcode: File > New > Project > iOS > App
#   Product Name: VitalTrack
#   Interface: SwiftUI, Language: Swift, Storage: none (Core Data is added manually below)
#   Minimum Deployment: iOS 17 (matches Package.swift — Swift Charts and
#   the two-parameter onChange(of:) API used throughout need it)
```

Then, with the project open:

1. **File > Add Package Dependencies > Add Local...** and point at this
   `vitaltrack/` folder — this pulls in `VitalTrackCore` and `VitalTrackApp`
   as local Swift packages.
2. Delete the template `ContentView.swift` the wizard generated.
3. Replace the generated `VitalTrackApp.swift` (the `@main` entry point) with:

   ```swift
   import SwiftUI
   import VitalTrackApp

   @main
   struct VitalTrackMain: App {
       var body: some Scene {
           WindowGroup {
               RootView()
           }
       }
   }
   ```

   `RootView` lives in `Sources/VitalTrackApp/App/RootView.swift`.

## 3. Capabilities & Info.plist entries

**Signing & Capabilities tab**, add:
- **HealthKit**
- **Background Modes** → Uses Bluetooth LE accessories (for BP cuff sync)

**Info.plist**, add:

```xml
<key>NSCameraUsageDescription</key>
<string>VitalTrack uses the camera and flash to measure your pulse from your fingertip. No photos or video are saved.</string>

<key>NSHealthShareUsageDescription</key>
<string>VitalTrack can show your existing Apple Health heart rate and blood pressure history alongside what you log here, if you allow it.</string>
<key>NSHealthUpdateUsageDescription</key>
<string>VitalTrack writes the readings you log here into Apple Health, if you allow it.</string>

<key>NSBluetoothAlwaysUsageDescription</key>
<string>VitalTrack connects to Bluetooth blood pressure monitors and scales you pair, to import readings automatically.</string>

<key>NSUserNotificationsUsageDescription</key>
<string>VitalTrack can remind you to log a reading or take your medication, if you turn reminders on.</string>
```

## 4. Core Data model

Create `VitalTrack.xcdatamodeld` in the app target (Editor menu isn't
scriptable outside Xcode, so this file has to be built in Xcode's Core Data
model editor) matching the entities in `docs/database-schema.md`. The
`PersistenceController` in `Sources/VitalTrackCore/Persistence/` expects a
model named exactly `VitalTrack`.

## 5. Build and run

```bash
xcodebuild -scheme VitalTrack -destination 'platform=iOS Simulator,name=iPhone 15' build
```

Run `swift test` from `vitaltrack/` to run `VitalTrackCoreTests` (pure-Swift,
no Xcode project needed) once a toolchain is available — please do this and
fix whatever breaks; it has not been run here.

## 6. What only you can do

- Apple Developer Program enrollment, App Store Connect setup, TestFlight,
  submission — nobody else can do this for you.
- Pair an actual Bluetooth blood pressure cuff to verify
  `BluetoothBloodPressureManager` against real hardware — the GATT parsing
  follows the published Bluetooth SIG Blood Pressure Service spec, but only a
  real cuff proves it end-to-end.
- Record a real demo video / App Store preview on a device.
- Widget/Live Activity/Watch targets, if you want them — see
  `docs/PRD.md` §Roadmap for what they'd need.
