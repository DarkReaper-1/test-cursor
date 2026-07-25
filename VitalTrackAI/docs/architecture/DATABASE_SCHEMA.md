# VitalTrack AI — Database Schema

**Version:** 1.0  
**Persistence:** SQLite (GRDB) with SQLCipher encryption — Core Data optional wrapper not required for v1  
**Related:** [SWIFT_PROJECT_ARCHITECTURE.md](SWIFT_PROJECT_ARCHITECTURE.md), [API_SPECIFICATIONS.md](API_SPECIFICATIONS.md)

> Offline-first. Health data encrypted at rest. Blood pressure rows must always carry a valid `source_type` from the allowed set. Camera PPG stores heart rate only — never BP fields.

---

## 1. Design principles

1. **Encrypted at rest** — SQLCipher; key in Keychain (whenUnlockedThisDeviceOnly or afterFirstUnlock per threat model).
2. **Soft deletes** when iCloud/sync enabled (`deleted_at`); hard delete for “Delete all data.”
3. **Source integrity** — CHECK constraints on BP/HR sources.
4. **Idempotent imports** — unique keys for HealthKit UUIDs and CSV batch row hashes.
5. **UTC storage** — `recorded_at` as ISO-8601 / unix ms; display in local TZ.

---

## 2. Entity relationship (overview)

```
profile ─┬─ goals
         ├─ medications ── medication_doses
         ├─ reminders
         ├─ devices ── bp_readings
         ├─ bp_readings
         ├─ hr_readings
         ├─ mood_logs / water_logs / sleep_logs / exercise_logs
         ├─ insights
         ├─ import_batches
         └─ sync_metadata
```

---

## 3. Tables

### 3.1 `profile`

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| display_name | TEXT NULL | Local only |
| birth_year | INTEGER NULL | |
| biological_sex | TEXT NULL | `female\|male\|other\|preferNotToSay` |
| pressure_unit | TEXT NOT NULL DEFAULT `'mmHg'` | `mmHg\|kPa` |
| weight_unit | TEXT NOT NULL DEFAULT `'lb'` | `lb\|kg` |
| onboarding_completed_at | TEXT NULL | |
| disclaimer_accepted_at | TEXT NOT NULL | Required |
| cloud_ai_consent_at | TEXT NULL | |
| icloud_sync_enabled | INTEGER NOT NULL DEFAULT 0 | |
| app_lock_enabled | INTEGER NOT NULL DEFAULT 0 | |
| created_at | TEXT NOT NULL | |
| updated_at | TEXT NOT NULL | |

### 3.2 `goals`

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | |
| profile_id | TEXT NOT NULL FK | |
| kind | TEXT NOT NULL | `bpPersonal\|hrResting\|waterDaily\|…` |
| systolic_target | INTEGER NULL | Personal — not diagnosis |
| diastolic_target | INTEGER NULL | |
| hr_target | INTEGER NULL | |
| water_cups_target | INTEGER NULL | |
| notes | TEXT NULL | |
| created_at | TEXT NOT NULL | |
| updated_at | TEXT NOT NULL | |

**Constraint:** BP goals labeled in UI as personal targets only.

### 3.3 `devices`

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | |
| name | TEXT NOT NULL | User-facing |
| kind | TEXT NOT NULL | `bpCuff\|scale` |
| transport | TEXT NOT NULL | `bluetooth\|manualOnly` |
| manufacturer | TEXT NULL | |
| model | TEXT NULL | |
| bluetooth_identifier | TEXT NULL | Peripheral UUID |
| is_preferred | INTEGER NOT NULL DEFAULT 0 | |
| last_connected_at | TEXT NULL | |
| created_at | TEXT NOT NULL | |
| updated_at | TEXT NOT NULL | |
| deleted_at | TEXT NULL | |

**Index:** `idx_devices_bt_id` UNIQUE on `bluetooth_identifier` WHERE not deleted.

### 3.4 `bp_readings`

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | |
| systolic | INTEGER NOT NULL | mmHg canonical |
| diastolic | INTEGER NOT NULL | mmHg canonical |
| pulse | INTEGER NULL | |
| recorded_at | TEXT NOT NULL | |
| arm | TEXT NULL | `left\|right\|unknown` |
| posture | TEXT NULL | `sitting\|lying\|standing\|unknown` |
| notes | TEXT NULL | |
| tags_json | TEXT NULL | JSON array |
| source_type | TEXT NOT NULL | CHECK below |
| device_id | TEXT NULL FK | |
| device_name_snapshot | TEXT NULL | |
| healthkit_uuid | TEXT NULL | |
| import_batch_id | TEXT NULL FK | |
| csv_row_hash | TEXT NULL | |
| is_user_edited | INTEGER NOT NULL DEFAULT 0 | |
| created_at | TEXT NOT NULL | |
| updated_at | TEXT NOT NULL | |
| deleted_at | TEXT NULL | |

