# ECAS Progress

## Current focus
- GitHub issue loop is wired up for autonomous pickup, claim, and TDD-driven execution.

## In progress
- None.

## Recently completed
- Issue #19 — gallery layout regression check (`tests/gallery-layout.spec.ts`).

## Blocked
- None.

## Verification baseline
- `gh issue list --state open --label ready-for-agent`
- `gh label list --limit 50 | grep '^in-progress\b'`
- `pnpm build`
- `pnpm lint`

## Notes
- Use this file only for durable cross-session state, not transient task notes.
