# CLAUDE.md

Project-level guidance for Claude Code working in **ECAS**.

## What ECAS is

A Nuxt 3 + TypeScript e-commerce demo with Vue 3, Pinia, Tailwind CSS, Firebase, Stripe hooks, and local Nitro mock endpoints.

## How to work here

- Use **pnpm** for dependency and script commands.
- Prefer mock mode for local development and review.
- Keep tasks small and atomic.
- Verify before declaring success.
- Treat initialization as a separate phase from feature work.

## Commands

- `pnpm install`
- `pnpm dev`
- `pnpm build`
- `pnpm generate`
- `pnpm preview`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm pretty`
- `pnpm verify`
- `pnpm verify:full`
- `pnpm verify:handoff`
- `./init.sh`

## Harness state files

- `PROGRESS.md` — current focus, in progress, blocked, next verification
- `DECISIONS.md` — durable cross-session decisions
- `feature_list.json` — machine-readable task state and WIP=1 control

## Agent skills

### Issue tracker

GitHub Issues in `caraseli02/Ecas`. See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical strings: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context — `CONTEXT.md` + `docs/adr/` at repo root. See `docs/agents/domain.md`.

### Session lifecycle

Startup, sprint contract, WIP=1, blocker protocol, and clean handoff live in `docs/agents/session-lifecycle.md`.

### Verification

Done gates, full-pipeline checks, browser/runtime evidence, and evaluator rubric live in `docs/agents/verification.md`.

### Harness audit

Course coverage and known watch points live in `docs/agents/harness-audit.md`.

## Initialization / WIP rules

- First session on a fresh branch should initialize the repo before feature work.
- One loop should do one narrow task, verify it, and stop.
- Keep only one task active at a time.
- If the task grows beyond a few files or turns into a second unrelated fix, split it.

## Architecture shortcuts

- API flow: `plugins/api.ts` (`$apiClient`) → `composables/api/*` domain functions → domain composables (`useCart`, `useOrder`, etc.) → Pinia/UI. See `CONTEXT.md` § API access for the full contract.
- Do not add a class-based service registry, `HttpFactory`, `useFetchAPI`, or component-level `$api.<domain>` calls.
- Mock backend: `server/api/`
- Auth/session state: Firebase + Pinia + token cookie
- UI: shadcn-vue / Radix-style primitives + Tailwind

## Verification order

1. `pnpm verify`
2. Use `pnpm verify:full` when architecture/runtime smoke evidence is needed
3. Use `pnpm verify:handoff` before final session/PR handoff from a clean working tree

Use `docs/agents/verification.md` before declaring done.

## State

GitHub Issues are the primary task queue. Keep `PROGRESS.md` current as the short session mirror for active issue/PR, blockers, and baseline status.
