# Verification and evaluator rubric

Use this doc to decide whether an Components Marketplace task is actually done. It implements the course recommendations for premature-victory prevention, full-pipeline verification, observability, and evaluator role separation.

## Verification ladder

Run the narrowest meaningful check first, then climb until the changed behavior is proven. Use targeted checks during implementation; choose one strongest broad gate at delivery. `verify:handoff` includes `verify:full`, which includes `verify`; do not run all three in sequence.

1. **Delivery gate**
   - `pnpm verify`
   - Runs `build`, `lint`, `typecheck`, `test:coverage`, and `feature_list.json` validation.
   - `pnpm test:coverage` measures all files in `composables/api/**` and `store/**`. The enforced global baseline is 28% statements, 23% branches, 25% functions, and 29% lines, rounded down from the initial measured report (28.78%, 23.45%, 25.55%, and 29.33%) to avoid false failures from insignificant instrumentation variance.
   - Run this before delivery/push, rather than after every focused repair. Default `verify` runs fresh; `--reuse` allows the matching successful local base-gate receipt described below. CI always runs fresh executable checks.
2. **Full local gate**
   - `pnpm verify:full`
   - Adds architecture invariants and preview smoke on top of the fast gate.
   - Use this when the change touches API boundaries, auth/cart/checkout/mock routes, or page-level runtime behavior.
3. **Pre-handoff gate**
   - `pnpm verify:handoff`
   - Adds clean-state validation to the full gate and expects a clean working tree.
   - Use this once before final PR/session handoff, after intentional files are committed or otherwise clean. Full/handoff reuse matching local base checks when available, then run their additional checks.
4. **Harness-state validator**
   - `./scripts/validate-feature-list.sh` whenever `feature_list.json` changes.
   - Use it to prove allowed statuses, WIP=1, and passing-item evidence stay mechanically correct.
5. **PR template completeness gate**
   - `node scripts/check-pr-template.mjs`
   - The focused `PR template / check` workflow runs separately from application CI and fails generator PRs whose body leaves the required template sections boilerplate-only or empty.
   - The workflow reads the current PR description from GitHub instead of trusting the immutable event snapshot. Description and label edits automatically rerun only this focused check; they do not rerun `pnpm verify`.
   - The gate expects filled verification outcomes, known-risks evidence, and rubric fields (scores are supplied by the independent evaluator); it skips when the PR carries the documented `skip-pr-template-check` or `human-hotfix` label so a human hotfix can intentionally bypass the agent template.
6. **Clean-state handoff validator**
   - `node scripts/check-clean-state.mjs`
   - This is a non-mutating handoff check that expects a clean working tree, rejects tracked temp/debug artifacts, and scans changed source files for fresh `console.log`, TODO/FIXME, or commented-out-code regressions. It intentionally skips scanning `scripts/check-clean-state.mjs` itself so the validator does not self-flag its own pattern definitions.
   - It also treats stale session-state shape as a failure signal where practical: the validator only checks the `PROGRESS.md` handoff shape it can verify mechanically, while deeper task-state semantics stay with `./scripts/validate-feature-list.sh` and human review.
7. **UI-conventions gate**
   - `node scripts/verify-ui-conventions.mjs`
   - This runs inside `pnpm verify`, `pnpm verify:full`, and `pnpm verify:handoff`.
   - It scans `*Modal*.vue` files and `components/layout/**` paths that contain `modal` for native `<button>` / `<input>` usage.
   - Known legacy modal files are grandfathered in `scripts/verify-ui-conventions.mjs` until migrated (for example `SearchFiltersModal.vue`).
   - New or migrated modal surfaces must use shadcn primitives (`UiButton`, `UiInput`, `UiDialog`) instead of native HTML controls.
