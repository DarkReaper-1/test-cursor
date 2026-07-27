# VitalTrack — Testing plan

## What's actually implemented in this pass

`Tests/VitalTrackCoreTests/` (pure Swift, no Xcode project needed —
`swift test` once a toolchain is available):

- `PPGProcessorTests` — synthetic 72bpm sine wave recovers the correct
  BPM; pure noise never reports `.good` quality; finger-presence heuristic;
  reset behavior. Ported from the equivalent PulseCheck (Flutter) tests.
- `BloodPressureMeasurementParserTests` — full measurement payload
  (timestamp + pulse present) parses correctly; minimal payload (no
  optional fields) parses correctly; truncated payload throws; kPa→mmHg
  conversion is correct.
- `InsightsEngineTests` — missed-reading nudge fires after 5+ days; a
  normal-range reading produces a `.positive`-toned insight; empty data
  falls back to the single prompt insight.

**None of this has been run** — no Swift toolchain in the environment this
was written in. Run `swift test` and fix whatever breaks before trusting
it.

## What's specified but not written (needs Xcode / a device)

### Unit tests
- `HealthRepository` (Core Data-backed) CRUD + `since:` filtering, against
  an in-memory `NSPersistentContainer`.
- `AnalyticsViewModel` averaging math, once `HealthRepository` tests exist
  to build fixtures against.
- `ExportManager` — CSV row count/format assertions; PDF byte-count sanity
  check (full visual verification isn't practical in a unit test).

### HealthKit mocks
- Wrap `HKHealthStore` behind the existing `HealthKitManager` (already the
  case) and inject a fake store conforming to the same call surface for
  authorization/write/read tests — `HKHealthStore` itself isn't mockable
  directly, so this needs a thin protocol seam added around it.

### Bluetooth mocks
- `CBCentralManager`/`CBPeripheral` are not directly mockable either;
  `BluetoothBloodPressureManager`'s delegate callbacks
  (`centralManager(_:didDiscover:...)` etc.) can be invoked directly in a
  test with hand-built `CBPeripheral`/`CBCharacteristic` doubles, or the
  manager can be refactored behind a thin `CentralManaging` protocol seam
  the way `HealthKitManager` should be.
- Separately: a real cuff, or a BLE peripheral simulator advertising
  service `0x1810`, to verify the GATT handshake end-to-end — the parser
  logic is unit-tested, but "does a real cuff's advertising/pairing
  behavior match the spec closely enough" is a hardware question.

### UI tests (XCUITest)
- Onboarding: capability page cannot be skipped; "Get started" only
  appears on the last page.
- Dashboard → measure heart rate → cancel mid-measurement → returns to
  idle state cleanly.
- Blood pressure manual entry: out-of-range systolic/diastolic shows the
  specific validation message, not a generic one.
- Settings: toggling a reminder off cancels the underlying notification
  (verify via `UNUserNotificationCenter.pendingNotificationRequests`).
- Delete-all-data: confirmation dialog required; data gone after confirm.

### Integration tests
- Full "log a Bluetooth reading" path against a BLE peripheral simulator.
- HealthKit round-trip on a real device/simulator with Health permissions
  granted (simulator supports HealthKit since iOS 14).

### AI/insights response validation
Since `InsightsEngine` is deterministic rule-based logic (not a model),
"validation" is: given a fixed set of readings, the exact insight text and
tone are asserted (as in `InsightsEngineTests`) — no non-determinism to
account for, no need for a separate "AI eval" harness. If a real
generative assistant is added later (see PRD §9), a *different* testing
strategy is needed then: fixture-based prompt/response snapshots plus
adversarial-input tests to ensure it stays informational and never
diagnostic.

### Stress / offline / accessibility tests
- **Stress:** 5,000+ synthetic readings in Core Data; confirm chart
  rendering and history scrolling stay smooth (Instruments Time Profiler).
- **Offline:** airplane mode for the entire manual/Bluetooth/export flow —
  everything except HealthKit's own iCloud sync and the (stubbed)
  subscription flow should work fully offline already, by design.
- **Accessibity:** Dynamic Type at largest setting on every screen;
  VoiceOver pass on Dashboard, measurement flow, and Settings; color
  contrast check on the reference-range/insight tone colors in both light
  and dark mode.

## CI shape (proposed)

```
on: pull_request
  - swift build
  - swift test  (VitalTrackCoreTests)
  - xcodebuild test -scheme VitalTrack -destination 'platform=iOS Simulator,name=iPhone 15'
      (once the Xcode project + XCUITest target exist)
```
