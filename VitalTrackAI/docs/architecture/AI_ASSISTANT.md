# VitalTrack AI — AI Assistant Architecture

**Version:** 1.0  
**Related:** [API_SPECIFICATIONS.md](API_SPECIFICATIONS.md), [prd/PRD.md](../prd/PRD.md)

> The assistant is **informational only and not medical advice**. It must **never diagnose**, prescribe, or claim that camera/fingerprint can measure blood pressure. BP context refers only to readings from FDA-cleared external monitors (manual, Bluetooth, HealthKit, CSV). Heart rate context may include camera PPG or Watch.

---

## 1. Goals

- Help users understand **patterns** in their logged data  
- Suggest **questions for clinicians**, not answers that replace clinicians  
- Work **offline** via heuristics; optional Premium cloud LLM with consent  
- Fail closed on safety violations  

---

## 2. High-level pipeline

```
User request / scheduled digest
        │
        ▼
Context Builder (local DB aggregates only)
        │
        ▼
Engine Router
   ├─ HeuristicEngine (always available)
   └─ LLMClient (Premium + consent + network)
        │
        ▼
Safety Validator (rules + classifier)
        │
        ├─ allowed → persist Insight → show UI + disclaimer
        ├─ rewritten → show rewritten
        └─ blocked → refusal template
```

---

## 3. Context Builder

Inputs (local):

- BP aggregates for window (count, avg/min/max sys/dia, source mix)
- HR aggregates (camera vs Watch clearly labeled)
- Personal targets (labeled non-diagnostic)
- Adherence (# days with ≥1 BP log)
- Optional lifestyle aggregates (sleep hours, exercise minutes, mood avg)

**Never include:** raw free-text notes by default; medication dose change advice; emergency biometrics beyond what’s logged.

Output: `InsightContext` Codable struct (matches API `stats` shape).

---

## 4. Offline Heuristic Engine

Deterministic rules, versioned (`heuristic_v1`).

| Rule ID | Trigger | Template (educational) |
|---------|---------|------------------------|
| `H_ADHERENCE_LOW` | Logged < 4 days in 7 | “You logged blood pressure on {n} of 7 days. Consistent home monitoring from your cuff can make trends clearer for you and your clinician. Informational only — not medical advice.” |
| `H_MORNING_EVENING` | Evening avg sys − morning ≥ threshold | “Evening readings were often higher than mornings in this window. Consider noting measurement timing when you talk with your clinician.” |
| `H_NEAR_TARGET` | ≥70% readings within personal band | “Most readings were near your personal targets this week. Personal targets are not a diagnosis.” |
| `H_VARIABILITY` | High stddev | “Your readings varied more than last week. Variability has many causes; a clinician can help interpret your home log.” |
| `H_HR_RESTING` | Camera/Watch HR avg change | “Your average heart rate (PPG/Watch) changed vs the prior period. This is not blood pressure.” |
| `H_SOURCE_MIX` | Always educational | “Blood pressure entries came from: {sources}. Camera measures heart rate only, not blood pressure.” |

Rules emit `citations` (date range + metric).  
If insufficient data: empty-state guidance, not speculation.

---

## 5. Optional LLM Engine

### Preconditions

1. Premium entitlement active  
2. Explicit cloud AI consent  
3. Network available  
4. Safety constraints flag in request  

### Prompt safety rules (system)

Mandatory system instructions:

1. You are a wellness journaling assistant for VitalTrack AI, not a doctor.  
2. Always include: “This is informational only and not medical advice.”  
3. Never diagnose (e.g., hypertension, hypotension, arrhythmia).  
4. Never recommend starting/stopping/changing medications or doses.  
5. Never claim phone camera, flash, or fingerprint can measure blood pressure.  
6. Blood pressure data is from external monitors the user logged/imported.  
7. Heart rate may be from PPG camera or Apple Watch — label correctly.  
8. For urgent symptoms (chest pain, stroke signs, severe distress), tell user to seek emergency care; do not triage beyond that.  
9. Prefer describing aggregates and suggesting clinician questions.  
10. If asked to diagnose, refuse and explain why.  
11. Do not invent readings.  
12. Keep tone calm, clear, non-alarmist.

### Output schema

LLM must return JSON matching `Insight` schema; non-conforming → treat as error → heuristic fallback.

---

## 6. Safety Validator

Runs on **all** engines before UI.

| Check | Action |
|-------|--------|
| Diagnosis lexicon (`you have hypertension`, `you are prediabetic`, ICD-like claims) | Block or rewrite |
| Dosing / drug interaction advice | Block |
| Camera BP claims | Block + corrective sentence |
| Missing disclaimer | Rewrite: append disclaimer |
| Emergency self-harm / acute symptom coaching beyond redirect | Block → emergency template |
| Invented numbers not in context | Block |
| Absolute guarantees (“will prevent stroke”) | Block |

Implementation: rule-based first; optional on-device NLP classifier later.  
`safety_verdict` persisted: `allowed|rewritten|blocked`.

---

## 7. Refusal examples

**User:** “Do I have hypertension?”  
**Assistant:** “I can’t diagnose hypertension or any condition. I can help you summarize the blood pressure values you logged from your external monitors to discuss with a qualified clinician. This is informational only and not medical advice. If you have urgent symptoms, seek emergency care.”

**User:** “Measure my BP with the camera.”  
**Assistant:** “VitalTrack can’t measure blood pressure with the camera. The camera is for heart rate (PPG) only. Log BP using a FDA-cleared cuff (manual, Bluetooth), HealthKit, or CSV import.”

**User:** “Should I double my medication?”  
**Assistant:** “I can’t advise on medication changes. Please ask the clinician who prescribed your medication.”

---

## 8. UI integration

- `VTDisclaimerBanner` always visible on AI screens  
- Engine badge: Offline / Cloud  
- Citations expandable  
- Share appends disclaimer automatically  
- Paywall for cloud features shows Free vs Premium without dark patterns  

---

## 9. Storage

See `insights` table in [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md).  
User can delete insight history. Cloud prompts retained per Privacy Policy (minimize; prefer aggregates).

---

## 10. Evaluation & QA

| Test type | Examples |
|-----------|----------|
| Golden prompts | Diagnosis asks → refusal |
| Claim probes | Camera BP → correction |
| Numeric fidelity | Avg in output matches fixture |
| Fuzz | Random user strings |
| Regression | Snapshot heuristic outputs |

Ship gate: 100% pass on safety suite for blocked categories.

---

## 11. Observability

Log: `engine`, `safety_verdict`, latency, error codes — **not** raw health stats or user message bodies in third-party analytics.

---

*End of AI Assistant Architecture.*
