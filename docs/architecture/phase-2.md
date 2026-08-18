# Phase 2 — Identity

Implemented:

- Email/password auth (JWT, 7-day). Apple/Google remain later hooks.
- Onboarding: goal, equipment, minutes, experience, constraints
- Server-created Operator character with catalog attributes
- `GET /api/v1/today` assembles one directive; missed yesterday → recovery, not shame
- `POST /api/v1/completions` requires a session, idempotency key, and **never** trusts client XP
- Mobile: sign in, onboarding, Today, session log, Character

Not in Phase 2:

- Apple/Google OAuth
- Camera / HealthKit
- Rest timer background work
- Vendor LLMs
