# Verification and evaluator rubric

Use this doc to decide whether an ECAS task is actually done. It implements the course recommendations for premature-victory prevention, full-pipeline verification, observability, and evaluator role separation.

## Verification ladder

Run the narrowest meaningful check first, then climb until the changed behavior is proven.

1. **Fast default gate**
   - `pnpm verify`
   - Runs `build`, `lint`, `typecheck`, `test`, and `feature_list.json` validation.
   - This is the normal loop gate for everyday ECAS work.
2. **Full local gate**
   - `pnpm verify:full`
   - Adds architecture invariants and preview smoke on top of the fast gate.
   - Use this when the change touches API boundaries, auth/cart/checkout/mock routes, or page-level runtime behavior.
3. **Pre-handoff gate**
   - `pnpm verify:handoff`
   - Adds clean-state validation to the full gate and expects a clean working tree.
   - Use this before final PR/session handoff, after intentional files are committed or otherwise clean.
4. **Harness-state validator**
   - `./scripts/validate-feature-list.sh` whenever `feature_list.json` changes.
   - Use it to prove allowed statuses, WIP=1, and passing-item evidence stay mechanically correct.
5. **PR template completeness gate**
   - `node scripts/check-pr-template.mjs`
   - This runs inside `pnpm verify` / CI on pull-request events and fails generator PRs whose body leaves the required template sections boilerplate-only or empty.
   - The gate expects filled verification outcomes, known-risks evidence, and rubric scores; it skips when the PR carries the documented `skip-pr-template-check` or `human-hotfix` label so a human hotfix can intentionally bypass the agent template.
6. **Clean-state handoff validator**
   - `node scripts/check-clean-state.mjs`
   - This is a non-mutating handoff check that expects a clean working tree, rejects tracked temp/debug artifacts, and scans changed source files for fresh `console.log`, TODO/FIXME, or commented-out-code regressions. It intentionally skips scanning `scripts/check-clean-state.mjs` itself so the validator does not self-flag its own pattern definitions.
   - It also treats stale session-state shape as a failure signal where practical: the validator only checks the `PROGRESS.md` handoff shape it can verify mechanically, while deeper task-state semantics stay with `./scripts/validate-feature-list.sh` and human review.
