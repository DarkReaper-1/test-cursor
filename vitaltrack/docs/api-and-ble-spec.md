# VitalTrack — API & integration specifications

VitalTrack has no VitalTrack-operated backend or REST API — "API
specifications" here means the three real external interfaces the app
integrates against: the Bluetooth GATT profile, HealthKit, and the
export file formats.

## 1. Bluetooth: Blood Pressure Service (0x1810)

Implemented in `Sources/VitalTrackCore/Bluetooth/`. VitalTrack targets the
Bluetooth SIG standard profile rather than any single vendor's SDK, so any
cuff advertising this service works without app changes.

- **Service UUID:** `0x1810` (Blood Pressure)
- **Measurement characteristic:** `0x2A35` (Blood Pressure Measurement),
  subscribed via notify/indicate
- **Feature characteristic:** `0x2A49` (Blood Pressure Feature) — UUID
  reserved in `BloodPressureGATT` for a future capability check (e.g.
  whether the cuff supports irregular pulse detection); not read in this
  pass

### Measurement payload

See `BloodPressureMeasurementParser.swift` for the full byte layout and
`IEEE11073SFloat.swift` for the 16-bit SFLOAT decoder (4-bit exponent,
12-bit mantissa, `value = mantissa × 10^exponent`, with reserved bit
patterns for NaN / ±Infinity / "not at this resolution").

### Connection state machine

`BluetoothDeviceState`: `poweredOff → scanning → discovered → connecting →
connected → receivingReading`, with `disconnected` and `failed(reason)` as
recoverable end states. Every state exposes a `recoverySuggestion` string
— the UI never shows a bare error.

## 2. HealthKit

Implemented in `HealthKitManager.swift`.

| Type | Direction | Trigger |
|---|---|---|
| `HKQuantityType(.heartRate)` | Write | Every saved heart rate reading, if `healthKitWriteEnabled` |
| `HKCorrelationType(.bloodPressure)` (containing systolic + diastolic quantities) | Write | Every saved blood pressure reading, if `healthKitWriteEnabled` |
| `HKQuantityType(.heartRateVariabilitySDNN)` | Read-only authorization requested, not currently read | Reserved for a future HRV-from-Health display |
| Blood pressure correlation | Read | `readBloodPressureHistory(since:)`, if `healthKitReadEnabled` |

Read and write are independent toggles in Settings; both default to off.
VitalTrack never deletes or modifies a HealthKit sample it didn't write.

## 3. CSV import/export format

**Import** (`BloodPressureLogViewModel.importCsv`): `date,systolic,diastolic[,pulse]`
per row, `date` as ISO-8601 (`2026-07-24T09:15:00Z`). A non-numeric
systolic/diastolic on the first row is treated as a header and skipped;
on any later row it's a hard error naming the row number.

**Export** (`ExportManager.exportCsv`): `type,date,value_1,value_2,source,notes`
— `type` is `heart_rate` or `blood_pressure`; `value_1`/`value_2` are
bpm/HRV for heart rate rows and systolic/diastolic for blood pressure
rows. Dates are ISO-8601.

## 4. PDF export

Two variants from the same `ExportManager.exportPdf`, both US Letter:
- **Summary** — full reading tables, capped at 60 rows per section per page
  before paginating.
- **Doctor report** — same content, different title; reserved for future
  differentiation (e.g. a printed reference-range legend) without changing
  the underlying data model.

Every generated PDF opens with: *"VitalTrack is a wellness app, not a
diagnostic tool. Blood pressure readings were entered manually or
imported from a Bluetooth monitor / Apple Health — never estimated by
this app."*
