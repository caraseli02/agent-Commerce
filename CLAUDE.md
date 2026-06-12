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
- `pnpm pretty`

## Harness state files
- `PROGRESS.md` — current focus, in progress, blocked, next verification
- `DECISIONS.md` — durable cross-session decisions
- `feature_list.json` — machine-readable task state and WIP=1 control

## Agent skills

### Issue tracker
GitHub Issues are the task queue for autonomous work in this repo. Agents only pick up `ready-for-agent` issues, claim them with `in-progress`, and skip anything already assigned or already under an open PR. See `docs/agents/issue-tracker.md`.

### Triage labels
Use the exact label vocabulary in `docs/agents/triage-labels.md` so the agent does not invent duplicate states.

### Domain docs
This is a single-context repo. Read `CONTEXT.md` first, then the other harness files in the order described there. See `docs/agents/domain.md`.

## Initialization / WIP rules
- First session on a fresh branch should initialize the repo before feature work.
- One loop should do one narrow task, verify it, and stop.
- Keep only one task active at a time.
- If the task grows beyond a few files or turns into a second unrelated fix, split it.

## Architecture shortcuts
- API flow: `plugins/api.ts` → `composables/HttpFactory.ts` → `services/*.service.ts`
- Mock backend: `server/api/`
- Auth/session state: Firebase + Pinia + token cookie
- UI: shadcn-vue / Radix-style primitives + Tailwind

## Verification order
1. `pnpm build`
2. `pnpm lint`
3. Smoke-test the affected screen or route

## State
Use `PROGRESS.md` when work spans sessions or when a loop is intentionally paused.
