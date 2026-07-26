# Competitor pain points → VitalTrack AI responses

Research synthesis from recurring App Store / Google Play / Reddit / forum complaints about SmartBP, Heart Habit, Qardio, Omron Connect, Blood Pressure Companion, and similar apps (2023–2026 themes). Used to guide the adults-40+ redesign.

| Complaint | How VitalTrack AI addresses it |
| --- | --- |
| Too much manual data entry | Apple Health BP import, Bluetooth cuff path, optional lifestyle fields collapsed behind “Add lifestyle details,” HealthKit steps/HR/sleep when available |
| Confusing charts | Week / month / year ranges, morning vs evening & before/after med filters, color-blind-safe bars, plain captions |
| Small text / poor accessibility | Comfort typography, high-contrast palette, 56pt targets, Dynamic Type–oriented type scale, reduce-motion respect |
| Complicated navigation | Five-tab IA (Home · Pulse · BP · Coach · More); each screen answers “what do I need to know?” and “what next?” |
| Excessive ads | No ads in Free or Premium |
| Expensive / dark-pattern subscriptions | Free tier stays useful (logging, meds, coach, learning, basic charts); Premium is optional extras; no paywall during onboarding |
| Unreliable syncing | Offline-first local store; Health/Bluetooth clearly labeled; honest empty states |
| Inaccurate / scary insights | Heuristic insights only when data supports them; safety filter; calm crisis guidance; never diagnoses |
| Weak reminders | Supportive copy (“Ready to record…”, streaks) — never guilt |
| Weak doctor reports | Rich clinician summary: BP stats, morning/evening, before/after meds, medication history, lifestyle check-ins, PDF/CSV |
| Limited personalization | Check-ins + med timing + lifestyle→BP pattern insights + conversational coach with chat memory in-session |
| Poor customer support / trust | Prominent privacy, AI limits, medical disclaimer, FDA-cleared cuff requirement |

## Design principles locked from this research

1. **Calm over flashy** — no panic language on high readings.
2. **Explain numbers** — never show bare `124/79` without context when history exists.
3. **Free must be useful** — medications, learning center, and basic analytics are not paywalled.
4. **Trust first** — camera never measures BP; AI never diagnoses.
