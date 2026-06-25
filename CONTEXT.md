# ECAS Context

ECAS is a Nuxt 3 + TypeScript e-commerce demo with Vue 3, Pinia, Tailwind, Firebase hooks, Stripe hooks, and local Nitro mock endpoints.

## Autonomous loop rules

- GitHub Issues are the task queue.
- Only issues labeled `ready-for-agent` are eligible for pickup.
- Claim work by assigning the issue and marking it `in-progress`.
- Use TDD for task implementation: failing test or regression check first, then the smallest fix, then verification.
- Keep WIP=1 so the loop works on one issue at a time.

## Source files

- `AGENTS.md` — harness/router
- `CLAUDE.md` — project-level Claude guidance
- `PROGRESS.md` — current focus and verification baseline
- `DECISIONS.md` — durable decisions
- `feature_list.json` — machine-readable harness state

## API access

- `plugins/api.ts` creates the authenticated `$fetch` client with `$fetch.create()` and provides it as `$apiClient`.
- `composables/useAPI.ts` is the SSR-friendly read helper for page/composable data loading.
- `composables/api/*` contains plain domain API functions for mutations and orchestration helpers that need the shared `$apiClient`.
- Domain composables such as `useCart`, `useOrder`, and `useCustomerDashboard` are the public interface for UI flows that need business rules or state coordination.
- Do not add a class-based service registry, `HttpFactory`, `useFetchAPI`, or component-level `$api.<domain>` calls.
