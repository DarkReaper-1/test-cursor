# VitalTrack — Database schema

Core Data model `VitalTrack.xcdatamodeld`, to be created in Xcode's model
editor (see `SETUP.md` §4). Both entities use **Codegen: Manual/None** —
the corresponding `NSManagedObject` subclasses are hand-written in
`Sources/VitalTrackCore/Persistence/` and must match this exactly.

## Entity: `HeartRateReadingEntity`

| Attribute | Type | Notes |
|---|---|---|
| `id` | UUID | Not optional, indexed |
| `takenAt` | Date | Not optional, indexed (used for range queries) |
| `bpm` | Integer 16 | Not optional |
| `hrvRMSSDMs` | Double (as `NSNumber?`) | Optional — only present for camera readings with a stable-enough signal |
| `sourceRaw` | String | Not optional. One of `camera` / `appleWatch` / `manual`, matching `HeartRateSource.rawValue` |

## Entity: `BloodPressureReadingEntity`

| Attribute | Type | Notes |
|---|---|---|
| `id` | UUID | Not optional, indexed |
| `takenAt` | Date | Not optional, indexed |
| `systolic` | Integer 16 | Not optional |
| `diastolic` | Integer 16 | Not optional |
| `pulse` | Integer 16 (as `NSNumber?`) | Optional — present when the cuff or user provides it |
| `sourceRaw` | String | Not optional. One of `manual` / `bluetoothCuff` / `appleHealthImport` / `csvImport`, matching `BloodPressureSource.rawValue` |
| `notes` | String? | Optional, user-entered |

## Indexes

Both entities index `takenAt` — every read path (`heartRateReadings(since:)`,
`bloodPressureReadings(since:)`, latest-reading lookups) filters or sorts
on it, and history is expected to grow to thousands of rows over a year of
daily logging.

## Why not a `referenceRange` column

`BloodPressureReading.referenceRange` (Normal/Elevated/Stage 1/Stage
2/Crisis) is computed from `systolic`/`diastolic` at read time
(`BloodPressureReading.swift`), not stored. If the underlying AHA
thresholds are ever revised, historical readings should be
re-categorized against the *current* thresholds rather than frozen at
whatever they were the day they were logged — a derived property makes
that automatic.

## Sync

`PersistenceController` swaps `NSPersistentContainer` for
`NSPersistentCloudKitContainer` when the user turns on iCloud sync in
Settings (`SettingsStore.iCloudSyncEnabled`) — same schema, Apple's own
CloudKit-backed sync, no VitalTrack server involved. This needs a
matching CloudKit container configured in the app's iCloud capability in
Xcode; not configured in this pass since it requires an Apple Developer
account.

## What's deliberately not modeled yet

Medication, water intake, sleep, exercise, mood, and stress each need
their own entity (and, for medication, a schedule/adherence model) — none
are stored because none are built as real features in this pass. Adding
one later means a new entity plus a new `Reading`-shaped repository, not a
change to the two entities above.
