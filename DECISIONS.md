# DECISIONS

Use this file for durable cross-session decisions that should survive context resets.

## Format

- Date
- Decision
- Reason
- Impact

## Example

- 2026-06-12 — Use pnpm as the package manager

  - Reason: matches the repo and existing scripts
  - Impact: all install/run/verify commands should use pnpm

- 2026-06-12 — Use GitHub Issues as the task queue for autonomous work

  - Reason: issue labels and assignment prevent duplicate work better than ad hoc prompts
  - Impact: autonomous loops must claim `ready-for-agent` issues and keep WIP=1

- 2026-06-16 — Adopt the full Learn Harness Engineering minimal pack plus Components Marketplace topic docs

  - Reason: the repo needed explicit coverage for lectures 9–12: premature victory, full-pipeline verification, observability, and clean handoff
  - Impact: fresh sessions should use `./init.sh`, `docs/agents/session-lifecycle.md`, `docs/agents/verification.md`, and `docs/agents/harness-audit.md` before declaring work done

- 2026-06-17 — Use goal-shaped control for evaluator repair loops

  - Reason: a standing goal keeps the same issue alive after evaluator rejection instead of re-queuing failed work or asking Vlad to prompt the next step.
  - Impact: cron may wake the planner/generator/evaluator, but WIP remains 1; evaluator failures stay `in-progress`, generate a repair brief for the same branch/PR, and the Dev ship path immediately triggers evaluator review after every PR update.

- 2026-07-01 — Hide portfolio demo passwords in the account panel

  - Reason: demo reviewers need an obvious sign-in path, but visible passwords reduce trust and look less production-minded.
  - Impact: demo role selection may prepare sign-in internally, but the account panel should not render demo passwords in plain text.

- 2026-08-05 — Prefer **Buyer Flow** over **Scripted Buyer Path**

  - Reason: the design contract names a storefront capability, not a demo rehearsal script; “buyer flow” matches the FCC-style problem statement.
  - Impact: `CONTEXT.md` uses Buyer Flow as the glossary term; design doc lives at `docs/buyer-flow-design-contract.md`; treat “Scripted Buyer Path” as a legacy alias in older issues/docs.

- 2026-08-06 — Scope remaining June-review epics to Portfolio Demo depth

  - Reason: #101’s Pinia bugs were already fixed; #99/#103 were written as production hardening/SEO programs that conflict with `CONTEXT.md` (Mock Integration Boundary outside production auth/SEO ops).
  - Impact: closed #101; rewrote #99 as demo auth integrity (`requireMockAuth` seam) and closed #109/#111/#113 as `wontfix`; rewrote #103 around `usePageSeo` + public crawl hygiene; children promoted `ready-for-agent` at `priority:p2` so Next track `#426`–`#433` stays first.

- 2026-08-13 — Execute loop repairs locally on the controller Mac

  - Reason: maintainer decision; Codex Cloud connector dependence is not acceptable for this stage.
  - Impact: the controller creates an isolated temporary worktree and runs a time/output-bounded local worker. The controller alone commits and pushes the existing PR branch, never merges, and persists attempts before push so crash recovery fails closed.

- 2026-08-10 — Keep loop engineering event-shaped and proportionate

  - Reason: first-party Anthropic, OpenAI, and GitHub guidance favors simple bounded loops; the earlier 995-line polling controller and mandatory per-action ledger duplicated platform state and exceeded this repository's risk.
  - Impact: one generic dispatcher handles exact source/head keys and two attempts, while CI plus independent hosted/human review complete acceptance. Compact dispatch summaries are the default; full ledgers are reserved for materially higher authority or compliance needs.
