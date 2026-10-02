# agent-Commerce Progress

## Current focus

- User-directed workflow repair #582 on `codex/payment-workflow-reconciliation`, from clean merged #581/main (`5cd361e8`). Payment behavior and Stripe activation are unchanged.
- #557/#558 are fixed tracking epics, excluded from executable WIP. Their remaining native children are #584–#588. Separate contract cleanup is #583.

## In progress

- #582 / draft PR #589 only: delivery evidence reuse, conservative documentation classification, and bounded child-issue guidance. Native ownership/dependencies are acyclic with WIP=1. The cold-cache timestamp CI regression is repaired: focused tooling tests pass 29/29 and fresh clean-tree handoff passes 94 files / 583 tests / 2 existing todo, build/lint/typecheck, architecture, preview /,/cart,/checkout and clean state. Final-head CI and independent evaluation/merge remain pending.

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

- Fresh CI and independent evaluation of the #582 PR. Challenge receipt invalidation, conservative documentation selection, exact-head mergeability, and the native dependency graph. No self-awarded PASS; keep WIP=1 until review/merge state is resolved.

## Next work

- After workflow repair review, choose one unblocked payment child (#584 or #586; #585 needs the recorded policy decision first); normally one coherent PR closes the entire child. #587/#588 follow their named capabilities. #583 is separate cleanup.
- Tracking epics close only after their fixed child checklist and integration evidence pass. New unrelated findings become separate backlog issues.
