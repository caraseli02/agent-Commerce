# Husky and independent local verification

Owner decision, 2026-10-19: GitHub Actions stay disabled. Husky and independent
local review replace hosted checks and the retired standalone CI service. This
supersedes the disabled-Actions acceptance blocker and Phase 1/2 deployment gates.
Autonomous implementation, independent PASS, readiness and the existing bounded
human queue may proceed under this policy. Vlad still reviews and merges.

## Before commit and push

- `pnpm install --frozen-lockfile` installs Husky through the existing `prepare` script.
- Pre-commit runs `pnpm exec lint-staged` on staged files.
- Pre-push reads the actual ref tuples once, validates the current descriptions of
  existing PRs for the pushed branches, runs `pnpm verify --reuse` against the pushed
  range and runs impact-selected macOS visual checks. Any failure stops the push.
- First pushes may have no PR yet. Before creating or editing the PR, run
  `node scripts/check-pr-template.mjs --body-file <file>` and publish that file with
  `gh pr create --body-file <file>` or `gh pr edit --body-file <file>`. The Claude
  guard already enforces this publication preflight. Evaluators validate live metadata.
- Keep one strongest delivery gate and the existing conservative documentation-only
  classification. Unknown/executable changes retain application checks. Do not disable
  hooks, lower thresholds, invent successful results or run a model to predict PASS.

## Independent review and readiness

The opposite builder reviews: Claude evaluates Codex PRs; Codex evaluates Claude
PRs. Internal builder consultations never supply acceptance. In an isolated local
review fixture, inspect the exact PR head and current base tip, execute the appropriate
fresh verification gate and affected runtime/browser checks. If the PR is behind its
base, verify the combined tree in that fixture. Never change the builder's branch.

Run this read-only command to validate the live PR body, view its current state,
and obtain the `marker` string for the report:

```sh
node scripts/owner-attention.mjs local-readiness PR_NUMBER
```

The marker records the exact head, the base tip and a digest of the body, labels and
base ref that the review tested. It is an audit line, not proof of test execution and
not a lifetime: the verdict belongs to the head ([verdict lifetime](#verdict-lifetime)).
Include it on its own line in each attributed report. Award PASS only after real checks pass:

```md
<!-- evaluator-head: <full-head-sha> -->

## Evaluator verdict

PASS — ready-for-human
Independent evaluator: Claude (separate reviewer).
<!-- local-verification: head=<full-head-sha> base=<full-base-sha> metadata=<digest> -->

## Evidence

- Exact commands, outcomes, tested head/base, and applicable runtime/browser evidence.
```

Use Codex attribution when reviewing Claude output. Include the existing rubric,
Standards/Spec findings and required follow-up. Recheck the command after publishing;
`readiness.ready=true` is required before readiness labels or new queue admission.
It requires a trusted, independently attributed PASS on the current head, valid live PR
metadata, mergeability, no change request and Claude protected-path authorization.
Payment paths follow normal label ownership and independent review; no Claude-specific exclusion applies (Vlad, 2026-10-20). Payment-contract guardrails and Stripe activation gates still apply. Never infer readiness
from a PASS on an earlier head.

Missing/failed local checks remain a blocker or repair. Disabled/missing/failed
`verify`, `check`, `local-ci/verify` and other retired CI statuses are not gates.
Vercel deployment status is deployment evidence, not a substitute for local tests.
Local hooks are bypassable and use the local environment: independent review and
human merge are the accepted safeguards, not an independent hosted CI guarantee.

## Verdict lifetime

A final report (PASS, FAIL or BLOCKED) belongs to the PR head it names and stands until the
head changes. A later `main`, PR body or label set does not reopen it: readiness checks
mergeability, the live PR template and protected-path authorization itself, and a conflict
is repaired with a new head. So a reviewer never reviews an unchanged head again, except:

- its newest report is `INCONCLUSIVE`, retried as before; or
- its newest report is FAIL or BLOCKED, with no PASS for that head since the last request,
  and a later comment starts with `<!-- external-review-request: <head> -->`. The builder
  posts it after a fix that needs no commit (the PR body, a label Vlad added) or once Vlad
  has recorded his decision on a BLOCKED head, with one line naming what changed. The
  request starts a new round: the head has no verdict until the next report, and then that
  report alone counts.

Reports for one head that disagree without such a request between them are contradictory
and need Vlad. A request never reopens a PASS; only a new head does. Codex already posts
this marker to ask for the first review of each new head; on an unchanged head it means the
same. Re-reviews of a new head after a FAIL follow the round rules in
[autonomous-workflow.md](autonomous-workflow.md#blocking-findings-and-re-review-rounds).

## Owner attention and archive

The existing dispatcher/reviewer/routine surfaces meaningful readiness, failures,
blockers and empty-queue decisions in its chat and GitHub evidence. Stay quiet while
unchanged. No Actions notifier, App-bot delivery, CI daemon or new scheduler is
required; never claim that posting through Vlad's account notified him.

The service, old workflows, tests and previous instructions are preserved in
[the retirement archive](../archive/local-ci/README.md). Do not reactivate them or
require their deployment/reboot/health proofs for ordinary autonomous work.
