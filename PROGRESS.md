# agent-Commerce Progress

## Current focus

- User-directed workflow repair #582 on `codex/payment-workflow-reconciliation`, from clean merged #581/main (`5cd361e8`). Payment behavior and Stripe activation are unchanged.
- #557/#558 are fixed tracking epics, excluded from executable WIP. Their remaining native children are #584–#588. Separate contract cleanup is #583.

## In progress

- #582 only: local delivery evidence reuse, conservative documentation-only classification, and planner/evaluator guidance for complete bounded child issues. Focused tooling tests pass 27/27, including Husky PATH equivalence; native GitHub ownership/dependencies are verified acyclic with WIP=1. Initial fresh handoff passed 580 tests, architecture/preview/clean state. Final normal push and receipt reuse are next after the scoped PATH repair.

## Blocked / known baseline failures

- Stripe activation stays off until #559 proves unsafe shared-database writer retirement and complete sandbox integration.
- #585 is blocked for the missing deterministic commercial ALLOCATE/BACKORDER/REFUND selection policy; the ADR defines safety, not that policy. #587 depends on #586; #588 depends on #585/#586/#587. #556 depends on #584/#588 and merged backend resume. Epics are not executable prerequisites.
- Historical #580 managed-worktree hook failures came from Git context leaking into fixture repositories. Verification child processes now strip hook-local Git redirection; no payment source is changed.
- The previously recorded guest order-detail null-user `adminSettings` error remains outside this workflow repair.

## Verification baseline

- Merged #581 reports fresh CI: 93 files, 567 passing tests, 2 existing pending tests; owner-scoped local state snapshot verified by 35 PostgreSQL tests and independent PASS 10/10.
- Existing initialization is reused; no new checkout or dependency installation is required for this continuing session. Current Node 24.21.0 / pnpm 10.18.3.
- Historical payment implementation and verification evidence remains linked from #557 and its merged PRs; current planning no longer repeats each old slice here.

## Next verification

- Focused receipt/classifier/pre-push tests, lint/formatting, feature-state validation, then one fresh strongest delivery gate. Challenge receipt invalidation, CI freshness, conservative fallback, and actual native GitHub dependency graph.

## Next work

- After workflow repair review, choose one unblocked payment child (#584 or #586; #585 needs the recorded policy decision first); normally one coherent PR closes the entire child. #587/#588 follow their named capabilities. #583 is separate cleanup.
- Tracking epics close only after their fixed child checklist and integration evidence pass. New unrelated findings become separate backlog issues.
