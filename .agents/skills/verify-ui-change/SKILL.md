---
name: verify-ui-change
description: Verify direct or indirect UI changes in this Nuxt demo with targeted checks and browser evidence, then repair and rerun only invalidated checks.
---

# Verify a UI change

Use for changes affecting visible behavior, including components, pages, shared styles/layouts, stores, composables, mock data, and server responses consumed by UI. Read `docs/agents/verification.md` for delivery gates and the saved verification record; follow the current task's acceptance criteria and scope.

## Select checks from the impact

Inspect the base-to-current diff, staged/unstaged changes, and task-owned untracked files. Trace changed exports, data/state, shared styling, and callers to the UI consumers. Select the smallest check set that proves the changed behavior; explain each check's purpose and relevant dependencies.

Use changed-file lint for syntax/conventions, typecheck for type/contracts, a focused test through the repository's PostgreSQL wrapper (`pnpm test <test-file>`) for deterministic behavior, or build for compilation/build effects when relevant. Do not run all of them mechanically. Browser evidence is required for observable UI effects even when static checks pass.

## Exercise the impacted UI

Use the available browser tool against the correct local dev server or a freshly built preview. Confirm the runtime consumed the current changes: rebuild preview after relevant edits, and refresh/restart dev when necessary. Follow mock-mode, auth, and database prerequisites in `AGENTS.md`/`README.md`; do not expose credentials in evidence.

Choose impacted routes, interactions, and viewports from the diff and acceptance criteria. Inspect expected rendering, behavior, and relevant loading/empty/error states. Include keyboard/focus behavior when interaction changes and mobile/desktop when responsive layout changes. Shared styles/stores may require representative affected consumers; keep the browser pass scoped to those consumers. Record exact route, viewport, setup, observed outcome, and a screenshot/log when useful. Diagnose console/hydration/request errors relevant to the flow.

For the PR, show the change rather than describe it: after the last UI commit, run `pnpm pr:screenshots --routes "<the routes above>"` and paste its `## Screenshots` section (before/after, light/dark, desktop/mobile) into the PR body. Rerun it after any later UI edit; the template preflight rejects a stale section.

## Repair and continue

If a check fails, diagnose the observed failure, make a focused repair, then rerun that check and checks whose inputs changed. Preserve passing evidence only when relevant source, dependencies, and environment are demonstrably unchanged; on uncertainty rerun the relevant check. Continue the already authorized task without asking the user to continue. Stop and report a concrete blocker after two focused failed repair attempts, an unavailable required environment, or a required missing decision; do not widen scope.

When continuation or evidence reuse is needed, keep the small ignored `tmp/verification/<task-id>.md` record from `docs/agents/verification.md`. Save the task/base/current revision, working diff fingerprint including task-owned untracked contents, stage, selected checks/reasons/dependencies, routes/viewports, per-check evidence/status and environment/runtime identity, runtime freshness, and next action. HEAD alone cannot identify uncommitted changes. On resume inspect changes before reusing each result.

For push selection, use `node scripts/select-visual-checks.mjs --base <actual-push-base>` after committing runtime edits. Follow the `.visual-impact.json` assessment contract in `docs/agents/verification.md`; use the fingerprint plus reason/consumer trace and targeted visual group IDs. Refresh on changed runtime patch or push base. Missing/stale/uncertain impact runs the full matrix. An internal backend change may declare no observable impact only after tracing callers and UI-visible writes. Effects outside the matrix still need browser evidence.

Run the existing delivery gates when ready to ship. Local records do not schedule/wake an agent or replace the independent evaluator. Keep WIP=1 and durable issue/PR state intact; copy necessary evidence to the handoff and remove temporary artifacts before clean handoff.