8. **Architecture-invariant gate**
   - `node scripts/check-arch-invariants.mjs`
   - This runs inside `pnpm verify:full` and `pnpm verify:handoff`.
   - It enforces the Components Marketplace API boundary for authenticated requests: raw `Authorization: Bearer ***` header construction belongs in `plugins/api.ts` or `composables/api/`, where token attachment and retry guidance stay centralized.
   - Current known legacy debt: `utils/categories.ts` has one allowed warning until that helper is migrated to the API plugin/service layer. Any new manual Bearer header outside the approved API boundary fails with file:line guidance.
9. **Targeted baseline check**
   - Select only the relevant command(s): changed-file ESLint, `pnpm typecheck`, a focused `pnpm test <test-file>` (preserves the PostgreSQL wrapper), or `pnpm build` when compilation/build behavior is affected. Explain each selection.
10. **Targeted test**

- Add or update a focused Vitest test when behavior can be checked without the browser.
- Prefer RED → GREEN → REFACTOR for bug fixes and behavior changes.

11. **Browser/runtime smoke**

- Start `pnpm dev` or a fresh `pnpm preview` when observable UI/routes are affected, including indirect store, data, composable, layout, or style effects. Static success does not replace browser evidence.
- Exercise the affected page or server route.
- Capture screenshot or exact route/flow evidence in the PR.

12. **Integration check**
    - If auth, checkout, cart, mock API, or state persistence changes, verify the full affected flow rather than only the touched component.

## Targeted implementation and repair

1. Inspect the task diff against its base, including staged, unstaged, and task-owned untracked files. Trace affected consumers and shared dependencies before selecting checks.
2. Record the smallest check set with reasons and dependencies. Cover the changed behavior and affected integration boundary. Document why browser verification is not applicable when there is no UI effect.
3. For UI effects, follow `.agents/skills/verify-ui-change/SKILL.md`: exercise impacted routes/interactions, expected states, and relevant viewports. Shared styles or stores may require representative consumers beyond the directly edited component; do not default to the whole storefront.
4. On failure, make a focused repair and rerun the failed check plus any checks invalidated by the repair. Keep evidence only when its relevant source, dependencies, and environment remain unchanged; rerun the relevant check when uncertain.
5. Continue until the scoped behavior passes or the blocker protocol applies (two focused failed repair attempts, missing required decision, or unavailable required environment). Run the delivery gates when ready to ship; the independent evaluator remains responsible for PR readiness.

Documentation/skill-only local work can use changed-file formatting, link/frontmatter validation, and consistency inspection. Application build, tests, and browser checks are not required when no executable behavior or runtime configuration changed; state that reason in the evidence. Push/CI classify the actual committed range conservatively: verified documentation-only changes receive formatting/state validation; executable or unknown changes retain the application gate. PR-template validation remains separate.

## Saved verification state

Use one small Markdown record per task at ignored `tmp/verification/<task-id>.md` when work needs continuation or evidence reuse. Copy this template and omit inapplicable details with a reason:

```md
- Task/base/current revision: <task or issue; base SHA; HEAD SHA>
- Working diff fingerprint: <SHA-256 of base-to-HEAD diff + staged/unstaged binary diffs + sorted task-owned untracked paths/content>
- Stage: <inspect/select/check/browser/repair/delivery/blocked/complete>
- Selected checks: <command or flow; reason; relevant source/dependencies; routes/viewports or N/A>
- Results: <per-check pass/fail/pending; checked revision/fingerprint; environment/runtime identity; command output or screenshot/log path>
- Environment: <Node/pnpm; dev or preview URL; mock/auth/data setup; browser/version; relevant config identity without secrets>
- Runtime freshness: <preview build revision/fingerprint or dev server refresh/restart confirmation>
- Next action: <exact remaining check/repair/delivery action or blocker>
```

Compute the fingerprint from the actual diff bytes and untracked file contents, not file names/status alone. Include deletions, renames and binary changes; exclude the record and generated evidence. A HEAD SHA alone cannot identify uncommitted edits. Use stable ordering for untracked paths and identify task-owned paths explicitly rather than hashing unrelated work or secrets.

