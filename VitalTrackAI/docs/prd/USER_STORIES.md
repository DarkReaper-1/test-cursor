# VitalTrack AI — User Stories

**Version:** 1.0  
**Related:** [PRD.md](PRD.md)

> Blood pressure comes **only** from FDA-cleared external monitors (manual, Bluetooth cuff, HealthKit, CSV). Camera / flash / Apple Watch = **heart rate (PPG) only**. All insights are informational only and not medical advice.

---

## Epic: Onboarding

### US-ONB-001 — First launch trust framing
**As a** new user,  
**I want** to understand what VitalTrack can and cannot measure,  
**so that** I don’t expect camera-based blood pressure.

**Acceptance criteria**
- [ ] Welcome flow includes an explicit statement that camera/flash/Watch measure heart rate only, not blood pressure.
- [ ] BP is described as coming from external FDA-cleared monitors via manual, Bluetooth, HealthKit, or CSV.
- [ ] User must acknowledge: “This is informational only and not medical advice.”
- [ ] Skip is not available for the medical disclaimer step; Continue requires acknowledgment (checkbox or explicit button).
- [ ] Copy is VoiceOver-accessible and supports Dynamic Type.

### US-ONB-002 — HealthKit permission
**As a** user in the Apple health ecosystem,  
**I want** a clear explanation before HealthKit access is requested,  
**so that** I can choose what to share.

**Acceptance criteria**
- [ ] Pre-permission screen lists types requested (read/write) in plain language.
- [ ] User can Continue (system sheet) or Not Now without being blocked from the app.
- [ ] Denying HealthKit still allows manual BP and camera HR.
- [ ] Settings later can re-prompt or deep-link to system Health access.

### US-ONB-003 — Units and personal targets
**As a** careful tracker,  
**I want** to set units and personal BP targets,  
**so that** charts match how I and my clinician talk about numbers.

**Acceptance criteria**
- [ ] Default unit mmHg; optional kPa if supported.
- [ ] Personal systolic/diastolic targets are labeled “personal goals, not a diagnosis.”
- [ ] Targets are editable later in Settings.
- [ ] No language implying clinical hypertension staging.

### US-ONB-004 — Notification opt-in
**As a** user who needs reminders,  
**I want** to choose notification permission during onboarding,  
**so that** I’m not surprised by prompts later.

**Acceptance criteria**
- [ ] Explains reminder use cases (BP check, medication) before system prompt.
- [ ] Not Now is respected; reminders UI shows how to enable later.
- [ ] No fake “enable notifications to continue” hard gate.

---

## Epic: Heart Rate

### US-HR-001 — Camera PPG measurement
**As a** user,  
**I want** to measure heart rate with the camera and flash,  
**so that** I can capture resting HR without a Watch.

**Acceptance criteria**
- [ ] Screen title/subtitle state “Heart rate (PPG)” — never “blood pressure.”
- [ ] Guidance for finger placement and keeping still.
- [ ] Session shows live BPM estimate + signal quality.
- [ ] Low-quality sessions can be discarded with explanation.
- [ ] Saved reading stores source = `cameraPPG`, timestamp, duration, confidence.
- [ ] Disclaimer visible: informational only, not medical advice.
- [ ] Camera/mic permissions handled with recovery paths (see Error Handling).

### US-HR-002 — Cancel or retake
**As a** user with a poor signal,  
**I want** to cancel or retake,  
**so that** bad data doesn’t pollute my history.

**Acceptance criteria**
- [ ] Cancel discards unsaved session.
- [ ] Retake starts a new session without saving the failed one.
- [ ] Accidental backgrounding pauses safely and explains resume/restart.

### US-HR-003 — HealthKit / Watch HR
**As a** Watch user,  
**I want** my Apple Watch heart rate in VitalTrack,  
**so that** I don’t re-measure unnecessarily.

**Acceptance criteria**
- [ ] Imports HR samples when HealthKit read is authorized.
- [ ] Source badge shows HealthKit / Watch where available.
- [ ] Never maps Watch data to blood pressure fields.
- [ ] Observer/query refresh documented and tested.

### US-HR-004 — HR history
**As a** quantified-self user,  
**I want** to browse past HR sessions,  
**so that** I can see resting trends.

**Acceptance criteria**
- [ ] List sorted by time; filter by source (camera, HealthKit).
- [ ] Detail shows confidence and notes if any.
- [ ] Delete with confirmation.

