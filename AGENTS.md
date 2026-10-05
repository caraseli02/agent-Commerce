# agent-Commerce — Agent Harness

agent-Commerce is a Nuxt 4 + TypeScript e-commerce demo with Vue 3, Pinia, Tailwind, Stripe hooks, and local Nitro mock endpoints.

## Current mode

- The repo is a self-contained portfolio/demo app.
- Prefer mock mode for local work and reviews.
- Keep changes small and shippable; this repo is a good fit for autonomous micro-tasks.
- GitHub Issues are the task queue for autonomous work; agents only pick up `ready-for-agent` issues and claim one issue at a time.
- Autonomous work uses a planner → generator → evaluator split. The generator opens the PR; the evaluator decides whether it is review-ready.
- The controller behaves like a standing `/goal`: keep one executable issue alive until the evaluator passes it, a human blocks it, or the user replaces the goal. Tracking epics are never claimed; WIP=1 applies to a bounded child whose PR closes that child. Do not start a second issue for that builder while its `in-progress` issue has an open PR.
- WIP=1 applies per builder. Claude owns `agent:claude` or legacy `lane:nightly` issues; Codex owns other eligible issues. Internal model delegation shares its builder's claim. Claude never builds payment work; its routines are defined in `.factory/`. See `docs/agents/autonomous-workflow.md` for ownership and independent cross-review.
- GitHub labels, assignments and linked PRs are live claim state. `PROGRESS.md`, `DECISIONS.md`, `feature_list.json`, and `CONTEXT.md` preserve reviewed session/evidence snapshots; unattended agents keep task transitions on GitHub.

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
- `pnpm verify` — delivery gate (`build`, `lint`, `typecheck`, `test:coverage`, feature-list validation)
- `pnpm verify:full` — full local gate with architecture invariants and preview smoke
- `pnpm verify:handoff` — pre-handoff gate; expects a clean tree and adds clean-state validation

### One-command initialization

- `./init.sh` — install dependencies and run the full baseline (`build`, `lint`, `typecheck`, `test`). If it fails, check `PROGRESS.md` for known baseline failures before feature work.

## Verification-first policy

During implementation, inspect the diff and affected consumers, select the smallest relevant checks with reasons, and run those checks. For UI effects (including indirect data/store/style changes), use `.agents/skills/verify-ui-change/SKILL.md` and verify only the impacted routes/interactions and relevant viewports in the browser. After a focused repair, rerun only checks whose evidence was invalidated; continue the authorized task without asking the user to continue.

Choose one strongest delivery gate: `pnpm verify`, `pnpm verify:full` where architecture/runtime evidence is required, or `pnpm verify:handoff` from a clean working tree for final PR/session handoff. Do not invoke every superset in sequence. Handoff/full and pre-push can reuse matching successful local build/lint/typecheck/coverage evidence for four hours; source, locked installation metadata, config/environment, runtime, or generated build changes invalidate reuse. Use `--fresh` after an unresolved failure or when fresh evidence is required. Lightweight validators, handoff runtime checks, and selected visuals still run. CI never reuses receipts; executable/unknown changes run full CI. Verified documentation-only ranges use formatting/state checks without application tests. See `docs/agents/verification.md` for the conservative classifier.

Pre-push invokes `pnpm verify --reuse` with the actual pushed base/head and selects macOS screenshots from actual pushed ranges. Runtime skips or targeted groups require a committed, diff-bound consumer assessment; uncertain impact runs the full suite. `pnpm test:visual` still runs the full matrix explicitly.

See `docs/agents/verification.md` for check selection, evidence freshness, and a lightweight ignored per-task verification record. Saved state supports continuation when an agent is running or resumed; it does not schedule or wake an agent.

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
- Prefer one coherent behavior per issue/PR, including its necessary endpoint, tests, migration, and tracking updates. More than ~3 implementation files prompts a scope review, not an automatic helper/route split. A second unrelated behavior requires a separate issue.
- Enforce **WIP=1 per builder**: only one executable issue may be active for that builder. Internal delegated subtasks do not claim another issue.
- After two focused failed repair attempts, stop and report the blocker instead of widening scope.
- Do not continue based on vibe; keep every loop grounded in a checkable outcome.

## Feature list contract

`feature_list.json` is a reviewed validation/evidence snapshot. GitHub is the authority for live task claims; unattended agents do not edit this shared snapshot or `PROGRESS.md`. Explicit user-requested reconciliation may update them.

- each item needs: `id`, `description`, `validation`, `status`, `evidence`
- allowed statuses: `not_started`, `active`, `blocked`, `passing`
- the snapshot validator allows at most one item marked `active`; this is snapshot consistency, not enforcement of live per-builder GitHub WIP
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

For payment/checkout state or public error changes, follow [payment contract guardrails](docs/agents/payment-contracts.md): import module-owned contracts, parse untrusted boundaries, keep presentation mappings exhaustive, and preserve conservative unknown handling. `tests/payment-contract-ownership.spec.ts` enforces scoped server declaration/producer ownership and UI enum-label usage in Vitest; parser/presentation and corrupt-state regressions check runtime rejection. Typecheck rejects undeclared public codes and incomplete presentation maps. Verify actual label consumers and failure navigation, including local cleanup independent of remote cancellation. Documentation alone is not automated enforcement.

Use `PROGRESS.md` for work that spans sessions. Keep it short and factual:

- current focus
- in progress
- blocked
- next verification

GitHub Issues remain the primary task queue and live claim authority. `PROGRESS.md` is a reviewed session snapshot: summarize its issue/PR, blockers, and baseline, then recheck GitHub on resume. Unattended transitions belong in issue/PR comments and labels rather than concurrent edits to shared snapshots.

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
- **Checkout also requires PostgreSQL.** Set `DATABASE_URL` in `.env` or ignored `.env.local`, run `pnpm db:migrate`, then start the app. The application no longer falls back to SQLite; test commands load `.env` then `.env.local` and create an isolated PostgreSQL schema.
- **Demo login credentials:** use `customer@demo.com` / `customer123` or `admin@demo.com` / `admin123` (defined in `server/utils/mockUsers.ts` and documented in `README.md`).
- **Mock mode is an explicit portfolio-demo contract.** With `NUXT_PUBLIC_MOCK_MODE=true`, both `pnpm dev` and `pnpm build && pnpm preview` use the repository's sample Nitro routes. It contains public sample data only and must not be connected to real customer data.
- Dev server is ready ~10s after `pnpm dev`; confirm with `curl -sf http://localhost:3000/` before browser testing.
- **GitHub CLI authentication checks require escalation.** In the filesystem sandbox, `gh auth status` can falsely report the keyring token as invalid because credential-store access is restricted. For any GitHub CLI operation, retry the command with `sandbox_permissions: require_escalated` before asking the user to run `gh auth login`; treat the escalated result as authoritative.
- **Vercel/Neon preview database contract.** All Vercel Preview deployments use the shared `vercel-dev` Neon branch. Keep the Neon integration's **Create a database branch for deployment** option off for Preview, and set Preview-scoped `DATABASE_URL` to `vercel-dev`; Production uses the default `production` branch. Do not create or delete a Neon database branch for each PR; remove only genuinely abandoned branches after verifying they are not `production` or `vercel-dev`.