**CHECK:** `source_type IN ('manual','bluetooth','healthKit','csv')`  
**CHECK:** `systolic > diastolic` AND ranges sanity (`systolic BETWEEN 50 AND 300`, `diastolic BETWEEN 30 AND 200`)  
**Forbidden:** any source implying camera/fingerprint BP.

**Indexes**
- `idx_bp_recorded_at` on (`recorded_at DESC`) WHERE `deleted_at IS NULL`
- `idx_bp_source` on (`source_type`)
- `idx_bp_healthkit` UNIQUE on (`healthkit_uuid`) WHERE `healthkit_uuid IS NOT NULL`
- `idx_bp_csv_hash` UNIQUE on (`import_batch_id`,`csv_row_hash`) WHERE `csv_row_hash IS NOT NULL`

### 3.5 `hr_readings`

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | |
| bpm | INTEGER NOT NULL | |
| recorded_at | TEXT NOT NULL | |
| duration_seconds | INTEGER NULL | |
| confidence | REAL NULL | 0…1 |
| notes | TEXT NULL | |
| source_type | TEXT NOT NULL | `cameraPPG\|healthKit\|appleWatch` |
| healthkit_uuid | TEXT NULL | |
| created_at | TEXT NOT NULL | |
| updated_at | TEXT NOT NULL | |
| deleted_at | TEXT NULL | |

**CHECK:** `source_type IN ('cameraPPG','healthKit','appleWatch')`  
**CHECK:** `bpm BETWEEN 30 AND 250`  
**Note:** No systolic/diastolic columns — prevents misuse.

**Indexes:** `idx_hr_recorded_at`, UNIQUE `healthkit_uuid` where present.

### 3.6 `medications`

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | |
| name | TEXT NOT NULL | User-entered |
| dosage_text | TEXT NULL | Free text — not advice |
| schedule_json | TEXT NOT NULL | Cron-like / weekday times |
| is_active | INTEGER NOT NULL DEFAULT 1 | |
| created_at | TEXT NOT NULL | |
| updated_at | TEXT NOT NULL | |
| deleted_at | TEXT NULL | |

### 3.7 `medication_doses`

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | |
| medication_id | TEXT NOT NULL FK | |
| scheduled_at | TEXT NOT NULL | |
| taken_at | TEXT NULL | |
| status | TEXT NOT NULL | `pending\|taken\|skipped` |
| created_at | TEXT NOT NULL | |

**Index:** `idx_med_doses_sched` on (`scheduled_at`).

### 3.8 `reminders`

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | |
| kind | TEXT NOT NULL | `bp\|medication\|insightDigest` |
| fire_time_local | TEXT NOT NULL | HH:mm |
| days_of_week_json | TEXT NOT NULL | |
| medication_id | TEXT NULL FK | |
| is_enabled | INTEGER NOT NULL DEFAULT 1 | |
| created_at | TEXT NOT NULL | |
| updated_at | TEXT NOT NULL | |

### 3.9 `mood_logs`

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | |
| recorded_at | TEXT NOT NULL | |
| mood | INTEGER NOT NULL | 1–5 |
| notes | TEXT NULL | |
| created_at | TEXT NOT NULL | |
| deleted_at | TEXT NULL | |

### 3.10 `water_logs`

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | |
| recorded_at | TEXT NOT NULL | |
| cups | REAL NOT NULL | |
| created_at | TEXT NOT NULL | |
| deleted_at | TEXT NULL | |

### 3.11 `sleep_logs`

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | |
| start_at | TEXT NOT NULL | |
| end_at | TEXT NOT NULL | |
| source_type | TEXT NOT NULL | `manual\|healthKit` |
| healthkit_uuid | TEXT NULL | |
| created_at | TEXT NOT NULL | |
| deleted_at | TEXT NULL | |

### 3.12 `exercise_logs`

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | |
| recorded_at | TEXT NOT NULL | |
| activity_type | TEXT NOT NULL | |
| duration_minutes | INTEGER NOT NULL | |
| source_type | TEXT NOT NULL | `manual\|healthKit` |
| healthkit_uuid | TEXT NULL | |
| created_at | TEXT NOT NULL | |
| deleted_at | TEXT NULL | |