---

## Epic: Blood Pressure

### US-BP-001 — Manual entry
**As a** cuff user,  
**I want** to enter systolic and diastolic manually,  
**so that** any FDA-cleared monitor works even without Bluetooth.

**Acceptance criteria**
- [ ] Required: systolic, diastolic, datetime; optional pulse, arm, posture, notes, tags.
- [ ] Validation ranges with warnings (not hard medical claims); block impossible values (e.g., dia ≥ sys).
- [ ] Source stored as `manual`.
- [ ] Success returns to Dashboard/History with confirmation.
- [ ] Disclaimer on form.

### US-BP-002 — Bluetooth cuff reading
**As a** user with a compatible cuff,  
**I want** readings to arrive over Bluetooth,  
**so that** I avoid transcription errors.

**Acceptance criteria**
- [ ] Flow uses Device pairing; shows connection state.
- [ ] On success, creates BP reading with source `bluetooth` + device id/name.
- [ ] Failure offers Manual entry fallback.
- [ ] Never implies the phone measured BP itself.

### US-BP-003 — HealthKit BP import
**As a** user with BP already in Health,  
**I want** to import those samples,  
**so that** my history is complete.

**Acceptance criteria**
- [ ] User-initiated import and/or observer sync when authorized.
- [ ] Deduplication by HealthKit UUID / equivalent.
- [ ] Source `healthKit` with original source name when available.
- [ ] Permission denied shows actionable recovery.

### US-BP-004 — CSV import
**As a** user with exported cuff software data,  
**I want** to import a CSV,  
**so that** I can migrate history.

**Acceptance criteria**
- [ ] File picker + column mapping UI.
- [ ] Validation report: accepted / skipped / errored rows.
- [ ] Source `csv` with import batch id.
- [ ] Partial success allowed with summary.

### US-BP-005 — Edit and delete
**As a** careful tracker,  
**I want** to correct mistakes,  
**so that** my clinician report stays accurate.

**Acceptance criteria**
- [ ] Edit allowed for manual/CSV; HealthKit-origin edits follow policy (note or unlink—documented).
- [ ] Delete requires confirmation; sync metadata updated.
- [ ] Audit fields: `updatedAt`, `deletedAt` soft-delete if sync-enabled.

### US-BP-006 — Personal targets display
**As a** user with clinician-advised home targets,  
**I want** my entries compared to my personal goals,  
**so that** I see context without a diagnosis label.

**Acceptance criteria**
- [ ] Comparison copy uses “your personal target,” not “hypertensive.”
- [ ] Color cues explained in Help as educational.
- [ ] Disclaimer present on analytics views.

---

## Epic: Devices

### US-DEV-001 — Discover and pair BP cuff
**As a** caregiver,  
**I want** to pair a Bluetooth BP cuff,  
**so that** my parent’s readings sync reliably.

**Acceptance criteria**
- [ ] Scan lists nearby compatible peripherals.
- [ ] Pairing success persists device record.
- [ ] Incompatible devices show “not supported” + Manual/CSV alternatives.
- [ ] Help link to compatibility list.

### US-DEV-002 — Connection recovery
**As a** user whose cuff disconnected,  
**I want** clear recovery steps,  
**so that** I can finish a measurement.

**Acceptance criteria**
- [ ] Error states match [ERROR_HANDLING.md](../architecture/ERROR_HANDLING.md) catalog.
- [ ] Retry, Re-pair, and Manual entry CTAs available.
- [ ] No infinite spinner without timeout messaging.

### US-DEV-003 — Forget device
**As a** user upgrading hardware,  
**I want** to remove an old cuff,  
**so that** the app doesn’t try to reconnect.

**Acceptance criteria**
- [ ] Forget removes local pairing record and stops auto-connect.
- [ ] Historical readings remain with last known device name.

### US-DEV-004 — Weight scale (v1.1)
**As a** user tracking weight with BP,  
**I want** to pair a BLE scale,  
**so that** weight trends appear alongside cardiovascular metrics.

**Acceptance criteria**
- [ ] Uses DeviceAdapter for scales; optional in v1.1.
- [ ] Readings stored separately from BP; never labeled as BP.

---

## Epic: AI Insights

### US-AI-001 — Offline heuristic insight
**As a** privacy-maximalist user,  
**I want** insights without cloud,  
**so that** my data stays on device.