7. **UI-conventions gate**
   - `node scripts/verify-ui-conventions.mjs`
   - This runs inside `pnpm verify`, `pnpm verify:full`, and `pnpm verify:handoff`.
   - It scans `*Modal*.vue` files and `components/layout/**` paths that contain `modal` for native `<button>` / `<input>` usage.
   - Known legacy modal files are grandfathered in `scripts/verify-ui-conventions.mjs` until migrated (for example `RegionalPreferencesModal.vue` in issue #313).
   - New or migrated modal surfaces must use shadcn primitives (`UiButton`, `UiInput`, `UiDialog`) instead of native HTML controls.
8. **Architecture-invariant gate**
   - `node scripts/check-arch-invariants.mjs`
   - This runs inside `pnpm verify:full` and `pnpm verify:handoff`.
   - It enforces the ECAS API boundary for authenticated requests: raw `Authorization: Bearer ***` header construction belongs in `plugins/api.ts` or `composables/api/`, where token attachment and retry guidance stay centralized.
   - Current known legacy debt: `utils/categories.ts` has one allowed warning until that helper is migrated to the API plugin/service layer. Any new manual Bearer header outside the approved API boundary fails with file:line guidance.
9. **Targeted baseline check**
   - If you only need a smaller iteration, run `pnpm build`, `pnpm lint`, `pnpm typecheck`, and `pnpm test` directly.
10. **Targeted test**
   - Add or update a focused Vitest test when behavior can be checked without the browser.
   - Prefer RED → GREEN → REFACTOR for bug fixes and behavior changes.
11. **Browser/runtime smoke**

- Start `pnpm dev` or `pnpm preview` when UI/routes are affected and you need extra evidence beyond `pnpm verify`.
- Exercise the affected page or server route.
- Capture screenshot or exact route/flow evidence in the PR.

12. **Integration check**
    - If auth, checkout, cart, mock API, or state persistence changes, verify the full affected flow rather than only the touched component.

## Evidence policy

Use this policy to keep PRs reviewable and avoid scattering one-off artifacts across the repo.

- **Command output** stays in the PR body or PR comments when it is part of the proof. Keep the exact command and the relevant pass/fail output together.
- **Screenshots, logs, and runtime notes** belong in the PR body or linked PR comments when they help an evaluator verify the change without hunting through the diff.
- **Durable evidence** may be committed only when it is part of the repo's long-lived docs, tests, or fixtures. If the artifact is only proof of a run, do not commit it.
- **Temporary artifacts** belong in `tmp/` during capture and should be removed before handoff unless the issue explicitly asks to retain them.
- **Tracked `tmp/` files** are discouraged by default. If a `tmp/` artifact must be kept for review, document why it is retained and clean it up in the same task or follow-up.
- **Runtime links** in PR text should point at the exact route, log, or screenshot that proves the changed behavior.

Example evidence block for a future PR:

```md
## Evidence

- `pnpm verify`: pass
- `pnpm verify:full`: pass when runtime/API-boundary evidence was needed
- Runtime smoke: `/products/19` loaded successfully in `pnpm dev`
- Screenshot: `tmp/screenshots/products-19-after.png` (removed before merge)
- Notes: product media fallback renders correctly on mobile and desktop
```

## Local gate ownership

- **Pre-commit:** `lint-staged` runs Prettier on staged files only.
- **Pre-push:** `pnpm build`, `pnpm lint`, `pnpm typecheck`, and `pnpm test` (see `.husky/pre-push`). Prefer `pnpm verify` locally so `feature_list.json` validation is included.
- **Pre-handoff:** `pnpm verify:handoff` from a clean working tree.
- **CI:** `pnpm verify` (build, lint, typecheck, test, and `feature_list.json` validation). Use `pnpm verify:full` in the PR body when runtime/API-boundary evidence is required.
- **Evaluator pass check:** before marking a PR review-ready, confirm `gh pr view --json mergeable,mergeStateStatus` and do not pass any PR that is `mergeable=CONFLICTING` or `mergeStateStatus=DIRTY`.

## If a local gate fails

1. Stop and fix the failing command before pushing.
2. If `lint-staged` rewrites files, restage those changes and rerun the hook.
3. If the failure is outside the current scope, record the exact command and output in `PROGRESS.md` and do not widen the task.

## Done gate

A task is not done until all are true:

- Acceptance criteria from the issue are satisfied.
- Relevant verification commands passed or a failure is explicitly explained as pre-existing/not applicable.
- Browser/runtime evidence exists for UI or route changes.
- The evaluator confirmed the PR is mergeable and not in a conflict state before granting PASS.
- No unrelated refactor was bundled into the task.
- `feature_list.json` / `PROGRESS.md` are updated when durable state changed. GitHub Issues are the primary work tracker; `PROGRESS.md` is the current-state mirror for active issue/PR, blockers, and verification baseline.
- The PR body contains evidence, not just a confidence statement; for harness-state validator work, include the exact validator command output and at least one failure-mode example.
- For harness-state validator work, make the PR body itself repeat the related lectures list exactly as listed in the issue body, the validation rules, command evidence, and a failure-mode example so the evaluator can review the evidence without hunting through the diff.
- An evaluator other than the generator has reviewed the PR evidence and returned a passing verdict.

## Anti-premature-victory rules

- Do not say “done” because code compiles.
- Do not say “done” because unit tests pass if the feature crosses components.
- Do not refactor while fixing unless the refactor is necessary for the acceptance criteria.
- Do not broaden scope after a failing check; diagnose the failing signal first.
- If verification cannot be run, report that as a blocker/risk instead of substituting opinion.

## Evaluator rubric

Use this for independent review before asking Vlad to review. The evaluator must not be the same run/agent that generated the implementation.

| Dimension             | 0                          | 1                          | 2                                          |
| --------------------- | -------------------------- | -------------------------- | ------------------------------------------ |
| Scope control         | unrelated changes included | mostly scoped, small drift | exactly one issue/behavior                 |
| Acceptance criteria   | unclear or unmet           | partially met              | all criteria demonstrably met              |
| Verification evidence | none                       | static checks only         | static + targeted/browser/runtime evidence |
| Harness hygiene       | state/docs stale           | some state updated         | progress/features/handoff clean            |
| Risk reporting        | risks hidden               | risks vague                | risks explicit with next action            |

Minimum score before PR is review-ready: **8/10**, with no zero in verification evidence.

## UI and component conventions (evaluator checklist)

Mechanical gates do **not** enforce design-system consistency. Evaluators must check these manually when a PR touches Vue UI:

- **Modals and dialogs:** prefer `UiDialog`, `UiDialogContent`, `UiButton`, `UiInput`, and `UiLabel` from shadcn-nuxt over raw `<button>`, `<input>`, and `<label>` unless the issue explicitly calls for a legacy/native pattern.
- **Match nearby surfaces:** when editing an existing modal, follow the conventions of sibling modals only when the issue scope is a bugfix; prefer shadcn when the modal is being materially reworked or is a known follow-up (for example `RegionalPreferencesModal.vue`, issue #313).
- **Runtime evidence for UI:** modal and route changes need browser smoke on the affected flow, not only `pnpm verify` static output. Issue acceptance criteria that mention smoke-testing must show route/viewport evidence in the PR body.
- **PR template completeness:** generator PRs must fill the template sections (related lectures, verification outcomes, known risks, evaluator rubric). `node scripts/check-pr-template.mjs` enforces this in CI, and the `skip-pr-template-check` / `human-hotfix` label escape hatch is reserved for intentionally human-authored hotfix PRs. A minimal body with only command names is not review-ready even when CI passes.

## Agent-oriented failure messages

When adding tests or guardrails, write failures so a future agent knows how to fix them:

Bad:

```text
Auth failed
```

Good:

```text
Auth composable returned an unauthenticated state after login. Check that the mock login response updates the session token before redirecting to /dashboard.
```

A useful failure message says:

1. what went wrong
2. why it matters
3. where to look next

## Smoke gate

- Run `pnpm smoke` against `pnpm dev` to verify the core routes load without crashing.
- v1 smoke matrix: homepage (`/`) plus one representative product or gallery route selected from `pages/`.
- Treat this as the minimal runtime check before broader auth/cart/checkout/dashboard verification.
