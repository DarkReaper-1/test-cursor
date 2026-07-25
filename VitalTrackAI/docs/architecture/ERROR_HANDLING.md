# VitalTrack AI — Error Handling

**Version:** 1.0  
**Related:** Feature architecture docs; UI uses `VTInlineError` / banners / alerts

> Errors should be **actionable**, calm, and honest. Never “fix” a BP failure by estimating from the camera. Always keep Manual / CSV / HealthKit paths available when Bluetooth fails.

---

## 1. Principles

1. **User-safe language** — no blame; no diagnostic panic.  
2. **Actionable recovery** — primary CTA + secondary alternative.  
3. **Preserve data** — failed saves don’t corrupt DB; imports partial-success.  
4. **Typed errors** — `VTError` with `code`, `category`, `retryable`, `recovery`.  
5. **Logging** — code + category only; no BP/HR values in logs.  
6. **Trust** — errors must not suggest unsupported measurement methods.

---

## 2. Error model

```swift
struct VTError: Error, Identifiable {
    let code: String
    let category: Category
    let message: String          // user-facing
    let technicalDescription: String?
    let retryable: Bool
    let recoveries: [Recovery]

    enum Category: String {
        case bluetooth, healthKit, camera, permissions
        case persistence, importExport, network, ai
        case subscription, validation, unknown
    }

    enum Recovery: Equatable {
        case retry
        case openSettings
        case enterManually
        case importCSV
        case importHealthKit
        case rePairDevice
        case upgradePremium          // never for core BP log
        case contactSupport
        case dismiss
        case useOfflineHeuristic
        case seekEmergencyCare       // rare, safety copy only
    }
}
```

---

## 3. Error catalog

### 3.1 Bluetooth (`BT_*`)

| Code | Message (user) | Recoveries |
|------|----------------|------------|
| `BT_POWERED_OFF` | Bluetooth is turned off. Turn it on to connect your blood pressure cuff. | openSettings, retry, enterManually |
| `BT_UNAUTHORIZED` | Bluetooth access is off for VitalTrack. Enable it in Settings to use a cuff. Your phone still doesn’t measure BP itself — the cuff does. | openSettings, enterManually |
| `BT_UNSUPPORTED` | This device can’t use Bluetooth LE peripherals. | enterManually, importCSV, importHealthKit |
| `BT_SCAN_TIMEOUT` | No compatible cuff found. Bring the cuff closer, ensure it’s in pairing mode, or enter the reading manually. | retry, rePairDevice, enterManually |
| `BT_CONNECT_FAILED` | Couldn’t connect to the cuff. | retry, rePairDevice, enterManually |
| `BT_DISCONNECTED` | Connection lost before a reading arrived. | retry, enterManually |
| `BT_SERVICES_MISSING` | This device doesn’t expose a supported blood pressure service. | Compatibility list, enterManually, importCSV |
| `BT_PARSE_FAILED` | Received data we couldn’t interpret. Try again or enter values manually. | retry, enterManually, contactSupport |
| `BT_TIMEOUT_WAITING` | Connected, but no measurement arrived. Finish the reading on your cuff, then retry. | retry, enterManually |

### 3.2 HealthKit (`HK_*`)

| Code | Message | Recoveries |
|------|---------|------------|
| `HK_UNAVAILABLE` | Health data isn’t available on this device. | enterManually, dismiss |
| `HK_DENIED` | Health access is turned off. You can still log BP manually and measure heart rate with the camera. | openSettings, enterManually |
| `HK_QUERY_FAILED` | Couldn’t read samples from Health. | retry, dismiss |
| `HK_WRITE_DENIED` | Saved in VitalTrack, but couldn’t write to Health. | openSettings, dismiss |
| `HK_IMPORT_PARTIAL` | Imported {n} readings; {m} skipped (duplicates or invalid). | dismiss, retry |

### 3.3 Camera / PPG (`CAM_*`)

| Code | Message | Recoveries |
|------|---------|------------|
| `CAM_DENIED` | Camera access is required to measure **heart rate** (not blood pressure). | openSettings, dismiss |
| `CAM_UNAVAILABLE` | Camera unavailable. If you have an Apple Watch, import heart rate from Health. | importHealthKit, dismiss |
| `CAM_FLASH_UNAVAILABLE` | Flash unavailable; measurement quality may be reduced. | retry, dismiss |
| `CAM_SIGNAL_LOW` | Signal too weak. Cover the camera gently and keep still. Reminder: this measures heart rate only. | retry, dismiss |
| `CAM_SESSION_FAILED` | Couldn’t complete heart rate measurement. | retry, dismiss |

### 3.4 Permissions (generic)

| Code | Message | Recoveries |
|------|---------|------------|
| `PERM_NOTIFICATIONS_DENIED` | Notifications are off. Reminders won’t fire until you enable them in Settings. | openSettings, dismiss |
| `PERM_PHOTOS_DENIED` | Need Photos access to pick a CSV. | openSettings, dismiss |
| `PERM_FACEID_FAILED` | Couldn’t unlock VitalTrack. | retry, dismiss |

