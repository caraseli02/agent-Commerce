# DECISIONS

Use this file for durable cross-session decisions that should survive context resets.

## Format

- Date
- Decision
- Reason
- Impact

## Example

- 2026-06-12 — Use pnpm as the package manager

  - Reason: matches the repo and existing scripts
  - Impact: all install/run/verify commands should use pnpm

- 2026-06-12 — Use GitHub Issues as the task queue for autonomous work

  - Reason: issue labels and assignment prevent duplicate work better than ad hoc prompts
  - Impact: autonomous loops must claim `ready-for-agent` issues and keep WIP=1

- 2026-06-16 — Adopt the full Learn Harness Engineering minimal pack plus Components Marketplace topic docs

  - Reason: the repo needed explicit coverage for lectures 9–12: premature victory, full-pipeline verification, observability, and clean handoff
  - Impact: fresh sessions should use `./init.sh`, `docs/agents/session-lifecycle.md`, `docs/agents/verification.md`, and `docs/agents/harness-audit.md` before declaring work done

- 2026-06-17 — Use goal-shaped control for evaluator repair loops

  - Reason: a standing goal keeps the same issue alive after evaluator rejection instead of re-queuing failed work or asking Vlad to prompt the next step.
  - Impact: cron may wake the planner/generator/evaluator, but WIP remains 1; evaluator failures stay `in-progress`, generate a repair brief for the same branch/PR, and the Dev ship path immediately triggers evaluator review after every PR update.

- 2026-07-01 — Hide portfolio demo passwords in the account panel

  - Reason: demo reviewers need an obvious sign-in path, but visible passwords reduce trust and look less production-minded.
  - Impact: demo role selection may prepare sign-in internally, but the account panel should not render demo passwords in plain text.

- 2026-08-05 — Prefer **Buyer Flow** over **Scripted Buyer Path**

  - Reason: the design contract names a storefront capability, not a demo rehearsal script; “buyer flow” matches the FCC-style problem statement.
  - Impact: `CONTEXT.md` uses Buyer Flow as the glossary term; design doc lives at `docs/buyer-flow-design-contract.md`; treat “Scripted Buyer Path” as a legacy alias in older issues/docs.

- 2026-08-06 — Scope remaining June-review epics to Portfolio Demo depth

  - Reason: #101’s Pinia bugs were already fixed; #99/#103 were written as production hardening/SEO programs that conflict with `CONTEXT.md` (Mock Integration Boundary outside production auth/SEO ops).
  - Impact: closed #101; rewrote #99 as demo auth integrity (`requireMockAuth` seam) and closed #109/#111/#113 as `wontfix`; rewrote #103 around `usePageSeo` + public crawl hygiene; children promoted `ready-for-agent` at `priority:p2` so Next track `#426`–`#433` stays first.

- 2026-08-10 — Version and self-monitor the local ECAS loop controller

  - Reason: the unversioned LaunchAgent hook silently stopped for weeks after a stale lock directory survived a completed run.
  - Impact: canonical controller/runtime sources live under `scripts/`; locks use PID-aware recoverable leases; each run records a heartbeat; `--health` and `--inspect` expose non-mutating operational state.

- 2026-08-10 — Treat CI failures and current-head review findings as first-class repair inputs

  - Reason: evaluator-only markers did not react to failed `CI / verify`, Qodo findings, or trusted human change requests, leaving Vlad to prompt repairs and thread resolution manually.
  - Impact: failed current-head CI runs, actionable current-head Qodo reports, and trusted `CHANGES_REQUESTED` reviews launch attempt-scoped same-PR repair tasks. Stale/untrusted signals are ignored, and evaluator dispatch requires successful current-head CI.

- 2026-08-10 — Keep dreamed harness knowledge separate until independently promoted

  - Reason: cross-session synthesis is useful for recurring failure fingerprints but must not let untrusted logs/comments rewrite trusted policy.
  - Impact: reflection outputs are candidates with provenance and independent review; they may propose tests/playbooks through a normal PR but cannot directly mutate `AGENTS.md`, CI policy, or merge protections.

- 2026-08-10 — Reserve active workflow labels for open work

  - Reason: 69 closed issues still carried `ready-for-agent`, `in-progress`, or `blocked`, making the autonomous queue and durable progress mirror disagree with reality.
  - Impact: `scripts/loop-state-reconcile.mjs` removes only those workflow labels from closed issues, defaults to dry-run, and requires `--apply` for mutation; priority, severity, and category labels are preserved.

- 2026-08-10 — Run a weekly evidence-to-candidate reflection
  - Reason: repeated CI and review friction should become inspectable improvement proposals without letting operational transcripts directly rewrite trusted behavior.
  - Impact: the active `ecas-loop-dreaming` automation reviews recent CI, PR, commit, and controller evidence each Monday; it creates at most one deduplicated `ready-for-human` candidate issue and never edits code, policy, or existing work state.
