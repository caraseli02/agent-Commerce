# ECAS Context

ECAS is a Nuxt 3 + TypeScript e-commerce demo with Vue 3, Pinia, Tailwind, Firebase hooks, Stripe hooks, and local Nitro mock endpoints.

## Autonomous loop rules

- GitHub Issues are the task queue.
- The PM selects and claims issues; local workers only work issues already marked `in-progress` and assigned.
- Use TDD for task implementation: failing test or regression check first, then the smallest fix, then verification.
- Keep WIP=1 so the loop works on one issue at a time.

## Source files

- `AGENTS.md` — harness/router
- `CLAUDE.md` — project-level Claude guidance
- `PROGRESS.md` — current focus and verification baseline
- `DECISIONS.md` — durable decisions
- `feature_list.json` — machine-readable harness state
