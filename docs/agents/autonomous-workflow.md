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

## Accountable actor boundary

Once an agent can change state, its controller must keep an append-only JSONL run ledger. Each line is one completed run and must identify:

- the run, acting agent, role, issue, branch, and exact head SHA;
- allowed read paths, write paths, and commands, plus explicit denials;
- iteration, token, and dollar budgets alongside actual usage;
- ordered file and command actions;
- the stop reason;
- an evaluator with a different identity, its verdict, and the evaluated head;
- the accepted change, or `null` when the attempt was rejected.

Write local ledgers under ignored `tmp/`, for example `tmp/loop-runs.jsonl`. Do not commit production run ledgers: PR evidence should contain the relevant summary and verification links, not the potentially sensitive action log.

Validate a ledger and calculate its economics with:

```sh
node scripts/loop-accountability.mjs validate tmp/loop-runs.jsonl
node scripts/loop-accountability.mjs summary tmp/loop-runs.jsonl
```

The summary reports attempts, accepted changes, acceptance rate, total cost, and **cost per accepted change**. Rejected attempts remain in total cost. A run is invalid when identity is ambiguous, actions are out of order or outside permission scopes, a denial matches, usage exceeds a budget, the evaluator is the actor, the evaluated SHA differs, or PASS has no accepted change.

The ledger is an accountability contract, not an operating-system audit. The controller must append actions as they occur, copy token and cost usage from provider telemetry rather than estimating it, and the evaluator must compare the claimed actions with Git, CI, and runtime evidence. This tool grants no execution, merge, or self-modification authority.

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
5. Open or update a PR linked with `Closes #<issue>`.
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
