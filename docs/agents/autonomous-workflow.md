# Autonomous workflow: planner, generator, evaluator

Components Marketplace autonomous work follows the Learn Harness Engineering recommendation to separate planning, generation, and evaluation. The generator must not be the final judge of completion.

## Goal-shaped controller loop

The autonomous loop should behave like a standing `/goal` even when cron wakes individual stages:

- Keep exactly one issue active at a time.
- A planner claim moves `ready-for-agent` → `in-progress`.
- A generator opens or updates the PR for that same issue/branch.
- The ship path triggers evaluator review immediately after the PR head changes; do not wait for the next scheduled evaluator tick when a PR is ready.
- If the evaluator returns `FAIL`, keep the issue `in-progress`, keep the same branch/PR, and produce a focused repair brief from the evaluator comment.
- Do not promote or select a new issue while an `in-progress` issue has an open PR unless that issue is passed/blocked and state cleanup is complete.

This is the runtime equivalent of: “work the currently claimed Components Marketplace issue until it is evaluator-approved or blocked.”

## When a heavy loop is justified

Use a recurring or unattended loop only when all four conditions are true:

1. The same task repeats at least weekly.
2. A machine check can reject bad output.
3. The agent can complete the task end to end.
4. “Done” is objective rather than a taste judgment.

If any condition is false, use a bounded agent task with a human in the loop. Do not add a system loop that rewrites this workflow without a separate human-approved issue.

## Proportionate observability

The default controller keeps one compact append-only summary per local repair attempt. The summary records the issue, PR, exact head, source key, start/end timestamps, result, and published head. GitHub owns the live queue and PR state; the controller's local state fences repair attempts and crash recovery.

Do not duplicate every command and file event into another mandatory ledger for this human-merged portfolio repository. The raw trace remains available for debugging, while CI, commits, PR discussion, and the independent evaluator provide the acceptance evidence.

Use the stricter `scripts/loop-accountability.mjs` ledger only when the loop gains materially higher authority or risk, such as autonomous merge/deploy, customer or payment data, compliance obligations, multiple concurrent writers, or significant metered spend. That tool grants no execution, merge, or self-modification authority.

## Minimal controller contract

- Wake from macOS cron every 30 minutes; one local controller process performs low-frequency reconciliation and one bounded repair at a time.
- Treat `{source ID, current head SHA}` as the idempotency key.
- Route CI failure, formal `CHANGES_REQUESTED`, trusted root inline review, actionable Qodo/Greptile feedback, and an exact-head `/repair <40-char-sha> <instruction>` command through one local repair worker. Bare or stale-head repair commands are ignored.
- Never infer a repair command from ordinary top-level prose.
- Allow at most two repair attempts for a PR, then mark the linked issue blocked for human attention.
- Persist the attempt before launching the worker. A crash therefore consumes an attempt instead of permitting an unbounded retry. A fresh running record prevents overlapping cron invocations; a stale record may use the second and final attempt.
- Run Codex in a temporary exact-head worktree under a macOS sandbox. The worker can read/write only that worktree and its disposable runtime, cannot inspect other processes, and cannot use network from model-generated commands. It receives no GitHub credential and no reusable Codex/OpenAI credential.
- Keep API authentication, exact-head revalidation, commit, and push in the trusted controller. A localhost Responses proxy substitutes a dedicated Keychain API key for a random per-run token and accepts only the Responses endpoints.
- Deny Keychain executables and security-service IPC inside the worker sandbox, reject credential-bearing output, cap a repair at 12 files/1,200 changed lines, and publish with an expected-head Git lease.
- Use CI plus an independent reviewer or human review after each update. Current-head Greptile 5/5 or a trusted approval promotes the linked issue to `ready-for-human`; actionable current-head feedback returns through the same local worker. Humans remain the only merge authority.

Activation requires GitHub CLI authentication plus a dedicated, spend-limited OpenAI API key stored in macOS Keychain with account `openai` and service `ecas-loop-openai-api-key`. Do not place the key in the repository, crontab, shell profile, or controller environment. Start with `ECAS_LOOP_OBSERVE_ONLY=true` so decisions are visible without GitHub, worker, or attempt-state mutations.

Run one reconciliation with `ECAS_LOOP_OBSERVE_ONLY=true node scripts/ecas-loop-controller.mjs`; use `node scripts/ecas-loop-controller.mjs --inspect` for a mutation-free decision and `node scripts/ecas-loop-controller.mjs --health` for heartbeat status. Install cron only from a trusted, merged checkout. On this Mac the intended entry is:

```cron
*/30 * * * * cd /Users/vladislavcaraseli/Documents/Ecas && ECAS_REPO_ROOT=/Users/vladislavcaraseli/Documents/Ecas /opt/homebrew/bin/node scripts/ecas-loop-controller.mjs >> /Users/vladislavcaraseli/.codex/automations/ecas-pr-repair-hook/cron.log 2>&1
```

The cron entry is deliberately not committed or installed by the PR. Activate it after this controller is merged, the stable checkout is updated, the Keychain item exists, and an observe-only run selects the expected action.

