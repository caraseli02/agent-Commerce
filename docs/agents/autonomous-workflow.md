# Autonomous workflow: planner, generator, evaluator

ECAS autonomous work follows the Learn Harness Engineering recommendation to separate planning, generation, and evaluation. The generator must not be the final judge of completion.

## Roles

| Role | Responsibility | Must not do |
| --- | --- | --- |
| Planner | Select one eligible issue, claim it, write the work brief, define verification expectations | Edit implementation code or declare the issue complete |
| Generator | Implement the claimed issue, run local pre-flight checks, open or update a PR | Select new work, broaden scope, or self-certify final completion |
| Evaluator | Independently verify the PR against the issue, related lectures, runtime evidence, and clean-handoff requirements | Implement unrelated fixes or accept generator confidence as proof |

## Queue state model

Default minimal flow:

1. `ready-for-agent` — scoped issue is eligible for planner pickup.
2. `in-progress` — planner claimed the issue and generator may work only on that issue.
3. Open PR exists — generator output is ready for independent evaluation.
4. `ready-for-human` — evaluator passed the PR and it is ready for Vlad's review.
5. `blocked` or issue comment — evaluator found a concrete blocker or missing evidence.

Use this minimal flow unless the project explicitly adds a `ready-for-evaluator` label. An evaluator can discover work by scanning open PRs linked to `in-progress` issues.

## Planner contract

The planner output must include:

- Issue number, title, URL, and branch name.
- Acceptance criteria summary.
- Files or areas likely to change.
- Dependency check: what must already be merged or true.
- Verification plan: narrow check first, then full gate if relevant.
- Evaluator expectations: what evidence the evaluator should require.
- Related lectures or source docs when the issue comes from harness work.

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
- Run or inspect evidence for the relevant verification ladder in `docs/agents/verification.md`.
- Require browser/runtime evidence for UI, route, auth, cart, checkout, mock API, or state-flow changes.
- Verify the PR body includes related lectures/source docs when applicable.
- Confirm clean handoff: branch/PR linked, issue state clear, risks documented, and no temporary/debug files left behind.

Verdicts:

- `PASS — ready-for-human`: add or keep `ready-for-human`; comment with evidence summary.
- `FAIL — needs generator fix`: comment with exact failing check and repair instruction; keep `in-progress`.
- `BLOCKED — needs human decision`: add/use blocker communication with the concrete missing decision.

## Evaluator report format

```md
## Evaluator verdict
PASS | FAIL | BLOCKED

## Issue / PR
- Issue: #N
- PR: #N

## Related lectures / sources checked
- Lecture XX — <title>

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