**Acceptance criteria**
- [ ] Insights generated from local heuristics when enough data exists.
- [ ] Each insight includes disclaimer: informational only, not medical advice.
- [ ] No diagnostic language; safety rules from [AI_ASSISTANT.md](../architecture/AI_ASSISTANT.md).
- [ ] Empty state explains how many readings are needed.

### US-AI-002 — Optional cloud LLM insight
**As a** Premium user who consents,  
**I want** richer natural-language summaries,  
**so that** I can prepare questions for my clinician.

**Acceptance criteria**
- [ ] Explicit consent before any health summary leaves device.
- [ ] Paywall if not Premium; comparison of Free vs Premium clear.
- [ ] Server responses pass safety validation; failures fall back to heuristics.
- [ ] User can revoke cloud AI in Settings.

### US-AI-003 — Refuse unsafe requests
**As a** user asking “Do I have hypertension?”,  
**I want** a safe refusal,  
**so that** I’m redirected to professional care.

**Acceptance criteria**
- [ ] Assistant refuses diagnosis / dosing / emergency triage.
- [ ] Suggests contacting emergency services for acute symptoms (generic safety copy).
- [ ] Offers educational framing and clinician discussion prompts instead.

### US-AI-004 — Insight history
**As a** user,  
**I want** to revisit past insights,  
**so that** I can track what the app previously noted.

**Acceptance criteria**
- [ ] List of generated insights with timestamps.
- [ ] Tap opens detail with data citations (dates/ranges used).
- [ ] User can delete insight history.

---

## Epic: Dashboard

### US-DASH-001 — Today at a glance
**As a** daily user,  
**I want** latest BP and HR on one screen,  
**so that** I know my status quickly.

**Acceptance criteria**
- [ ] Shows latest BP with source badge and latest HR with source badge.
- [ ] Quick actions: Log BP, Measure HR.
- [ ] Disclaimer banner or persistent footer.
- [ ] Empty state teaches correct BP sources (no camera BP).

### US-DASH-002 — Pull to refresh
**As a** HealthKit user,  
**I want** to refresh imports,  
**so that** new Watch/cuff-to-Health data appears.

**Acceptance criteria**
- [ ] Pull-to-refresh triggers authorized HealthKit sync.
- [ ] Errors surfaced with recovery actions.

---

## Epic: Charts

### US-CHART-001 — BP trend chart
**As a** careful tracker,  
**I want** systolic/diastolic over time,  
**so that** I can discuss trends with my GP.

**Acceptance criteria**
- [ ] Range selector 7d / 30d / 90d / custom.
- [ ] Dual series sys/dia; optional pulse.
- [ ] Accessibility: VoiceOver summary of selected point; not color-only meaning.
- [ ] Disclaimer on Analytics screen.

### US-CHART-002 — HR trend chart
**As a** user,  
**I want** HR trends separate from BP,  
**so that** measurement types aren’t confused.

**Acceptance criteria**
- [ ] HR chart clearly labeled PPG / HealthKit sources.
- [ ] No axis or legend implying BP.

### US-CHART-003 — Filters (Premium advanced)
**As a** Premium user,  
**I want** to filter by source and tags,  
**so that** I can isolate home morning readings.

**Acceptance criteria**
- [ ] Free users get basic ranges; advanced filters gated with clear upgrade copy (no dark pattern).
- [ ] Filters persist for session.

---

## Epic: Reports

### US-RPT-001 — CSV export
**As a** privacy-maximalist,  
**I want** CSV export of my readings,  
**so that** I control my data offline.

**Acceptance criteria**
- [ ] Export includes BP, HR, and selected lifestyle logs for date range.
- [ ] Columns include source types.
- [ ] Share sheet works offline.

### US-RPT-002 — PDF clinician report
**As a** caregiver,  
**I want** a PDF summary,  
**so that** I can bring it to an appointment.

**Acceptance criteria**
- [ ] PDF includes charts/tables, source legend, and medical disclaimer.
- [ ] Does not claim diagnosis.
- [ ] Basic (Free) vs Advanced (Premium) differences listed on Reports screen.

---

## Epic: Notifications

### US-NTF-001 — BP reminder
**As a** user building a habit,  
**I want** scheduled BP reminders,  
**so that** I measure consistently.

