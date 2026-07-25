# VitalTrack AI — Bluetooth Integration

**Version:** 1.0  
**Framework:** CoreBluetooth  
**Related:** [ERROR_HANDLING.md](ERROR_HANDLING.md), [SWIFT_PROJECT_ARCHITECTURE.md](SWIFT_PROJECT_ARCHITECTURE.md)

> Bluetooth BP cuffs supply readings from **FDA-cleared external monitors**. The iPhone does not measure blood pressure. Scales are weight-only. Camera PPG is unrelated to this module.

---

## 1. Goals

- Discover, pair, and receive BP measurements reliably  
- Support standard GATT Blood Pressure Service when available  
- Isolate vendor quirks behind `DeviceAdapter`  
- Always offer Manual / HealthKit / CSV fallback  

---

## 2. Architecture

```
BloodPressure Feature
        │
        ▼
StartBluetoothBPSession (use case)
        │
        ▼
BluetoothPort (protocol)
        │
        ▼
CBCentralManager + PeripheralSession
        │
        ▼
DeviceAdapter (per device family)
        │
        ▼
BPReading (sourceType = .bluetooth)
```

### 2.1 `DeviceAdapter` protocol

```swift
protocol DeviceAdapter {
    var kind: DeviceKind { get } // .bpCuff / .scale
    var matches: (CBPeripheral, [String: Any]) -> Bool { get }

    func configure(peripheral: CBPeripheral) async throws
    func readingEvents() -> AsyncStream<DeviceReading>

    /// Map raw payload to domain reading
    func decode(_ data: Data, characteristic: CBUUID) throws -> DeviceReading
}

enum DeviceReading {
    case bloodPressure(systolic: Double, diastolic: Double, mean: Double?, pulse: Int?, timestamp: Date?)
    case weight(kg: Double, timestamp: Date?)
}
```

**Invariant:** Adapters never emit BP from non-BP services. Weight never coerced into BP.

---

## 3. Standard Blood Pressure Profile

| Item | UUID |
|------|------|
| Blood Pressure Service | `0x1810` |
| Blood Pressure Measurement | `0x2A35` (indicate) |
| Intermediate Cuff Pressure | `0x2A36` (notify, optional) |
| Blood Pressure Feature | `0x2A49` (read) |

### 3.1 Measurement parsing (0x2A35)

Follow Bluetooth SIG Blood Pressure Profile:

- Flags bitfield (units mmHg vs kPa, timestamp present, pulse present, user ID, status)
- Systolic / Diastolic / Mean — IEEE-11073 16-bit SFLOAT
- Convert kPa → mmHg for canonical storage
- Timestamp if present; else `Date()` with UI confirmation

Store `sourceType = bluetooth`, attach `device_id` + `device_name_snapshot`.

### 3.2 Discovery filters

Scan with service UUID `0x1810` when looking for standard cuffs.  
Also allow vendor adapters to match by name prefix / manufacturer data when devices omit service UUID in advertising (common).

---

## 4. Connection lifecycle

```
Idle → Scanning → Connecting → Discovering Services
    → Enabling Indications → Ready → Receiving → Completed
         ↘ Failed / Unauthorized / PoweredOff
```

| Step | Behavior |
|------|----------|
| Scanning | Timeout 30s; show devices list live |
| Connecting | Timeout 15s |
| MTU / options | Default; no pairing PIN UI unless OS prompts |
| Persist | Store `peripheral.identifier` as `bluetooth_identifier` |
| Auto-reconnect | Preferred cuff when user opens Bluetooth capture |
| Tear-down | Cancel notifies on leave; don’t leak centrals |

---

## 5. Pairing & bonding

- System owns pairing dialogs.  
- App explains: “Use your FDA-cleared cuff; enable Bluetooth in Settings.”  
- If bond lost: Forget device → re-pair flow.  
- Multiple cuffs: user picks preferred.

---

## 6. Vendor adapters (modular)

| Adapter | Strategy |
|---------|----------|
| `SigBloodPressureAdapter` | Standard 0x1810 |
| `OmronAdapter` (example) | Name/service quirks + parse |
| `AAndDAdapter` (example) | Vendor docs |
| `GenericScaleAdapter` | Weight Scale Service `0x181D` / `0x2A9D` |

Register adapters in `DeviceAdapterRegistry`.  
Unknown devices: show “May be unsupported” + Manual entry CTA.

---

## 7. Permissions & Info.plist

- `NSBluetoothAlwaysUsageDescription`: explain BP cuff / scale sync; state that phone does not measure BP itself.  
- Handle `CBManagerState`: unauthorized, poweredOff, resetting, unknown, unsupported.

---

## 8. Error recovery matrix

| Condition | User messaging | Actions |
|-----------|----------------|---------|
| Bluetooth off | Turn on Bluetooth | Open Settings, Retry |
| Unauthorized | Enable Bluetooth access | Open Settings |
| Scan timeout | No devices found | Retry, Manual, Compatibility list |
| Connect fail | Couldn’t connect | Retry, Forget & re-pair, Manual |
| Indication fail | Connected but no data | Ensure cuff finished measurement; Retry |
| Parse fail | Unsupported format | Report model; Manual entry |
| Disconnect mid-read | Connection lost | Reconnect, Manual |

See [ERROR_HANDLING.md](ERROR_HANDLING.md) codes `BT_*`.

---

## 9. Security & privacy

- Don’t log raw GATT payloads with user identifiers at info level.  
- Readings stored encrypted locally.  
- No cloud upload of BT readings without sync consent.

---

## 10. Testing strategy

- Fake `CBCentralManager` hierarchy via protocol.  
- Hex fixtures for 0x2A35 mmHg and kPa.  
- Flaky disconnect integration tests.  
- UI test launch arg `-vt-mock-bt-cuff` injects a reading after 2s.

---

## 11. Out of scope

- Using BLE RSSI or phone sensors to estimate BP  
- Non-cleared “wearable BP” claims without regulatory review  
- Android GATT (future)

---

*End of Bluetooth Integration.*
