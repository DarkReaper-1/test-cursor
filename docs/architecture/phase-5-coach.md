# Phase 5–6 slice — session, progression, coach

Implemented:

- Per-set logging (load × reps) on the session screen
- Rest countdown from wall-clock `endsAt`, refreshed on AppState `active` so backgrounding does not zero the timer
- Next directive adapts from the last completed session (`8,8,7` → `8,8,8`; bodyweight adds a rep, not fake load)
- `coach.why` on `GET /api/v1/today` via `AIProvider` (`NoneProvider` uses the rules explainer; a vendor may only rephrase)

Not claimed:

- Medical form analysis
- Live LLM coaching unless `AI_PROVIDER` is configured
