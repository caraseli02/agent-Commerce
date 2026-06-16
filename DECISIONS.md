# DECISIONS

Use this file for durable cross-session decisions that should survive context resets.

## Format

-   Date
-   Decision
-   Reason
-   Impact

## Example

-   2026-06-12 — Use pnpm as the package manager

    -   Reason: matches the repo and existing scripts
    -   Impact: all install/run/verify commands should use pnpm

-   2026-06-12 — Use GitHub Issues as the task queue for autonomous work

    -   Reason: issue labels and assignment prevent duplicate work better than ad hoc prompts
    -   Impact: autonomous loops must claim `ready-for-agent` issues and keep WIP=1

-   2026-06-16 — Adopt the full Learn Harness Engineering minimal pack plus ECAS topic docs
    -   Reason: the repo needed explicit coverage for lectures 9–12: premature victory, full-pipeline verification, observability, and clean handoff
    -   Impact: fresh sessions should use `./init.sh`, `docs/agents/session-lifecycle.md`, `docs/agents/verification.md`, and `docs/agents/harness-audit.md` before declaring work done
