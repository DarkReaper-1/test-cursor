# VitalTrack AI — API Specifications

**Version:** 1.0  
**Mode:** Offline-first; cloud optional  
**Formats:** JSON over HTTPS (TLS 1.2+)  
**Related:** [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md), [AI_ASSISTANT.md](AI_ASSISTANT.md)

> Local repositories are the source of truth. Cloud APIs never invent blood pressure from camera data. All AI responses must remain informational — not medical advice.

---

## 1. Local “API” (in-process)

Feature code talks to use cases / repositories — not REST. For export/share and debugging, the app can produce JSON documents conforming to schemas below.

### 1.1 Full data export (`application/json`)

```json
{
  "schemaVersion": 1,
  "exportedAt": "2026-07-25T12:00:00Z",
  "appVersion": "1.0.0",
  "disclaimer": "This is informational only and not medical advice.",
  "profile": {
    "id": "uuid",
    "pressureUnit": "mmHg",
    "disclaimerAcceptedAt": "2026-07-01T10:00:00Z",
    "cloudAiConsentAt": null,
    "icloudSyncEnabled": false
  },
  "goals": [
    {
      "kind": "bpPersonal",
      "systolicTarget": 120,
      "diastolicTarget": 80,
      "notes": "Personal target — not a diagnosis"
    }
  ],
  "bpReadings": [
    {
      "id": "uuid",
      "systolic": 128,
      "diastolic": 82,
      "pulse": 70,
      "recordedAt": "2026-07-25T11:00:00Z",
      "arm": "left",
      "posture": "sitting",
      "notes": null,
      "tags": ["morning"],
      "sourceType": "bluetooth",
      "deviceNameSnapshot": "Omron",
      "healthkitUuid": null
    }
  ],
  "hrReadings": [
    {
      "id": "uuid",
      "bpm": 72,
      "recordedAt": "2026-07-25T10:30:00Z",
      "durationSeconds": 30,
      "confidence": 0.92,
      "sourceType": "cameraPPG"
    }
  ],
  "devices": [],
  "medications": [],
  "reminders": [],
  "moodLogs": [],
  "waterLogs": [],
  "sleepLogs": [],
  "exerciseLogs": [],
  "insights": []
}
```

**Validation rules**
- `bpReadings[].sourceType` ∈ `manual|bluetooth|healthKit|csv`
- `hrReadings[].sourceType` ∈ `cameraPPG|healthKit|appleWatch`
- Reject export mutation that would add BP from `cameraPPG`

### 1.2 CSV export (BP)

Header:

```
id,recorded_at,systolic_mmhg,diastolic_mmhg,pulse,source_type,device_name,arm,posture,notes
```

---

## 2. Optional cloud API

Base URL (prod): `https://api.vitaltrack.app/v1`  
Auth: Sign in with Apple → app-issued JWT (only if user enables cloud features).  
**Default app usage requires no account.**

