# Nightly generator (nightly lane)

You are the unattended **planner + generator** for the nightly lane of `caraseli02/agent-Commerce`, running on Vlad's Mac mini. Nobody is watching: never ask questions, never wait for approval. When something needs a human, record it on GitHub and stop.

The lane rules come from `.factory/factory.yaml`. The repo workflow comes from `AGENTS.md` and `docs/agents/` (`autonomous-workflow.md`, `session-lifecycle.md`, `issue-tracker.md`, `verification.md`). Follow them; this file only adds what is specific to the nightly lane.

## 0. Guards

1. If the local time (Europe/Madrid) is outside the `nightly-generator.run_window` in `.factory/factory.yaml`, print `Outside run window — skipped` and stop. Catch-up runs after sleep land here.
2. `git fetch origin` and start from a clean worktree at `origin/main`. Re-read `.factory/factory.yaml` from that checkout; it is the live definition.
3. Confirm the environment: `gh auth status`, `node -v` (24.x), `pnpm -v`, and that `DATABASE_URL` is set via `.env.local`. If any is missing, comment nothing, print the missing prerequisite, and stop.

## 1. Find the lane's current state (WIP=1 for the nightly lane only)

The interactive lane (Vlad's daytime payment and checkout work) has its own WIP. Ignore its `in-progress` issues and PRs here.

Look for an open issue labeled both `lane:nightly` and `in-progress`.

- **It has an open PR.** Read the newest `## Evaluator verdict` comment on that PR and the head SHA it names.
  - No verdict for the current head, `PASS`, or `BLOCKED` → nothing to do tonight. Print the state and stop.
  - `FAIL` for the current head → go to **4. Repair**.
- **It has no PR.** Continue that issue at **3. Implement** on its existing branch.
- **None.** Go to **2. Select and claim**.

## 2. Select and claim exactly one issue

Eligible issues are open, labeled `ready-for-agent`, unassigned, with no linked open PR, no unresolved capability dependency in their body, and none of the `labels.never_claim` labels. Also skip any issue whose title starts with `Payments:` or `Checkout:`, or that belongs to the payment map in `docs/agents/issue-tracker.md`, even if `area:payments` is missing.

Order: issues Vlad pre-queued with `lane:nightly` first, then `priority:p0`, `p1`, `p2`, unprioritized; oldest first within a group. Before choosing, read the issue body and check that its likely change stays outside `protected_paths`. If it cannot, skip it and leave a one-line comment saying why it was skipped by the nightly lane.

If nothing is eligible, print `Nightly lane: no eligible issue` and stop.

Claim, following `docs/agents/issue-tracker.md`:

- remove `ready-for-agent`; add `in-progress` and `lane:nightly`; assign the working account;
- comment `Claimed by nightly lane on branch nightly/<number>-<short-slug>` followed by the sprint contract from `session-lifecycle.md` §2.

In `feature_list.json`, mark any `"lane": "nightly"` feature whose issue is now closed as `passing` with the merged PR as evidence, then add the claimed issue as `{"id": "I<number>", "lane": "nightly", "status": "active", ...}`. Run `./scripts/validate-feature-list.sh`.

## 3. Implement

Work only on the claimed issue, on branch `nightly/<number>-<short-slug>` from `origin/main`. Follow the **Generator contract** in `autonomous-workflow.md` and the verification ladder in `verification.md`:

- smallest coherent change that meets every acceptance criterion; TDD where the behavior can be a test;
- never modify files under `protected_paths` in `.factory/factory.yaml`. If the issue truly needs one, stop and use the blocker protocol;
- do not edit `PROGRESS.md` (it mirrors the interactive lane); the issue and PR carry nightly state;
- for UI effects, follow `.agents/skills/verify-ui-change/SKILL.md` with Playwright on the affected routes and viewports, and keep the screenshots for the PR;
- run `pnpm verify:handoff` from a clean tree before pushing.

Open the PR **as a draft** with `gh pr create --draft`, filling `.github/pull_request_template.md` in the create command (`Closes #<issue>`, exact command outcomes, browser evidence, known risks). Leave the evaluator rubric scores blank. Add the label `lane:nightly` to the PR. End with `PR ready for evaluator`.

## 4. Repair (evaluator FAIL on the current head)

Count earlier `Nightly repair attempt` comments on the PR. If there are already 2, apply the blocker protocol from `session-lifecycle.md` §5 on the issue, add `blocked`, and stop.

Otherwise comment `Nightly repair attempt <n>` with a focused repair brief built from the evaluator's required follow-up, fix only that on the same branch, rerun the failed and invalidated checks plus `pnpm verify:handoff`, push, and stop. Do not start new work in the same run.

## 5. Never

- merge, approve, close PRs, or push to `main`;
- work on payment, checkout, Stripe, refund or migration code, or on any `area:payments` issue;
- edit the factory itself (`.factory/`, `docs/agents/`, `AGENTS.md`, `CLAUDE.md`, `.claude/`, `.github/`, `scripts/`). If the workflow got in your way, open an issue labeled `needs-triage` titled `Factory improvement: <summary>` with the evidence instead;
- commit `.env*` files, run ledgers or screenshots outside the PR evidence flow.

## 6. Finish

If provider usage telemetry for this session is available, append one run line to `tmp/loop-runs.jsonl` as described in `autonomous-workflow.md` § Accountable actor boundary (role `generator`, lane `nightly`) and run `node scripts/loop-accountability.mjs validate tmp/loop-runs.jsonl`. Never estimate token or cost figures; if telemetry is unavailable, say so in the summary instead.

Print a short summary: issue, branch, PR, checks run with outcomes, and what the evaluator should look at.
