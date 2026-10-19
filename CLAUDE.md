# CLAUDE.md

GitHub Actions stay disabled. Husky and independent local review govern acceptance; follow [local verification](docs/agents/local-verification.md). The standalone CI migration is retired.

Project-level guidance for Claude Code working in the **agent-Commerce** repository.

## What agent-Commerce is

A Nuxt 4 + TypeScript e-commerce demo, branded as Components Marketplace, with Vue 3, Pinia, Tailwind CSS, Stripe hooks, and local Nitro mock endpoints.

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

- `PROGRESS.md` — reviewed focus, blockers and verification snapshot; recheck live GitHub claims
- `DECISIONS.md` — durable cross-session decisions
- `feature_list.json` — reviewed validation/evidence snapshot; its validator does not enforce live GitHub WIP

## Agent skills

### Issue tracker

GitHub Issues in `caraseli02/agent-Commerce`. See `docs/agents/issue-tracker.md`.

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
- One loop should make one narrow change, verify it, and continue the authorized task; stop for completion or the documented blocker protocol.
- Keep one executable issue active per builder. Claude owns issues labeled `agent:claude`, excludes payment work, and shares its claim across internal subtasks. A `blocked` Claude claim is parked and a claim whose open PR has an evaluator PASS is queued (at most `max_pass_queue`); neither counts, and Claude never has two live claims (`.factory/automations/claude-routine.md` §2). Follow `docs/agents/autonomous-workflow.md` for separately operated cross-review.
- If the task grows beyond a few files or turns into a second unrelated fix, split it.
- When a PR changes a path in `.factory/factory.yaml` `protected_paths`, end the session with a separate action line for Vlad: `Add owner-approved-harness to PR #N`. Only he can set it, and without it the evaluator must FAIL the PR.

## Architecture shortcuts

- API flow: `app/plugins/api.ts` (`$apiClient`) → `app/composables/api/*` domain functions → domain composables (`useCart`, `useOrder`, etc.) → Pinia/UI. See `CONTEXT.md` § API access for the full contract.
- Do not add a class-based service registry, `HttpFactory`, `useFetchAPI`, or component-level `$api.<domain>` calls.
- App sources live in `app/` (Nuxt 4 default): `~`/`@` resolve to `app/`, `~~`/`@@` to the repo root. Server-shared code (`server/`, `types/`, `helpers/`, `model/`, `data/`) stays at the root and is imported as `~~/...`.
- Mock backend: `server/api/`
- Auth/session state: local mock token + Pinia + token cookie
- UI: shadcn-vue / Radix-style primitives + Tailwind

## Verification order

1. During implementation, inspect the diff/affected consumers and select the smallest relevant checks with reasons. Use `.agents/skills/verify-ui-change/SKILL.md` for direct or indirect UI effects.
2. After repairs, rerun only invalidated checks; continue until the scoped behavior passes or a blocker applies.
3. At delivery, run `pnpm verify`, `pnpm verify:full` when architecture/runtime evidence is needed, and `pnpm verify:handoff` from a clean working tree. Existing local pre-push gates remain. Documentation/skill-only local work follows the targeted exception in `docs/agents/verification.md`.

Use `docs/agents/verification.md` before declaring done.

## State

GitHub labels, assignments and linked PRs are live claim state. Unattended agents record transitions and evidence there; shared `PROGRESS.md` and `feature_list.json` snapshots change only through explicit reviewed reconciliation.
