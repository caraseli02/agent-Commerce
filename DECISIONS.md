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
