# ECAS — Agent Harness

ECAS is a Nuxt 4 + TypeScript e-commerce demo with Vue 3, Pinia, Tailwind, Stripe hooks, and local Nitro mock endpoints.

## Current mode

- The repo is a self-contained portfolio/demo app.
- Prefer mock mode for local work and reviews.
- Keep changes small and shippable; this repo is a good fit for autonomous micro-tasks.
- GitHub Issues are the task queue for autonomous work; agents only pick up `ready-for-agent` issues and claim one issue at a time.
- Autonomous work uses a planner → generator → evaluator split. The generator opens the PR; the evaluator decides whether it is review-ready.
- The controller behaves like a standing `/goal`: keep one issue alive until the evaluator passes it, a human blocks it, or the user replaces the goal. Do not start a second issue while an `in-progress` issue has an open PR.
- Durable session state lives in `PROGRESS.md`, `DECISIONS.md`, `feature_list.json`, and `CONTEXT.md`.

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
- `pnpm typecheck` — Nuxt/TypeScript typecheck
- `pnpm test` — Vitest suite
- `pnpm pretty` — Prettier format-all
- `pnpm verify` — fast default gate (`build`, `lint`, `typecheck`, `test`, feature-list validation)
- `pnpm verify:full` — full local gate with architecture invariants and preview smoke
- `pnpm verify:handoff` — pre-handoff gate; expects a clean tree and adds clean-state validation

### One-command initialization

- `./init.sh` — install dependencies and run the full baseline (`build`, `lint`, `typecheck`, `test`). If it fails, check `PROGRESS.md` for known baseline failures before feature work.

## Verification-first policy

Before calling work done, run the narrowest meaningful verification, then climb the verification ladder in `docs/agents/verification.md`.

Default local gate:

1. `pnpm verify`
2. If the issue needs additional runtime evidence, run `pnpm verify:full` or smoke-test the affected flow in the browser or via the relevant page/server route
3. Before PR/session handoff, run `pnpm verify:handoff` from a clean working tree

If a change touches UI, mock data, auth, cart, checkout, or server routes, verify the related flow end to end, not just the compile step.

## Initialization phase

The first session on a fresh branch should act like an initialization pass, not a feature sprint. Run `./init.sh` first when setting up a fresh checkout/worktree.

Initialization outputs:

- a runnable environment
- at least one verified test/build check
- `PROGRESS.md` with current focus and next step
- `DECISIONS.md` for durable cross-session choices
- `feature_list.json` for machine-readable work state

Do not mix initialization with feature implementation unless the task is explicitly about harness setup.

## Harness rules for autonomous loops

- Make **one small decision + one small change + one verification** per loop.
- Prefer tasks that touch 1 category only: build fix, lint fix, component polish, API wiring, or doc cleanup.
- If a task needs more than ~3 files or a second unrelated fix, split it.
- Enforce **WIP=1**: only one task may be active at a time.
- If blocked twice, stop and report the blocker instead of widening scope.
- Do not continue based on vibe; keep every loop grounded in a checkable outcome.

## Feature list contract

`feature_list.json` is the source of truth for task state.

- each item needs: `id`, `description`, `validation`, `status`, `evidence`
- allowed statuses: `not_started`, `active`, `blocked`, `passing`
- only one item should be `active`
- a task may move to `passing` only after its validation evidence is recorded

## Session lifecycle

A fresh session should read, in order:

1. `AGENTS.md`
2. `README.md`
3. `PROGRESS.md`
4. `DECISIONS.md`
5. `feature_list.json`
6. Relevant topic doc from `docs/agents/`

Use `docs/agents/session-lifecycle.md` for startup, sprint contract, blocker, and clean handoff rules.

## Topic docs

- `docs/agents/issue-tracker.md` — GitHub issue pickup/claim/PR workflow
- `docs/agents/triage-labels.md` — canonical queue labels
- `docs/agents/autonomous-workflow.md` — planner/generator/evaluator split and evaluator verdict contract
- `docs/agents/domain.md` — where domain context lives
- `docs/agents/session-lifecycle.md` — initialization, WIP=1, blocker protocol, clean handoff
- `docs/agents/verification.md` — done gates, E2E/runtime verification, evaluator rubric
- `docs/agents/harness-audit.md` — course coverage and known harness watch points

## Repository map

- `pages/` — Nuxt routes
- `layouts/` — app shells
- `components/` — feature and UI components
- `composables/` — shared composition logic
- `store/` — Pinia stores
- `plugins/` — app plugins and API wiring
- `server/api/` — Nitro mock endpoints
- `types/` — shared TypeScript types

## Architecture notes

- API access goes through `plugins/api.ts` for the shared `$apiClient` and plain domain functions in `composables/api/*` for mutations/orchestration.
- Auth uses local mock token/session state.
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

GitHub Issues remain the primary task queue. `PROGRESS.md` is the up-to-date session mirror: it should summarize the active issue/PR, blockers, and baseline state so a fresh agent does not need to reconstruct recent work from chat.

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

## Cursor Cloud specific instructions

Standard commands live in `README.md` and `package.json` scripts; this section only captures non-obvious caveats.

- **`.env` is required for the app to actually work.** Mock mode reads `NUXT_PUBLIC_MOCK_MODE=true` from `.env` (see `nuxt.config.ts` `runtimeConfig.public.MOCK_MODE`). Without `.env` there is no data source (no live backend), so the storefront renders empty. The startup update script copies `.env.example` → `.env` when missing; if you wipe `.env`, recreate it with `cp .env.example .env`.
- **Demo login credentials:** use `customer@demo.com` / `customer123` or `admin@demo.com` / `admin123` (defined in `server/utils/mockUsers.ts` and documented in `README.md`).
- **Mock mode is an explicit portfolio-demo contract.** With `NUXT_PUBLIC_MOCK_MODE=true`, both `pnpm dev` and `pnpm build && pnpm preview` use the repository's sample Nitro routes. It contains public sample data only and must not be connected to real customer data.
- Dev server is ready ~10s after `pnpm dev`; confirm with `curl -sf http://localhost:3000/` before browser testing.