### 2.1 Common headers

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <jwt>` |
| `Content-Type` | `application/json` |
| `X-App-Version` | `1.0.0` |
| `X-Client-Platform` | `ios` |
| `Accept-Language` | `en-US` |

### 2.2 Error envelope

```json
{
  "error": {
    "code": "consent_required",
    "message": "Cloud AI consent is required.",
    "retryable": false
  }
}
```

| HTTP | Meaning |
|------|---------|
| 400 | Validation |
| 401 | Auth |
| 402 | Premium required |
| 403 | Consent / privacy |
| 409 | Sync conflict |
| 429 | Rate limit |
| 5xx | Server |

---

## 3. Sync API (optional CloudKit preferred; REST alternative)

Prefer **CloudKit Private Database** for iCloud sync. REST below is an alternative private backend.

### 3.1 `POST /sync/push`

```json
{
  "deviceId": "uuid",
  "changes": [
    {
      "entity": "bpReading",
      "op": "upsert",
      "version": 3,
      "payload": {
        "id": "uuid",
        "systolic": 128,
        "diastolic": 82,
        "recordedAt": "2026-07-25T11:00:00Z",
        "sourceType": "manual",
        "updatedAt": "2026-07-25T11:01:00Z",
        "deletedAt": null
      }
    }
  ]
}
```

**Response `200`**

```json
{
  "accepted": ["uuid"],
  "conflicts": [
    {
      "id": "uuid",
      "serverVersion": 4,
      "serverPayload": {},
      "clientVersion": 3
    }
  ]
}
```

### 3.2 `GET /sync/pull?since=<iso>&limit=200`

Returns `changes[]` same shape. Clients merge with last-write-wins + user-visible conflict UI for divergent edits.

**Privacy:** Server stores only for syncing user’s private data; no ad use; retention per Privacy Policy.

---

## 4. AI insight API (Premium + consent)

### 4.1 `POST /ai/insights`

**Preconditions:** Active Premium entitlement; `cloudAiConsentAt` set; payload minimized.

**Request**

```json
{
  "requestId": "uuid",
  "locale": "en-US",
  "mode": "summary",
  "userMessage": "How did my morning readings look this week?",
  "dataWindow": {
    "start": "2026-07-18T00:00:00Z",
    "end": "2026-07-25T23:59:59Z"
  },
  "stats": {
    "bpCount": 14,
    "bpSources": ["manual", "bluetooth"],
    "systolicAvg": 128.4,
    "diastolicAvg": 81.2,
    "systolicMin": 118,
    "systolicMax": 142,
    "hrCount": 6,
    "hrAvg": 70.5,
    "personalTargets": { "systolic": 120, "diastolic": 80 },
    "adherence": { "bpDaysLogged": 6, "bpDaysPossible": 7 }
  },
  "constraints": {
    "mustIncludeDisclaimer": true,
    "forbidDiagnosis": true,
    "forbidCameraBpClaims": true,
    "forbidDosingAdvice": true
  }
}
```

**Notes:** Prefer aggregated `stats` over raw reading lists. If raw samples are ever sent, strip notes that may contain PHI beyond need; document in Privacy Policy.

**Response `200`**

```json
{
  "requestId": "uuid",
  "engine": "llm",
  "safetyVerdict": "allowed",
  "insight": {
    "title": "Morning pattern this week",
    "body": "Across 14 blood pressure readings from your external monitors (manual and Bluetooth), mornings were closer to your personal targets than evenings. This is informational only and not medical advice.",
    "citations": [
      { "type": "range", "start": "2026-07-18", "end": "2026-07-25", "metric": "bp" }
    ],
    "suggestedClinicianQuestions": [
      "Would you like to review my home morning vs evening pattern?"
    ]
  }
}
```

**Response `200` with block**

```json
{
  "requestId": "uuid",
  "engine": "llm",
  "safetyVerdict": "blocked",
  "insight": null,
  "refusal": {
    "code": "diagnosis_request",
    "message": "I can’t diagnose conditions or interpret readings as a clinician would. Please consult a qualified healthcare professional. If you have urgent symptoms, seek emergency care."
  }
}
```

### 4.2 Rate limits

| Plan | Limit |
|------|-------|
| Premium | 30 requests / day / user |
| Burst | 5 / minute |

---

## 5. Entitlement verify (optional server)

### `POST /subscriptions/verify`

```json
{
  "jwsTransaction": "<StoreKit 2 JWS>"
}
```

Response: `{ "productId": "…", "isActive": true, "expiresAt": "…" }`  
Client still trusts StoreKit locally for offline unlock of non-cloud Premium features.

---

## 6. Support / telemetry (non-health)

If analytics enabled: event names only (`onboarding_completed`, `bp_saved`, `hr_saved`) with **booleans/counters**, never systolic/diastolic/bpm values or free-text notes.

---

## 7. Versioning

- URL `/v1`; additive fields OK.  
- Breaking changes → `/v2`.  
- Clients send `schemaVersion` in exports.

---

## 8. Security checklist

- [ ] No camera-derived BP fields accepted by any endpoint (schema reject)  
- [ ] Cloud AI requires consent claim in JWT or profile flag  
- [ ] PII minimized  
- [ ] Audit logs without raw health payloads  
- [ ] Data deletion endpoint `DELETE /me` when accounts exist  

### `DELETE /me`

Deletes cloud copies; returns `202` accepted. Client still wipes local DB separately.

---

*End of API Specifications.*
