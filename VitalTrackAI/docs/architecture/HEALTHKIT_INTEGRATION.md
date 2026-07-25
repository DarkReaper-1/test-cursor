# VitalTrack AI — HealthKit Integration

**Version:** 1.0  
**Framework:** HealthKit  
**Related:** [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md), [ERROR_HANDLING.md](ERROR_HANDLING.md), [prd/USER_STORIES.md](../prd/USER_STORIES.md)

> HealthKit is a **source for importing/exporting** user health samples. Blood pressure in HealthKit originates from external monitors or other apps — not from VitalTrack camera. Apple Watch heart rate is **HR only**, never treated as blood pressure.

---

## 1. Authorization UX

1. **Pre-permission explainer** (Onboarding O-04 / Settings): plain language of read vs write.  
2. System `requestAuthorization`.  
3. **Not Now** allowed; app remains fully usable with Manual BP + Camera HR.  
4. Settings → HealthKit shows status + “Open Health” deep link (`App-Prefs` not allowed; use `UIApplication.open` to Health app if available / instructions).

**Copy requirements**
- Explain BP import helps unify cuff data already in Health.  
- Explain HR import from Watch/Health.  
- State: camera measurement in VitalTrack is PPG heart rate only.  
- Disclaimer: informational only, not medical advice.

`Info.plist`: `NSHealthShareUsageDescription`, `NSHealthUpdateUsageDescription` — accurate, non-alarmist, no camera-BP claims.

---

## 2. Types requested

### 2.1 Read (v1)

| HK type | Identifier | Usage |
|---------|------------|-------|
| Blood pressure | `HKCorrelationTypeIdentifierBloodPressure` (+ systolic/diastolic quantities) | Import BP |
| Heart rate | `HKQuantityTypeIdentifierHeartRate` | Import HR |
| Resting heart rate | `HKQuantityTypeIdentifierRestingHeartRate` | Optional display |
| Sleep analysis | `HKCategoryTypeIdentifierSleepAnalysis` | Optional context |
| Active energy / workouts | Workout / active energy | Optional exercise context |
| Body mass | `HKQuantityTypeIdentifierBodyMass` | Optional with scales |

### 2.2 Write (v1, optional toggles)

| HK type | When written |
|---------|--------------|
| Blood pressure correlation | User-saved Manual or Bluetooth BP if “Write to Health” enabled |
| Heart rate | Saved Camera PPG sessions if write enabled |

**Default:** Read prompted in onboarding; Write opt-in in Settings to minimize surprise.

### 2.3 Explicitly not used for BP invention

- No derivation of BP from HR, HRV, SpO₂, or PPG  
- No write of “estimated BP”

---

## 3. Read / write policy

| Policy | Rule |
|--------|------|
| Dedup | Store `healthkit_uuid`; upsert idempotent |
| Source attribution | Persist HK `sourceRevision.source.name` into `device_name_snapshot` when useful; `source_type=healthKit` |
| Units | Convert to mmHg / bpm canonical |
| User edits | Prefer not mutating HK samples; local edit flags `is_user_edited` and does not rewrite HK unless policy says so |
| Deletes | Local soft-delete; optional delete from Health only if sample was authored by VitalTrack and user confirms |
| Background | `HKObserverQuery` + background delivery for BP/HR if capability enabled |

---

## 4. Import flow

### 4.1 User-initiated

1. User opens BP → HealthKit Import (or Settings → Sync now).  
2. Query samples since `lastSuccessfulImportAt` (or full lookback first run — e.g., 2 years, batched).  
3. Map → domain `BPReading` / `HRReading`.  
4. Show summary: added / duplicate / failed.  
5. Update `import_batches` + sync timestamp.

### 4.2 Observer flow

```
HKObserverQuery (BP / HR)
    → client calls completion
    → anchored query fetch new samples
    → repository upsert
    → notify Dashboard refresh
```

Respect auth status; if denied, disable observers quietly with Settings tip.

---

## 5. Mapping details

### Blood pressure

```swift
// Pseudocode
let systolic = correlation.objects(for: systolicType).first
let diastolic = correlation.objects(for: diastolicType).first
BPReading(
  systolic: Int(systolic.mmHg),
  diastolic: Int(diastolic.mmHg),
  recordedAt: correlation.endDate,
  sourceType: .healthKit,
  healthkitUuid: correlation.uuid,
  deviceNameSnapshot: correlation.sourceRevision.source.name
)
```

Skip incomplete correlations; count as failed/skipped in batch.

### Heart rate

```swift
HRReading(
  bpm: Int(quantity.bpm),
  recordedAt: sample.endDate,
  sourceType: sampleDeviceIsWatch ? .appleWatch : .healthKit,
  healthkitUuid: sample.uuid
)
```

---

## 6. Apple Watch

- Watch HR appears via HealthKit on iPhone — no separate BP API.  
- Optional future Watch app: show HR measure shortcut + complications — **still HR only**.  
- Marketing/UI: “Apple Watch heart rate,” never “Watch blood pressure” unless Apple ships a cleared API and product policy updates (not v1).

---

## 7. Permission state machine

```
unknown → explainer → systemPrompt → authorized | denied | limited
denied → Settings instructions
authorized → queries enabled
```

Handle iOS “limited” library access gracefully (import what’s allowed).

---

## 8. Error cases

| Case | Code | Recovery |
|------|------|----------|
| Health data unavailable | `HK_UNAVAILABLE` | Explain device restriction |
| Denied | `HK_DENIED` | Open guidance |
| Query failed | `HK_QUERY_FAILED` | Retry |
| Unit conversion fail | `HK_UNIT` | Skip sample |
| Write denied | `HK_WRITE_DENIED` | Keep local save; tip Settings |

---

## 9. Testing

- Mock `HealthKitPort` with fixtures.  
- Simulator: limited HK — prefer protocol fakes in CI.  
- Dedup tests for re-import.  
- Ensure PPG save path writes HR quantity type only when enabled.

---

## 10. Privacy

- Authorization is granular and user-visible in Health app.  
- No selling HealthKit data.  
- Cloud sync of imported samples only if user enables iCloud/cloud features.  
- Analytics never include sample values.

---

*End of HealthKit Integration.*
