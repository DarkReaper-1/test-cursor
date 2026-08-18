# Helix

Helix is a personal RPG that turns real-world progress into an evolving digital identity.

This repository currently contains **Phase 0 discovery only**: competitive research, product requirements, architecture, and the implementation roadmap. Application code begins in Phase 1 after the Project Readiness Report.

North star: **What should I do today to become better tomorrow?**

## What this is not

Helix is not a clone of Arise, Solo Leveling, or any proprietary fitness RPG. Arise is used only as a public competitive reference. We do not copy branding, artwork, characters, source, private APIs, or protected assets.

## Phase 0 documents

| Area | Path |
| --- | --- |
| Reverse-engineering | [`docs/reverse-engineering/`](docs/reverse-engineering/) |
| Competitive research | [`docs/research/competitive-analysis.md`](docs/research/competitive-analysis.md) |
| Product requirements | [`docs/product/product-requirements.md`](docs/product/product-requirements.md) |
| MVP | [`docs/product/mvp.md`](docs/product/mvp.md) |
| Architecture | [`docs/architecture/proposal.md`](docs/architecture/proposal.md) |
| Database | [`docs/database/proposal.md`](docs/database/proposal.md) |
| Task board | [`docs/project/task-board.md`](docs/project/task-board.md) |
| Roadmap | [`docs/project/roadmap.md`](docs/project/roadmap.md) |
| Readiness report | [`docs/project/project-readiness-report.md`](docs/project/project-readiness-report.md) |

## Stack (planned)

- Mobile: React Native, Expo, TypeScript
- Backend: Next.js, TypeScript, Zod
- Data: PostgreSQL, Prisma
- Auth: Apple, Google, email
- AI: provider-agnostic orchestrator
- Payments: RevenueCat, after the core loop is useful

## Evidence labels

Every research claim is labeled:

- **OBSERVED** — seen in a public source or confirmed artifact
- **INFERRED** — reasonable interpretation, not confirmed
- **PROPOSED** — Helix product/engineering decision
