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

- 2026-08-24 — Treat Components Marketplace as production-quality architecture delivered through a demo-safe environment

  - Reason: the portfolio should demonstrate production-minded web application design even when real traffic, live payments, and production infrastructure are intentionally absent.
  - Impact: mock/sandbox implementations remain valid for the demo, but business-critical boundaries, security, failure handling, state ownership, and replaceability should be evaluated against production-quality expectations. See `docs/system-design-review.md`.

- 2026-08-24 — Keep Nuxt/Nitro as a modular monolith for the current target production envelope

  - Reason: the current target (roughly thousands of products, low thousands of users/day, tens of concurrent users, and tens/low hundreds of orders/day) does not justify a separate backend service. Traffic growth alone is not a sufficient service-split driver.
  - Impact: prefer strengthening server-side modules and adding a production-grade relational database before creating a separate Node backend. Split services only when independent clients, deployments, teams, workloads, or domain boundaries justify it.

- 2026-08-24 — Server establishes authoritative e-commerce business truth

  - Reason: browser state is untrusted and may be stale or manipulated.
  - Impact: price, stock, checkout totals, order state, payment state, cart ownership, and authorization must be validated/established server-side. Checkout requests should communicate user intent rather than authoritative commercial totals.

- 2026-08-24 — Production checkout requires atomic inventory reservation, idempotency, and recoverable payment state

  - Reason: concurrent checkout, duplicate requests, provider timeouts, and partial failures can otherwise oversell inventory, double-charge customers, create duplicate orders, or lose recovery context.
  - Impact: target checkout creates durable `PENDING_PAYMENT` state, atomically reserves inventory, uses idempotency for payment/checkout attempts, treats ambiguous provider responses as unknown rather than failed, supports webhook/reconciliation recovery, and clears purchased cart state only after the purchase is safely committed. Detailed reasoning lives in `docs/system-design-review.md`.

- 2026-08-28 — Validate PR descriptions separately from application CI using current GitHub metadata

  - Reason: the former check ran at the end of `pnpm verify` against the immutable workflow-event snapshot, so PR descriptions completed after creation still appeared empty or incomplete and made otherwise-green application checks red.
  - Impact: `pnpm verify` covers repository behavior only; the trusted `PR template / check` workflow fetches the current PR body and reruns on description or label edits.

- 2026-08-31 — Run bounded autonomous repair locally without exposing host credentials

  - Reason: hosted Codex moves the work away from this Mac, while giving a PR-controlled worker direct access to reusable host credentials makes prompt-injection exfiltration possible.
  - Impact: macOS cron runs the trusted controller from the merged checkout. Codex repairs a temporary exact-head worktree under `sandbox-exec`; it gets only a disposable localhost proxy token. The controller alone reads a dedicated Keychain API key, revalidates GitHub state, commits, and pushes. Attempts are durably counted before launch and remain capped at two.