Associate each result with its checked environment/runtime identity (a short identifier referencing the setup is enough); do not overwrite older results with a newer global setup. Update the record after edits/checks and before interruption. On resume, compare revision, fingerprint, relevant dependencies, and environment against each result. A changed overall fingerprint prompts inspection of the change; it does not invalidate unrelated checks automatically. Reuse only evidence with demonstrably unchanged inputs. A preview must be rebuilt after a relevant edit; a dev server must have consumed the current changes (restart for config/server changes when needed). Never label a stale runtime check as evidence for the current diff.

This record is a local continuation aid, not a scheduler or an independent evaluator verdict. Keep durable issue/PR state in `PROGRESS.md` and `feature_list.json`; copy useful evidence into the handoff and remove temporary task records/artifacts before clean handoff. The ignored delivery receipt described below may remain until expiration for pre-push reuse.

## Local delivery receipt and focused documentation gate

Successful local application gates may write `tmp/verification/delivery.json` (ignored, never committed). Full/handoff and pre-push reuse only build/bundle/lint/typecheck/coverage evidence matching the current executable inputs and generated artifacts, less than four hours old. The fingerprint includes tracked and nonignored untracked input bytes/modes, Node/pnpm/Git/platform (normalizing Husky duplicate paths and Git’s injected executable directory), locked installation metadata, installation-anchor timestamps and directory identity (generated cache writes do not invalidate evidence), `.env`/`.env.local`, relevant application/test environment values, and the checkout path. Only digests are stored; credentials are not written to the receipt. Generated `.output` and `.nuxt` contents must also match.

Documentation/state text is excluded from application evidence, so a tracking update does not rerun unchanged application checks. Feature/UI validators still run on reuse, full/handoff still run architecture and fresh preview smoke, and handoff still requires a clean tree. Visual selection is independently bound to the pushed runtime patch. Missing/malformed/expired receipts, missing dependencies/artifacts, changed inputs, or failed gates run fresh or block. A failed verification attempt removes any old receipt; a successful run writes one only if executable inputs stayed unchanged throughout. Use `--fresh` after installing/modifying dependencies manually, after an unresolved focused-test failure, or whenever an external environment change makes earlier evidence insufficient. Receipts do not prove arbitrary manual changes inside installed packages and never replace independent review.

CI never reads/reuses local receipts. `--base <ref> --head <ref>` enables conservative documentation-only classification over the complete committed range plus current dirty/untracked inputs. Only named root Markdown/state files, Markdown under `docs/`, and skill Markdown qualify. Tests, workflows, hooks, scripts, dependencies, public Markdown, arbitrary JSON, symlinks, executables, unknown paths, renames/deletions of executable files, and unavailable bases cannot waive application checks. Pre-push requires the exact pushed HEAD and a clean checkout, including tracking files, so validators cannot accidentally prove a different committed state. A pushed executable tree different from the checkout blocks verification. Multiple pushed ranges conservatively use the full gate.

Documentation-only runs use changed-file Prettier and feature-state validation; handoff also checks clean state. Explicitly inspect links and document consistency. CI obtains its base from the event and fetches full Git history. The classifier is stricter than the visual selector: a nonvisual test or workflow still requires the application gate.

## Evidence policy

### Stripe activation cross-version proof

`tests/payment-preparation.spec.ts` reproduces the pre-#561 mock `completePayment` SQL against a Payment carrying a Stripe intent marker. The old predicate still changes that row to `PAID` on the compatible schema. This is evidence that schema expansion and the current deployment's guarded writer do not make a shared database safe for Stripe activation. #559 must enumerate and retire or isolate every reachable old writer, then replay the old deployment against the activation candidate and prove it cannot mark a Stripe-backed Payment or Order paid. Keep Stripe creation disabled until that deployment-level proof passes.
The current writer still fills legacy payment-choice columns for old readers, but its Payment projection, payment decisions, and checkout response do not read those columns.

Use this policy to keep PRs reviewable and avoid scattering one-off artifacts across the repo.

