# Assumptions (Phase 0)

Ambiguities were resolved so work can continue. Revisit only if they change architecture, cost, security, or product direction.

| ID | Assumption | Impact if wrong |
| --- | --- | --- |
| A1 | Working name is **Helix** | Rename tokens and copy; keep package `helix` |
| A2 | English-first | i18n keys from the start in copy, not full locales |
| A3 | US customary + metric from day one in data model | Display layer converts |
| A4 | MVP auth: email magic/password in dev; Apple/Google in identity phase | |
| A5 | One Postgres, one Next.js API, one Expo app | No microservices |
| A6 | First AI adapter: OpenAI-compatible; interface supports Anthropic/Gemini | |
| A7 | AI optional: app runs with `AI_PROVIDER=none` using rule-based Today | Cost/offline |
| A8 | XP economy: workout 80–200, habit 10, quest bonus 100 — tunables in DB | Balance later |
| A9 | Momentum 0–100 integer | |
| A10 | Default attributes are the six in the PRD | Adding stats is data, not a rewrite |
| A11 | Core loop free; paywall later | Business model |
| A12 | No medical features; disclaimers in onboarding | Legal |
| A13 | Recording will not block Phase 1 | If it arrives, addendum only |
| A14 | Monorepo in this git repository | |
| A15 | Rank names Spark…Apex | Copy-only change |