### 3.13 `insights`

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | |
| generated_at | TEXT NOT NULL | |
| engine | TEXT NOT NULL | `heuristic\|llm` |
| title | TEXT NOT NULL | |
| body | TEXT NOT NULL | |
| citations_json | TEXT NOT NULL | Reading ids / ranges |
| safety_verdict | TEXT NOT NULL | `allowed\|rewritten\|blocked` |
| user_prompt | TEXT NULL | |
| created_at | TEXT NOT NULL | |
| deleted_at | TEXT NULL | |

**Rule:** Persist only after safety validation; blocked outputs stored optionally for analytics without user display.

### 3.14 `import_batches`

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | |
| source_type | TEXT NOT NULL | `csv\|healthKit` |
| file_name | TEXT NULL | |
| started_at | TEXT NOT NULL | |
| finished_at | TEXT NULL | |
| accepted_count | INTEGER NOT NULL DEFAULT 0 | |
| skipped_count | INTEGER NOT NULL DEFAULT 0 | |
| error_count | INTEGER NOT NULL DEFAULT 0 | |
| error_summary_json | TEXT NULL | |

### 3.15 `sync_metadata`

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | Single row or per-record |
| entity_table | TEXT NOT NULL | |
| entity_id | TEXT NOT NULL | |
| version | INTEGER NOT NULL DEFAULT 1 | |
| last_local_mutation_at | TEXT NOT NULL | |
| last_synced_at | TEXT NULL | |
| cloud_record_id | TEXT NULL | CloudKit record name |
| sync_status | TEXT NOT NULL | `pending\|synced\|conflict\|error` |
| conflict_payload_json | TEXT NULL | |

**Unique:** (`entity_table`,`entity_id`)

### 3.16 `subscription_entitlements` (local cache)

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | |
| product_id | TEXT NOT NULL | |
| is_active | INTEGER NOT NULL | |
| expires_at | TEXT NULL | |
| last_verified_at | TEXT NOT NULL | |
| source | TEXT NOT NULL | `storeKit` |

---

## 4. Encryption notes

| Topic | Approach |
|-------|----------|
| DB file | SQLCipher AES-256; page size 4096 |
| Key | 256-bit random in Keychain; not backed up if device-only accessibility chosen |
| Exports | User-initiated plaintext CSV/JSON via Share Sheet — warn on export |
| Logs | No BP/HR values in os_log |
| Screenshots | App Lock + warn in Privacy FAQ |
| CloudKit | Optional; encrypt sensitive fields if custom; prefer Private CloudKit DB |

---

## 5. Migration strategy

Framework: sequential migrations `v1 → v2 → …` applied on launch inside a transaction.

1. **Version table** `schema_migrations(version INTEGER PRIMARY KEY, applied_at TEXT)`.
2. **Expand/contract** for breaking changes; never drop columns without a bridge release.
3. **Data migrations** for CHECK changes run validators; invalid BP sources quarantined to `import_batches` errors (should not occur).
4. **Key rotation:** re-key SQLCipher with ATTACH/export pattern; rare; gated feature flag.
5. **Tests:** Each migration has a fixture DB from previous version; CI runs upgrade.

### v1 baseline

Creates all tables above. Seed: empty profile row created at onboarding completion.

### Future examples

- v2: add `bp_readings.measurement_context`  
- v3: scale_readings table  
- v4: multi-profile (if ever approved)

---

## 6. Query patterns (representative)

```sql
-- Latest BP for dashboard
SELECT * FROM bp_readings
WHERE deleted_at IS NULL
ORDER BY recorded_at DESC
LIMIT 1;

-- Analytics range
SELECT systolic, diastolic, recorded_at, source_type
FROM bp_readings
WHERE deleted_at IS NULL
  AND recorded_at BETWEEN ? AND ?
ORDER BY recorded_at ASC;

-- Dedup HealthKit
INSERT INTO bp_readings (…)
ON CONFLICT(healthkit_uuid) DO NOTHING;
```

---

## 7. Delete all data

1. Disable sync observers.  
2. Wipe SQLCipher file + WAL/SHM.  
3. Delete Keychain DB key (and regenerate on next launch).  
4. Clear caches, insight files, pending notifications.  
5. Best-effort CloudKit zone delete if enabled.  
6. Reset onboarding flag.

---

## 8. Core Data note

If the team later prefers Core Data: mirror entities 1:1; still enforce source CHECKs in repository layer; store SQLite encrypted via app-level file protection + SQLCipher-compatible stack or Apple Data Protection (complete protection) as defense-in-depth. Repository interfaces remain identical.

---

*End of Database Schema.*
