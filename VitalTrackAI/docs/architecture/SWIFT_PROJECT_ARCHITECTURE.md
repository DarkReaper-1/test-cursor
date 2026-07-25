# VitalTrack AI — Swift Project Architecture

**Version:** 1.0  
**Pattern:** Clean Architecture + MVVM + Dependency Injection + Repository  
**Concurrency:** `async/await` primary; Combine where Apple APIs require  
**Related:** [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md), [API_SPECIFICATIONS.md](API_SPECIFICATIONS.md)

---

## 1. Goals

- Clear boundaries: UI → Domain ← Data  
- Offline-first; cloud optional  
- Testable without device peripherals (protocol-oriented adapters)  
- Enforce trust rules in domain layer (no camera BP paths)

---

## 2. Layering

```
┌────────────────────────────────────────────┐
│ Presentation (SwiftUI + ViewModels)        │
├────────────────────────────────────────────┤
│ Domain (UseCases, Entities, Policies)      │
├────────────────────────────────────────────┤
│ Data (Repositories, DTOs, Persistence)     │
├────────────────────────────────────────────┤
│ Platform (HealthKit, BLE, Camera, CloudKit)│
└────────────────────────────────────────────┘
```

**Dependency rule:** Inner layers never import SwiftUI or UIKit. Platform adapters implement domain protocols.

---

## 3. Module / package map

| Module | Type | Responsibility |
|--------|------|----------------|
| `VitalTrackAI` (app) | App target | Composition root, `@main`, DI graph |
| `VTDomain` | Swift Package | Entities, use cases, repository protocols, trust policies |
| `VTData` | Swift Package | GRDB/SQLCipher, repository impls, mappers |
| `VTHealthKit` | Swift Package | HealthKit client implementing domain ports |
| `VTBluetooth` | Swift Package | CoreBluetooth + `DeviceAdapter`s |
| `VTPPG` | Swift Package | Camera PPG signal processing (HR only) |
| `VTAI` | Swift Package | Heuristic engine + optional LLM client |
| `VTCloud` | Swift Package | Optional sync + AI API |
| `VTDesignSystem` | Swift Package | Tokens & reusable components |
| `VTSupport` | Swift Package | Logging, Result helpers, Date/units |

**Package boundaries**
- `VTDomain` depends on Foundation only (or minimal).  
- `VTData` → `VTDomain` + GRDB/SQLCipher.  
- Feature ViewModels live in app or thin `VTFeatures` package importing Domain + DesignSystem.  
- `VTPPG` exposes `HeartRateMeasuring` — **no** blood pressure types.

---

## 4. Folder structure (app + packages)

```
VitalTrackAI/
  App/
    VitalTrackApp.swift
    AppComposition.swift          # DI
    AppRouter.swift
  Features/
    Onboarding/
    Dashboard/
    HeartRate/
    BloodPressure/
    Analytics/
    History/
    Devices/
    Reports/
    AIAssistant/
    Settings/
    Subscription/
  Resources/
Packages/
  VTDomain/
    Sources/VTDomain/
      Entities/
      UseCases/
      Repositories/               # protocols
      Policies/TrustPolicy.swift
  VTData/
    Sources/VTData/
      Persistence/
      Repositories/
      Migrations/
  VTHealthKit/
  VTBluetooth/
  VTPPG/
  VTAI/
  VTCloud/
  VTDesignSystem/
Tests/
  Unit/
  Integration/
  UI/
```

---

## 5. MVVM conventions

### View

- SwiftUI, dumb binding to `ViewModel` `@Observable` / `ObservableObject`.
- No business rules; no direct HealthKit/BLE calls.

### ViewModel

- Orchestrates use cases.
- Maps entities → presentation models (`BPReadingVM` with `sourceLabel`).
- Handles loading/error/empty states.
- Injected dependencies via init (no service locators in features).

### Example shape

```swift
@MainActor
final class BloodPressureHubViewModel: ObservableObject {
    @Published private(set) var recent: [BPReadingPresentation] = []
    @Published var error: VTError?

    private let listBP: ListBPReadingsUseCase
    private let trust: TrustCopyProviding

    func onAppear() async {
        do { recent = try await listBP.execute(limit: 20).map(PresentationMapper.bp) }
        catch { error = VTError(error) }
    }
}
```

---

## 6. Domain layer

### Entities (examples)