**Acceptance criteria**
- [ ] User creates time(s) and days.
- [ ] Notification deep-links to Log BP (manual/BT), not camera BP.
- [ ] Works with permission; otherwise shows enable guidance.

### US-NTF-002 — Medication reminder
**As a** user who takes prescribed meds,  
**I want** time-based reminders for medications I enter,  
**so that** I remember doses I already discussed with my clinician.

**Acceptance criteria**
- [ ] User enters medication name and schedule; app does not suggest doses.
- [ ] Copy states reminders are not medical advice.
- [ ] Skip / Taken actions log adherence locally without clinical claims.

---

## Epic: Subscription

### US-SUB-001 — Clear free vs premium
**As a** user considering upgrade,  
**I want** an honest comparison,  
**so that** I know what I pay for.

**Acceptance criteria**
- [ ] Comparison table visible before purchase.
- [ ] Free tier capabilities remain usable without account.
- [ ] No fake countdown urgency or obscured pricing.
- [ ] Restore Purchases control present.
- [ ] Link to manage subscription (Apple) present after purchase.

### US-SUB-002 — Purchase and entitlement
**As a** Premium purchaser,  
**I want** features unlocked immediately,  
**so that** my payment works.

**Acceptance criteria**
- [ ] StoreKit 2 transaction verified; entitlement cached offline.
- [ ] Graceful handling of interrupted purchase.
- [ ] Features degrade cleanly when subscription expires (data retained).

---

## Epic: Privacy

### US-PRI-001 — Encrypted local storage
**As a** privacy-maximalist,  
**I want** my health database encrypted at rest,  
**so that** device-level risk is reduced.

**Acceptance criteria**
- [ ] Local store uses encryption (see Database Schema).
- [ ] No health payloads in analytics events.
- [ ] Privacy Policy accessible from Settings and onboarding.

### US-PRI-002 — Optional iCloud
**As a** user who wants backup,  
**I want** iCloud sync to be opt-in,  
**so that** offline-only remains default.

**Acceptance criteria**
- [ ] Sync off until user enables.
- [ ] Explains what syncs; can disable and delete cloud copy (best effort / documented).
- [ ] Conflicts surfaced without silent destructive merge when possible.

### US-PRI-003 — Export and delete all
**As a** GDPR data subject,  
**I want** to export or delete my data,  
**so that** I can exercise my rights.

**Acceptance criteria**
- [ ] Export produces machine-readable archive (JSON/CSV).
- [ ] Delete all requires typed confirmation; irreversible locally.
- [ ] Completes within documented time; shows progress/errors.

### US-PRI-004 — App lock
**As a** user sharing a device,  
**I want** optional Face ID / Touch ID lock,  
**so that** readings aren’t casually visible.

**Acceptance criteria**
- [ ] Toggle in Privacy settings.
- [ ] Lock on launch / resume after configurable interval.
- [ ] Fallback passcode path via system auth.

---

## Epic: Accessibility

### US-A11Y-001 — VoiceOver measurement flows
**As a** VoiceOver user,  
**I want** to log BP and measure HR fully,  
**so that** core value is accessible.

**Acceptance criteria**
- [ ] All controls labeled; progress announced during HR session.
- [ ] Charts provide textual summaries.
- [ ] Focus order logical; no inaccessible custom controls without traits.

### US-A11Y-002 — Dynamic Type & Reduce Motion
**As a** user with larger text,  
**I want** layouts to reflow,  
**so that** I can read without truncation of critical values.

**Acceptance criteria**
- [ ] Critical metrics remain readable at accessibility sizes.
- [ ] Decorative motion disabled when Reduce Motion is on.
- [ ] Contrast meets WCAG AA for text/icons in light and dark mode.

---

## Cross-cutting story map (MVP priority)

| Priority | Stories |
|----------|---------|
| P0 | US-ONB-001–004, US-BP-001, US-BP-003, US-HR-001, US-HR-003, US-DASH-001, US-PRI-001, US-SUB-001, US-A11Y-001 |
| P1 | US-BP-002, US-BP-004–006, US-CHART-001–002, US-RPT-001–002, US-AI-001, US-AI-003, US-NTF-001, US-DEV-001–003, US-PRI-002–004 |
| P2 | US-AI-002, US-AI-004, US-CHART-003, US-NTF-002, US-DEV-004, US-HR-002/004 polish |

---

*End of user stories.*
