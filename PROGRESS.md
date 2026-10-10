# PROGRESS

## Current focus

- Manual reviewed reconciliation on 2026-10-10 because the scheduled routines ran out of time. This snapshot reflects live GitHub at origin/main ff8bf9cc. It claims no issue; recheck labels, assignees and linked PRs before pickup.

## In progress

- Open PRs needing generator fixes after exact-head FAIL: [#630](https://github.com/caraseli02/agent-Commerce/pull/630) (#587 Refund events, Codex; also CONFLICTING), [#627](https://github.com/caraseli02/agent-Commerce/pull/627) (#456 catalog ISR, Codex; also CONFLICTING), [#658](https://github.com/caraseli02/agent-Commerce/pull/658) (#632 shadcn parity harness, Claude; verify FAILURE) and [#652](https://github.com/caraseli02/agent-Commerce/pull/652) (shadcn migration plan docs, Claude).
- #588 late-paid compensation: PR #653 merged into the #630 branch, not main. #588 closes only when #630 lands.
- [#654](https://github.com/caraseli02/agent-Commerce/pull/654) (#556 Payment Element, Codex): verify green; the exact-head Claude verdict is BLOCKED.
- [#608](https://github.com/caraseli02/agent-Commerce/pull/608) (Mac mini autonomy proposal, draft): PASS on fd1565fe as an inactive discussion record only. Its head has since moved to a914cfb6.
- Open in-progress issues: #456, #556, #587, #588 and #606 (pre-push gate runs the full app gate on docs-only branches after merging main). No open `agent:claude` issue is in-progress; #632 is labeled blocked.

## Blocked / known baseline failures

- Stripe activation stays default-off pending #559 (blocked). #556 is labeled blocked.
- Stale labels: closed issues #514, #515, #516, #530 and #585 still carry `in-progress`. This reconciliation did not change any labels.
- Evaluator gaps on merged PRs (none inferred from merge): #620 has FAIL on an earlier head only; #624 has PASS on an earlier head only; #607, #622, #628, #655, #656 and #657 have no structured exact-head verdict.

## Verification baseline

- Merged since the last snapshot, all with passing exact-head GitHub verify: payments #607 (#586) and #629 (#585); caching #616 (#454) and #620 (#455); hydration #621, #622 and #628 (#514/#516/#515); SEO #623–#626 (#186–#189); app/ directory #655 (#530); deployment #656/#657; factory/harness #611–#615, #617–#619.
- This reconciliation changes only tracking files (`PROGRESS.md`, `feature_list.json`). The feature-list validator passes: 47 features, 0 active, 42 passing.
