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

- 2026-06-16 — Adopt the full Learn Harness Engineering minimal pack plus ECAS topic docs

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
