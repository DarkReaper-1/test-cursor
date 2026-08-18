# Security and privacy

## Threats (Phase 0)

| Threat | Mitigation |
| --- | --- |
| Client awards itself XP | Server RewardEngine only |
| Replay completions | Idempotency keys + unique constraints |
| IDOR on sessions/quests | Authz on every query |
| LLM prompt injection → write | Tools cannot grant XP; validators |
| Secret leakage | No AI keys on device |
| Health over-collection | Least privilege HealthProvider |
| Subscription spoof | RevenueCat webhooks later; ignore client `isPro` |
| Enumeration of other operators | Opaque IDs, no sequential public ids |
| Log leakage | Redact PII/health |

## Controls

- Zod on all inputs
- Rate limit: completions, AI, auth
- Audit log: login, grant, delete, export, permission change
- RLS later if we add Supabase; with Prisma, enforce in repositories
- Rotate tokens
- CSRF N/A for bearer APIs; still cookie hygiene if using cookies

## Privacy product

- Permission screens with purpose copy
- Export (JSON)
- Account deletion (hard delete or scheduled; document retention)
- Disconnect health
- Delete AI memory
- Social defaults: private
- Analytics: aggregate funnels, not workout payloads

## Anti-cheat (humane)

Flag: duplicate, impossible volume, velocity, low CV confidence.

Do **not** auto-punish on uncertain AI. Manual or soft-hold rewards pending confirm.

## Compliance posture (not legal advice)

Health/fitness personal data. Treat as sensitive. Medical disclaimers in UI. No HIPAA claim unless we later become a covered entity (we are not designing a medical device).
