# Multi-agent roles

Helix is built as a coordinated org. Agents do not blindly overwrite shared architecture.

## Protocol

Before changing shared code:

1. Inspect implementation
2. Read the matching `/docs` page
3. List dependencies
4. Smallest coherent change
5. Run tests
6. Update docs

Every feature: implementation + tests + docs + error handling.

## Roles

| Role | Owns | Does not own |
| --- | --- | --- |
| PROJECT MANAGER | board, deps, DoD | implementation taste |
| PRODUCT | journeys, MVP scope | pixels |
| UX | IA, a11y, flows | visual tokens |
| UI | tokens, components, motion | business rules |
| MOBILE | Expo, nav, native | XP math |
| BACKEND | API, authz | Prisma schema fights without Database |
| DATABASE | schema, indexes, migrations | API shape |
| RPG | RewardEngine, momentum, ranks | UI copy except numbers |
| FITNESS | exercises, progression, recovery load | quest categories |
| AI | providers, prompts, tools, memory | direct DB writes |
| CV | pose pipeline | rewards |
| SECURITY | threat model, abuse, secrets | feature scope |
| QA | tests, regression, acceptance | silent prod hotfixes |
| DEVOPS | CI, env, monitoring | product bets |

## Shared files

`packages/shared` and Prisma schema require PM + Database + Backend agreement. If conflict: smallest additive change (new table/column) over rewrite.

## Copy ownership

Product + UX own user-facing words. RPG supplies numeric outcomes only.
