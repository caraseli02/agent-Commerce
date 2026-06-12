# ECAS — Agent Harness

ECAS is a Nuxt 3 + TypeScript e-commerce demo with Vue 3, Pinia, Tailwind, Firebase, Stripe hooks, and local Nitro mock endpoints.

## Current mode
- The repo is a self-contained portfolio/demo app.
- Prefer mock mode for local work and reviews.
- Keep changes small and shippable; this repo is a good fit for autonomous micro-tasks.

## The 5 questions every fresh session must answer
1. What is this system? → this file + `README.md`
2. How is it organized? → repo structure below
3. How do I run it? → commands below
4. How do I verify it? → verification checklist below
5. Where are we now? → `PROGRESS.md` + git history

If any answer is missing, add the missing file/section before doing bigger work.

## Commands
Use **pnpm** for this repo.

### Install / run
- `pnpm install` — install dependencies
- `pnpm dev` — start the app on http://localhost:3000
- `pnpm build` — production build
- `pnpm generate` — static generation
- `pnpm preview` — preview the production build

### Quality checks
- `pnpm lint` — ESLint over `.ts`, `.js`, `.vue`
- `pnpm pretty` — Prettier format-all

## Verification-first policy
Before calling work done, run the narrowest meaningful verification:
1. `pnpm build`
2. `pnpm lint`
3. Smoke-test the affected flow in the browser or via the relevant page/server route

If a change touches mock data or auth flow, verify the related pages end to end, not just the compile step.

## Harness rules for autonomous loops
- Make **one small decision + one small change + one verification** per loop.
- Prefer tasks that touch 1 category only: build fix, lint fix, component polish, API wiring, or doc cleanup.
- If a task needs more than ~3 files or a second unrelated fix, split it.
- If blocked twice, stop and report the blocker instead of widening scope.
- Do not continue based on vibe; keep every loop grounded in a checkable outcome.

## Repository map
- `pages/` — Nuxt routes
- `layouts/` — app shells
- `components/` — feature and UI components
- `composables/` — shared composition logic
- `services/` — API service classes
- `store/` — Pinia stores
- `plugins/` — app plugins and API wiring
- `server/api/` — Nitro mock endpoints
- `types/` — shared TypeScript types

## Architecture notes
- API calls go through `plugins/api.ts` → `composables/HttpFactory.ts` → `services/*.service.ts`.
- Auth uses Firebase plus local token/session state.
- `server/api/` is the mock backend for portfolio/demo work.
- UI uses shadcn-vue / Radix-style primitives with Tailwind.

## Scope guardrails
- Keep the demo self-contained unless the task explicitly needs live integrations.
- Do not invent new environment variables without checking how the app reads config.
- Preserve existing public routes and demo flows unless the task explicitly changes them.
- If a fix is architectural, document why in `PROGRESS.md`.

## State management
Use `PROGRESS.md` for work that spans sessions. Keep it short and factual:
- current focus
- in progress
- blocked
- next verification

## Autonomous task shape
Good task:
- "Fix the build error in one component"
- "Normalize one service method"
- "Add one smoke check for checkout entry"

Bad task:
- "Improve the app"
- "Fix all lint issues"
- "Refactor the auth system"

## When to update this file
Update the harness whenever:
- verification commands change
- package manager changes
- a new project subsystem becomes important
- repeated agent failures reveal a missing instruction