### 3.5 Persistence (`DB_*`)

| Code | Message | Recoveries |
|------|---------|------------|
| `DB_MIGRATE_FAILED` | VitalTrack couldn’t prepare its secure database. | retry, contactSupport |
| `DB_WRITE_FAILED` | Couldn’t save your reading. It was not stored. | retry, dismiss |
| `DB_READ_FAILED` | Couldn’t load your history. | retry, contactSupport |
| `DB_DECRYPT_FAILED` | Couldn’t open the encrypted database. | contactSupport |

### 3.6 Import / Export (`IO_*`)

| Code | Message | Recoveries |
|------|---------|------------|
| `IO_CSV_INVALID` | We couldn’t parse that CSV. Check columns and try mapping again. | retry, dismiss |
| `IO_CSV_EMPTY` | No valid blood pressure rows found. | dismiss |
| `IO_EXPORT_FAILED` | Export failed. | retry, dismiss |
| `IO_DISK_FULL` | Not enough storage to export. | dismiss |

### 3.7 Network / Cloud (`NET_*`)

| Code | Message | Recoveries |
|------|---------|------------|
| `NET_OFFLINE` | You’re offline. Local tracking still works. Cloud AI/sync unavailable. | useOfflineHeuristic, dismiss |
| `NET_TIMEOUT` | Network timed out. | retry, useOfflineHeuristic |
| `NET_SERVER` | Server error. Try again later. | retry, useOfflineHeuristic |

### 3.8 AI (`AI_*`)

| Code | Message | Recoveries |
|------|---------|------------|
| `AI_CONSENT_REQUIRED` | Cloud insights need your consent. Offline insights remain available. | (navigate consent), useOfflineHeuristic |
| `AI_PREMIUM_REQUIRED` | Cloud insights are a Premium feature. Free offline insights still work. | upgradePremium, useOfflineHeuristic |
| `AI_SAFETY_BLOCKED` | I can’t help with that request. I don’t diagnose or give medical advice. If you have urgent symptoms, seek emergency care. | dismiss, seekEmergencyCare |
| `AI_GENERATION_FAILED` | Couldn’t generate a cloud insight. Showing an offline summary instead. | useOfflineHeuristic, retry |

### 3.9 Subscription (`SUB_*`)

| Code | Message | Recoveries |
|------|---------|------------|
| `SUB_PURCHASE_FAILED` | Purchase didn’t complete. You were not charged (or check Subscriptions). | retry, restore, dismiss |
| `SUB_RESTORE_EMPTY` | No prior purchases found for this Apple ID. | dismiss |
| `SUB_VERIFY_FAILED` | Couldn’t verify subscription. Try again; Free features remain available. | retry, dismiss |

### 3.10 Validation (`VAL_*`)

| Code | Message | Recoveries |
|------|---------|------------|
| `VAL_BP_ORDER` | Diastolic must be lower than systolic. | dismiss (fix highlight) |
| `VAL_BP_RANGE` | That value looks unusual. Confirm it’s what your cuff displayed. | confirm, dismiss |
| `VAL_REQUIRED` | Please fill required fields. | dismiss |

---

## 4. Presentation guidelines

| Severity | UI |
|----------|----|
| Field validation | Inline under control |
| Recoverable ops | Non-blocking banner |
| Session failures (BT/PPG) | In-flow status + CTAs |
| Destructive / DB | Alert |
| Safety AI block | Dedicated refusal card + disclaimer |

**Never** auto-navigate to Camera from a BP Bluetooth error.

---

## 5. Retry policy

| Category | Retry |
|----------|-------|
| BT connect | Manual retry; max auto 2 |
| HK query | Exponential backoff for observers (system-limited) |
| Network | Exponential; cap 3 in UI |
| DB write | Single automatic retry then alert |

---

## 6. Mapping Apple errors

| Apple | VTError |
|-------|---------|
| `CBManagerState.poweredOff` | `BT_POWERED_OFF` |
| `CBError.connectionTimeout` | `BT_CONNECT_FAILED` |
| `HKError.errorAuthorizationDenied` | `HK_DENIED` |
| `AVCapture` session runtime error | `CAM_SESSION_FAILED` |
| StoreKit `userCancelled` | Silent dismiss (not an error banner) |

---

## 7. Telemetry

Emit `error_code`, `category`, `retryable` only.  
Do not emit notes, systolic, diastolic, bpm, device PII.

---

## 8. Support playbook (internal)

| Code | First question |
|------|----------------|
| `BT_*` | Cuff model? OS Bluetooth on? Manual works? |
| `HK_*` | Health toggles for VitalTrack? |
| `CAM_*` | Camera permission? Using HR not BP? |
| Camera BP expectation | Educate: not supported; share FAQ |

---

*End of Error Handling.*