- **Command output** stays in the PR body or PR comments when it is part of the proof. Keep the exact command and the relevant pass/fail output together.
- **Screenshots, logs, and runtime notes** belong in the PR body or linked PR comments when they help an evaluator verify the change without hunting through the diff.
- **Durable evidence** may be committed only when it is part of the repo's long-lived docs, tests, or fixtures. If the artifact is only proof of a run, do not commit it.
- **Temporary artifacts** belong in `tmp/` during capture and should be removed before handoff unless the issue explicitly asks to retain them.
- **Tracked `tmp/` files** are discouraged by default. If a `tmp/` artifact must be kept for review, document why it is retained and clean it up in the same task or follow-up.
- **Runtime links** in PR text should point at the exact route, log, or screenshot that proves the changed behavior.

## Local visual-regression pilot

The visual suite is a local review aid for the Tailwind/Nuxt recovery work. Husky invokes `pnpm verify --reuse` with the actual pushed base/head, then uses `scripts/select-visual-checks.mjs` to skip, target, or run the full visual suite from the pushed changes. Selected visual mismatches block normal macOS pushes. Other platforms explicitly report the unsupported baselines when visuals are selected. The suite is not a GitHub required check, does not independently block merges, and has no CI job, artifact upload, Docker/Linux baseline, or visual SaaS integration.

### Push impact selection

The hook reads Git's pre-push ref tuples before any child command can consume stdin. Existing refs use the actual remote SHA → pushed SHA range; first pushes use the merge base with `refs/remotes/<remote>/main`. Missing refs/base objects block the push with a diagnostic; fetch the remote main/ref and retry. All commits are included, renames are inspected as deletion + addition, ref deletions need no screenshots, and multiple refs union their checks. A different pushed runtime tree requires its own checkout; the current checkout cannot prove its visuals.

Only known docs, agent/workflow/hook tooling, nonvisual tests, durable harness state, and the selector itself automatically skip screenshots. Application files of every extension, server responses, stores, composables, shared data/types/config, build scripts, dependencies, visual specs and baselines default to **full**. Paths alone cannot prove a backend change has no observable effect.

For runtime changes, trace callers and observable writes, then commit `.visual-impact.json` with a reviewable assessment. Inspect a local plan after committing the runtime changes:

```sh
node scripts/select-visual-checks.mjs --base origin/main
# Subsequent push: use the branch's remote tip as --base instead.
```

Copy the relevant decision's `fingerprint` into this record:

```json
{
  "assessments": [
    {
      "fingerprint": "<printed SHA-256>",
      "impact": "none",
      "reason": "Internal operation has no observable UI effect",
      "consumers": "Describe traced callers, routes, reads and writes; explain why none reaches visible state"
    }
  ]
}
```

Use `impact: "targeted"` plus `tests: ["product", "cart"]` for affected visual groups. Available groups: `home`, `search`, `product`, `cart` (both viewports), and `orders` (mobile). Record exact routes/states/viewports and why this set covers the impact in the PR. Effects outside the screenshot matrix still require targeted browser evidence; selecting a group is not a substitute for that evidence. Use `impact: "uncertain"` or omit the assessment for the full suite.

Assessments bind to the complete runtime patch, including binary content, old/new paths and modes. Documentation-only assessment commits preserve that fingerprint. Changed runtime contents or a new push base invalidate it: inspect the newly pushed range and refresh the assessment, or accept the full suite. Staged/unstaged and untracked nonignored runtime changes create separate conservative decisions, so a local reversal cannot hide a committed pushed change. The hook reads assessments from the pushed commit; uncommitted assessments cannot waive it. Keep the checkout clean for delivery so screenshots test the pushed runtime.

The assessment is a reviewed consumer-tracing assertion, not an automated proof of behavior. Evaluators must challenge skips and narrow selections against the actual diff. Missing, malformed, stale, empty or unknown selections fall back to full. No application response or Stripe gate is changed by this mechanism. GitHub CI runs `pnpm verify --base <event base>` with reuse disabled; executable/unknown ranges receive the full gate and documentation-only ranges receive the focused gate. macOS baselines remain local.