## Roles

| Role      | Responsibility                                                                                  | Must not do                                                       |
| --------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Planner   | Select one eligible issue, claim it, write the work brief, define verification expectations     | Edit implementation code or declare the issue complete            |
| Generator | Implement the claimed issue, run local pre-flight checks, open or update a PR                   | Select new work, broaden scope, or self-certify final completion  |
| Evaluator | Independently verify the PR against the issue, runtime evidence, and clean-handoff requirements | Implement unrelated fixes or accept generator confidence as proof |

## Queue state model

Default minimal flow:

1. `ready-for-agent` — scoped issue is eligible for planner pickup.
2. `in-progress` — planner claimed the issue and generator may work only on that issue.
3. Open PR exists — generator output is ready for independent evaluation.
4. Evaluator `FAIL` — same issue/branch/PR receives a repair brief; WIP remains 1.
5. `ready-for-human` — evaluator passed the PR and it is ready for Vlad's review.
6. `blocked` or issue comment — evaluator found a concrete blocker or missing evidence.

Use this minimal flow unless the project explicitly adds a `ready-for-evaluator` label. An evaluator can discover work by scanning open PRs linked to `in-progress` issues.

## Planner contract

The planner output must include:

- Issue number, title, URL, and branch name.
- Acceptance criteria summary.
- Files or areas likely to change.
- Dependency check: what must already be merged or true.
- Verification plan: narrow check first, then full gate if relevant.
- Evaluator expectations: what evidence the evaluator should require.

The planner must claim exactly one issue and keep WIP=1.

## Generator contract

The generator must:

1. Read the planner work brief and the full GitHub issue.
2. Start from clean latest `main` and work on the claimed branch only.
3. Make the smallest change that satisfies the issue.
4. Run local pre-flight verification from the brief.
5. Open or update a PR linked with `Closes #<issue>`. Populate `.github/pull_request_template.md` in the initial create command; do not open an empty PR and patch its description later.
6. End with `PR ready for evaluator`, not `done`.

The generator's checks are useful evidence, but they are not the final done gate.

## Evaluator contract

The evaluator must inspect the PR independently and produce a structured verdict.

Required checks:

- Compare PR diff against the issue acceptance criteria.
- Confirm no unrelated broad refactor or second issue was included.
- Check GitHub mergeability before PASS: run `gh pr view --json mergeable,mergeStateStatus` and require the PR to be mergeable. If `mergeable=CONFLICTING` or `mergeStateStatus=DIRTY`, verdict must be `FAIL — needs generator fix` until the branch is rebased or conflicts are resolved.
- Run or inspect evidence for the relevant verification ladder in `docs/agents/verification.md`.
- Require browser/runtime evidence for UI, route, auth, cart, checkout, mock API, or state-flow changes.
- Confirm clean handoff: branch/PR linked, issue state clear, risks documented, and no temporary/debug files left behind.

Verdicts:

- `PASS — ready-for-human`: add or keep `ready-for-human`; comment with evidence summary. A PR with merge conflicts must never receive PASS.
- `FAIL — needs generator fix`: comment with exact failing check and repair instruction; keep `in-progress` and repair the same PR/branch.
- `BLOCKED — needs human decision`: add/use blocker communication with the concrete missing decision.

## Repair loop rule

When an `in-progress` issue already has an open PR, controller logic must route by evaluator state:

- No current-head evaluator verdict: wait for evaluator; do not run generator again.
- `PASS`: wait for human review/merge or state cleanup; do not select new work until WIP is clear.
- `FAIL`: generate a focused repair brief from the evaluator comment and update the same branch/PR.
- `BLOCKED`: leave the blocker visible and stop autonomous work on that issue.

For an ordinary PR conversation comment, a trusted maintainer can use `/repair <40-char-sha> <instruction>` to request a bounded local repair. The SHA must be the current PR head at the time of posting; the controller ignores bare and stale commands so it cannot replay work. Free-form prose and direct `@codex fix` comments never trigger it.

## Evaluator report format

```md
## Evaluator verdict

PASS | FAIL | BLOCKED

## Issue / PR

- Issue: #N
- PR: #N

## Evidence reviewed

- `<command>`: pass/fail + summary
- Runtime/browser evidence: route/flow/screenshot/log, or N/A with reason

## Rubric

- Scope control: 0/1/2
- Acceptance criteria: 0/1/2
- Verification evidence: 0/1/2
- Harness hygiene: 0/1/2
- Risk reporting: 0/1/2
- Total: X/10

## Required follow-up

- none, or exact repair instruction
```

A PR is not review-ready unless the evaluator rubric is at least 8/10 and verification evidence is not 0.

## Lecture mapping

- Lecture 09: separate worker from checker; prevent premature completion declarations.
- Lecture 10: require full-pipeline/runtime verification when component boundaries matter.
- Lecture 11: make runtime state and evaluation evidence observable.
- Lecture 12: leave clean issue, PR, branch, and handoff state for the next session.