- `BPReading`, `HRReading`, `Device`, `Insight`, `Goal`, `Medication`, `Reminder`
- Enums: `BPSource` = `manual | bluetooth | healthKit | csv`  
- Enums: `HRSource` = `cameraPPG | healthKit | appleWatch`

### Trust policy

```swift
enum TrustPolicy {
    static let allowedBPSources: Set<BPSource> = [.manual, .bluetooth, .healthKit, .csv]
    static func assertBPSource(_ s: BPSource) { precondition(allowedBPSources.contains(s)) }
    // No API exists for camera → BP
}
```

### Use cases

| Use case | Notes |
|----------|-------|
| `CompleteOnboarding` | Requires disclaimer acceptance |
| `SaveManualBP` | Validates ranges + source=.manual |
| `ImportHealthKitBP` | Dedup by UUID |
| `ImportCSVBP` | Batch + row validation |
| `StartBluetoothBPSession` | DeviceAdapter |
| `MeasureCameraHR` | Returns HR only |
| `GenerateInsight` | Heuristic; optional LLM |
| `ExportReport` | PDF/CSV + disclaimer |
| `PurgeAllData` | Privacy |

Use cases are structs/classes with one primary `execute` method; pure where possible.

---

## 7. Repository pattern

```swift
protocol BPReadingRepository {
    func upsert(_ reading: BPReading) async throws
    func list(in range: DateInterval) async throws -> [BPReading]
    func softDelete(id: UUID) async throws
}

protocol DeviceRepository { … }
protocol InsightRepository { … }
protocol SyncMetadataRepository { … }
```

Implementations in `VTData` (`GRDBBPReadingRepository`).  
Caches: optional in-memory for Dashboard; invalidate on writes.

---

## 8. Dependency injection

Composition root in `AppComposition`:

```swift
struct AppDependencies {
    let bpRepository: BPReadingRepository
    let hrRepository: HRReadingRepository
    let healthKit: HealthKitPort
    let bluetooth: BluetoothPort
    let ppg: HeartRateMeasuring
    let ai: InsightGenerating
    let storeKit: EntitlementProviding
}
```

- Production: real adapters.  
- Previews/tests: fakes.  
- Pass via `Environment` or explicit ViewModel factories — prefer factories for testability.

---

## 9. Concurrency

| Area | Approach |
|------|----------|
| Repositories | `async` methods; GRDB writers serialized |
| HealthKit | async wrappers over HK queries |
| BLE | `AsyncStream` of connection/reading events |
| PPG | background processing queue → MainActor publish |
| ViewModels | `@MainActor` |
| Combine | Bridge Apple publishers (`NotificationCenter`, StoreKit) with `values` if needed |

Avoid GCD spaghetti; use structured concurrency (`Task`, task groups for import batches).

---

## 10. Error surfacing

Domain errors → `VTError` (see [ERROR_HANDLING.md](ERROR_HANDLING.md)) → ViewModel → banner/alert.  
Never fail silently on trust violations — hard assert/log in DEBUG; reject in RELEASE.

---

## 11. Feature module guidelines

1. One folder per feature; public entry `FeatureRootView`.  
2. Cross-feature navigation via `AppRouter` / deep links — not hard imports of other feature VMs.  
3. Shared UI from `VTDesignSystem` only.  
4. Subscription gates checked in use case or VM via `EntitlementProviding` — Free BP logging never gated.

---

## 12. Testing seams

| Seam | Fake |
|------|------|
| `BPReadingRepository` | In-memory |
| `HealthKitPort` | Fixture samples |
| `DeviceAdapter` | Scripted BP notifications |
| `HeartRateMeasuring` | Synthetic PPG frames |
| `InsightGenerating` | Deterministic strings |
| `EntitlementProviding` | Free/Premium toggles |

---

## 13. Anti-patterns (rejected)

- View calling CoreBluetooth directly  
- Storing BP from PPG “estimates”  
- Singleton god `DataManager` without protocols  
- Force-unwrapping HealthKit auth  
- Mixing LLM prompts in SwiftUI views  

---

## 14. Build configurations

| Config | Flags |
|--------|-------|
| Debug | `-DVT_DEBUG`, verbose logs (no health values) |
| Release | OSLog info+, cloud endpoints prod |
| UITests | Launch args: `-vt-ui-testing`, mock BLE/HK |

---

*End of Swift Project Architecture.*