- Run `pnpm test:visual` to build the app and exercise the visual matrix against a fresh local Nitro preview at `http://127.0.0.1:3100`. It must not be pointed at `pnpm dev`.
- Run `pnpm test:visual:update` only when intentionally accepting a visual change. It writes the committed PNG baselines under `tests/visual/__screenshots__/`.
- On a mismatch, Playwright writes actual and diff images under `test-results/visual/`; open `playwright-report/visual/index.html` for the HTML report. Expected images are the baseline PNGs beside the visual spec.
- Treat an update as a code-review decision: inspect expected, actual, and diff images; confirm the change protects the intended page rather than hiding a loading/auth/error state; then keep only the deliberate baseline change.
- First diagnose mismatches through the test's console, hydration, page-error, failed-request, and 5xx assertions. Do not widen screenshot tolerance or mask icons, navigation, headers, product cards, or protected content merely to make a run pass.
- Baselines are currently local Chromium captures and include the platform token in their filename. Text rasterization and browser/OS rendering can differ on Linux, so future CI adoption needs a separately reviewed Linux baseline strategy rather than overwriting this pilot's local images.

The pilot fixes light color scheme, `en-US`, UTC, reduced motion, isolated Playwright pages, mock data/auth/cart setup, font readiness, and disabled transitions. The shared 100-pixel allowance only absorbs trivial local raster variation; it is not a layout tolerance.

Example evidence block for a future PR:

```md
## Evidence

- `pnpm verify:handoff`: pass (the one chosen delivery gate, including lower checks)
- Runtime smoke: `/products/19` loaded successfully in `pnpm dev`
- Screenshot: `tmp/screenshots/products-19-after.png` (removed before merge)
- Notes: product media fallback renders correctly on mobile and desktop
```

## Local gate ownership

- **Pre-commit:** `lint-staged` runs Prettier on staged files only.
- **Pre-push:** `pnpm verify --reuse` on every platform against the pushed range, followed by impact-selected visuals on macOS (see `.husky/pre-push`). A failed command stops the normal push; non-macOS platforms report unsupported baselines for selected visuals. No hook bypass is needed for a verified no-UI-impact change.
- **Pre-handoff:** `pnpm verify:handoff` from a clean working tree.
- **CI:** fresh `pnpm verify --base <event base>` (build, lint, typecheck, coverage-enforced tests, and `feature_list.json` validation for executable/unknown changes; focused formatting/state checks for verified documentation-only changes). Use `pnpm verify:full` in the PR body when runtime/API-boundary evidence is required.
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
- For harness-state validator work, make the PR body itself repeat the validation rules, command evidence, and a failure-mode example so the evaluator can review the evidence without hunting through the diff.
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
- **Match nearby surfaces:** when editing an existing modal, follow the conventions of sibling modals only when the issue scope is a bugfix; prefer shadcn when the modal is being materially reworked or is a known follow-up (for example `CustomProductPartNumberModal.vue`).
- **Runtime evidence for UI:** modal and route changes need browser smoke on the affected flow, not only `pnpm verify` static output. Issue acceptance criteria that mention smoke-testing must show route/viewport evidence in the PR body.
- **PR template completeness:** generator PRs must fill the template sections (verification outcomes, known risks, evaluator rubric) before opening the PR. Rubric numeric scores are filled by the evaluator before PASS; generators may leave `/10` placeholders. The focused `PR template / check` workflow enforces this against current GitHub metadata, and the `skip-pr-template-check` / `human-hotfix` label escape hatch is reserved for intentionally human-authored hotfix PRs. A minimal body with only command names is not review-ready even when application CI passes.

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
- Use this broad smoke at delivery when required by the full gate. During repairs, exercise only the affected route/flow and its relevant consumers.
