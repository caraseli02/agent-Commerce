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
