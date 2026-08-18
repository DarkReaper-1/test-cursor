# Database proposal

PostgreSQL + Prisma. Normalized, access-path driven. Not a blind dump of every noun in the brief.

## Conventions

- `id` UUID primary keys
- `created_at` / `updated_at` timestamptz
- Monetary/XP integers
- Soft delete only where history must remain (`xp_events` never deleted; anonymize on account delete per policy)
- JSONB for sparse attributes (`constraints`, `proposal_payload`) with Zod at the edge

## Core ER (logical)

```
User 1──1 Profile
User 1──1 Character
User 1──* Goal
User 1──* AttributeScore     → AttributeDefinition
User 1──* XpEvent
User 1──* QuestInstance      → QuestDefinition
User 1──* WorkoutSession 1──* WorkoutSet → Exercise
User 1──* HabitCompletion    → HabitDefinition
User 1──* AchievementGrant   → AchievementDefinition
User 1──* MemoryFact
User 1──* Conversation 1──* Message (summaries stored on Conversation)
User 1──* HealthConnection 1──* HealthEvent
User 1──* AuditEvent
```

## Tables (MVP-bold)

### identity

**users** — auth subject, email, status  
**profiles** — display name, locale, units, timezone, privacy JSON  
**goals** — type, target, status, dates  
**onboarding_answers** — key/value, versioned schema

### RPG

**attribute_definitions** — key, name, domain, sort  
**character_snapshots** — level, xp, rank, momentum, title_id (current)  
**attribute_scores** — character or user + definition + value  
**xp_events** — amount, reason, source_type/id, idempotency_key **UNIQUE**, metadata  
**rank_definitions** — Spark…Apex, min_level  
**level_definitions** — level, xp_to_next  
**titles** / **character_titles**  
**achievements** / **achievement_grants**  
**momentum_events** — delta, reason, at

### quests

**quest_definitions** — category, recurrence, verification, reward blob, constraints JSON  
**quest_instances** — user, definition, status, expires_at, progress JSON  
**quest_progress_events** — append-only

### fitness

**exercises** — name, equipment, movement_pattern, later media urls (ours)  
**workout_sessions** — status, started/ended, notes, source (manual/nl/health/cv)  
**workout_sets** — session, exercise, load, reps, duration, rpe, rest, skipped  
**progression_states** — user + exercise + scheme + last prescription

### AI

**conversations**  
**messages** — role, redacted content or omit after summarize  
**memory_facts** — type, text, embedding optional later, expires_at, source  
**ai_proposals** — type, payload, status (pending/accepted/rejected)

### later

habits, rewards/inventory, challenges, bosses, guilds, guild_members, notifications, health_integrations, health_events, subscriptions, world_regions, season_passes

Do not create empty guild tables in MVP.

## Indexes (MVP)

- `xp_events (user_id, created_at desc)`
- `xp_events (idempotency_key)` unique
- `quest_instances (user_id, status, expires_at)`
- `workout_sessions (user_id, started_at desc)`
- `workout_sets (session_id)`
- `memory_facts (user_id, type, expires_at)`

## Account deletion

Job: delete or anonymize in order: messages, memory, health events, sessions, quests, then user. Keep aggregated analytics without identifiers.

## Example XP event

```json
{
  "amount": 180,
  "reason": "workout_session_completed",
  "source_type": "workout_session",
  "source_id": "…",
  "idempotency_key": "usr_…:session_…:complete",
  "bonuses": { "streak": 1.05 }
}
```

Amount is always computed server-side. Client cannot set `amount`.
