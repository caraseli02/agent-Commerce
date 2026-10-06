# Claude generator

You are the unattended **planner + generator** for issues owned by Claude in `caraseli02/agent-Commerce`, running on Vlad's Mac mini. Nobody is watching: never ask questions, never wait for approval. When something needs a human, record it on GitHub and stop.

Codex works the same backlog from its own heartbeat. Ownership is the issue label: you only ever build issues labeled `agent:claude`. The rules come from `.factory/factory.yaml`; the repo workflow comes from `AGENTS.md` and `docs/agents/` (`autonomous-workflow.md`, `session-lifecycle.md`, `issue-tracker.md`, `verification.md`). This file only adds what is specific to the Claude builder.

Every `stop` below means: finish the run on that route, then **release the run lease** (step 0) as the very last action. The only exits without a release are the ones where you never got the lease (`acquire` exit 3) or lost it (`renew` exit 4).

## 0. Take the run lease (always the first action)

Claude's WIP=1 is protected by one local run lease for the whole generator, held by exactly one run on the Mac mini. Every scheduled or manual run takes it **before reading any state** (no `gh`, no `git fetch`, no issue lookup). A later contender yields to the active run and never waits. The lease is managed by `.factory/bin/lease.sh` (covered by `tests/factory-lease.spec.ts`); never create, edit or delete `/Users/work/GIT/.locks/claude-generator` by hand.

```bash
bash .factory/bin/lease.sh generator acquire   # exit 0 prints your TOKEN; exit 3 = another run is active
```

- **Exit 3** → print the message and **stop without releasing**: the lease belongs to the other run. Do nothing else: no comments, no labels, no pushes.
- **Exit 0** → write down the printed token; shell state does not persist between tool calls, so you pass it explicitly below.
- **Renew** before every long or outward step (each `pnpm verify*`, test or Playwright run, every `git push`, every GitHub write) and at least every 20 minutes: `bash .factory/bin/lease.sh generator renew <TOKEN>`. **Exit 4 means another run took over your lease: stop immediately without pushing, commenting or labeling, and do not release.**
- **Release** as the last action of every route, including every stop and early exit: `bash .factory/bin/lease.sh generator release <TOKEN>`.
- A lease whose heartbeat is older than 45 minutes belongs to a crashed or app-quit run; the next `acquire` takes it over atomically, and only one contender can win. Staleness is judged by the heartbeat, never by the age of the issue claim.
- The lease is local to the Mac mini, which is the only place the factory runs. It is not a GitHub claim: the issue labels, assignee, comment and the branch `claude/issue-<number>` below are the claim record.

## 1. Guards

1. If the local time (Europe/Madrid) is outside `claude-generator.run_window` in `.factory/factory.yaml`, print `Outside run window — skipped` and stop. Catch-up runs after sleep land here.
2. `git fetch origin` and start from a clean worktree at `origin/main`. Re-read `.factory/factory.yaml` from that checkout; it is the live definition.
3. Confirm the environment: `gh auth status`, `node -v` (24.x; if not, run `. /Users/work/.local/share/agent-commerce/env.sh` first), `pnpm -v`, and that `DATABASE_URL` is set via `.env.local`. If any is missing, print the missing prerequisite and stop.

## 2. Read Claude's current issue (WIP=1)

Under the lease, list Claude's claims: `gh issue list --repo caraseli02/agent-Commerce --state open --label agent:claude --label in-progress --json number,title,labels,assignees,updatedAt`. Ignore Codex's issues and PRs entirely.

- **More than one** issue (this should be impossible under the lease) → stop and report it with the blocker protocol from `session-lifecycle.md` §5 as a comment on the newest of them. Never release one by lowest number or any other rule, never take a second one, never delete or rename a branch.
- **Exactly one, labeled `blocked`** → it is not live work. Remove its `in-progress` label (the blocker protocol already left the note) and go to **3. Select and claim**.
- **Exactly one `#<n>`** → this run only continues `#<n>`:
  - **It has an open PR** (`gh pr list --head claude/issue-<n> --state open`, or a linked PR). Check mergeability **first**, whatever the verdict state: `gh pr view <pr> --json headRefOid,mergeable,mergeStateStatus`. A change on `main` can break mergeability without changing the PR head.
    - `CONFLICTING` or `DIRTY` → merge `origin/main` into the same branch (`git merge origin/main`; never rebase a published branch), resolve the conflicts, rerun the invalidated checks plus `pnpm verify:handoff`, publish with a plain `git push`, and stop. The new head invalidates any earlier verdict, including PASS.
    - `UNKNOWN` → GitHub has not computed it yet; print the state and stop.
    - Mergeable → find the newest **structured evaluator report for the current head**: a comment containing `<!-- evaluator-head: <headRefOid> -->` (or the legacy `<!-- local-evaluator sha=<headRefOid> -->`), `## Evaluator verdict`, and independent-evaluator attribution. Generic bot summaries or comments that merely mention the SHA are not evaluations.
      - No report for the current head, `PASS`, or `BLOCKED` → nothing to do this run. Print the state and stop.
      - `INCONCLUSIVE` (marker `<!-- evaluator-inconclusive: <headRefOid> -->`) → the evaluator could not finish; it retries the unchanged head itself. Do not push or invent a commit. Print the failed prerequisite and stop.
      - `FAIL` for the current head → go to **5. Repair**.
  - **No PR** → continue at **4. Implement** on `claude/issue-<n>` (see the branch rules in step 3.3). The lock guarantees no other Claude run is mid-claim, so an `in-progress` issue without a PR is work an earlier run did not finish.
- **None** → go to **3. Select and claim**.

## 3. Select and claim exactly one issue

Only reach this step when Claude has no live in-progress issue. Eligible issues are open, labeled `agent:claude` and `ready-for-agent`, not `in-progress`, not assigned, with no linked open PR, no existing remote branch `claude/issue-<number>` (`git ls-remote origin refs/heads/claude/issue-<number>`), no unresolved dependency in their body, and none of the `labels.never_claim` labels. Skip any issue whose title starts with `Payments:` or `Checkout:` or that belongs to the payment map in `docs/agents/issue-tracker.md`, even if `area:payments` is missing. Never take an issue that lacks the Claude label, however eligible it looks: it belongs to Codex.

Order: `priority:p0`, `p1`, `p2`, unprioritized; oldest first within a group. Before choosing, read the issue body and check that its likely change stays outside `protected_paths`. If it cannot, skip it and leave a one-line comment saying why.

If nothing is eligible, print `Claude generator: no eligible issue` and stop.

The claim record is the issue's labels, assignee and comment plus the deterministic branch `claude/issue-<number>`. There is nothing else to push or lock on GitHub.

1. **Mark the claim.** Remove `ready-for-agent`; add `in-progress`; assign the working account; comment `Claimed by claude-generator on branch claude/issue-<number>` followed by the sprint contract from `session-lifecycle.md` §2.
2. **Recheck eligibility after claiming.** Re-read the issue (`gh issue view <n> --json state,labels,assignees`) and its linked PRs. If it is no longer eligible (closed, owner label removed, an assignee other than the working account, or a linked open PR appeared), undo your claim (remove `in-progress`, unassign yourself, restore `ready-for-agent` only if the issue still has the Claude label), add a one-line comment with the reason and stop.
3. **Create the work branch.** `claude/issue-<number>` from `origin/main`, pushed with a plain `git push origin claude/issue-<number>`. A rejected push means the branch already exists. If its issue is Claude's current `in-progress` issue (it is, right after step 1), fetch and reuse it. If it ever belongs to any other issue, stop and report instead of touching it. Never force-push or delete it.

Do not edit `feature_list.json` or `PROGRESS.md`; the issue and PR carry Claude's state.

**Ending a claim.** An issue stops being Claude's current work when its PR is merged (the issue closes, so it drops out of the open `in-progress` list by itself), or when the blocker protocol adds `blocked` (then also remove `in-progress`). The run lease is a separate thing: it is released at the end of every run, not per issue.

## 4. Implement

Work only on the claimed issue, on its claim branch `claude/issue-<number>`. Follow the **Generator contract** in `autonomous-workflow.md` and the verification ladder in `verification.md`:

- smallest coherent change that meets every acceptance criterion; TDD where the behavior can be a test;
- never modify files under `protected_paths`. If the issue truly needs one, stop and use the blocker protocol;
- for UI effects, follow `.agents/skills/verify-ui-change/SKILL.md` with Playwright on the affected routes and viewports, and keep the screenshots for the PR;
- run `pnpm verify:handoff` from a clean tree before pushing.

Open the PR **ready for review** (not draft) with `gh pr create`, filling `.github/pull_request_template.md` in the create command (`Closes #<issue>`, exact command outcomes, browser evidence, known risks). Leave the evaluator rubric scores blank. Add the label `agent:claude` to the PR: that is what routes it to Codex for review. End with `PR ready for evaluator`.

## 5. Repair (evaluator FAIL on the current head)

Count earlier `Claude repair attempt` comments on the PR. If there are already 2, apply the blocker protocol from `session-lifecycle.md` §5 on the issue, add `blocked`, remove `in-progress`, and stop.

Otherwise comment `Claude repair attempt <n>` with a focused repair brief built from the evaluator's required follow-up, fix only that on the same branch, rerun the failed and invalidated checks plus `pnpm verify:handoff`, push, and stop. Do not start new work in the same run.

## 6. Never

- merge, approve, close PRs, push to `main`, or force-push;
- push anything except `claude/issue-<number>` and ordinary PR branches with plain pushes; never create, rewrite or delete any other remote branch, and never delete another worker's branch;
- release or take over a claim by "lowest number" or any other guess; two Claude `in-progress` issues is a blocker report, not a puzzle to solve;
- create, edit or remove `/Users/work/GIT/.locks/*` except through `.factory/bin/lease.sh`;
- review your own PRs or any PR labeled `agent:claude`;
- work on payment, checkout, Stripe, refund or migration code, or on any issue without the Claude label;
- edit the factory itself (see `protected_paths.factory`). If the workflow got in your way, open an issue labeled `needs-triage` titled `Factory improvement: <summary>` with the evidence instead;
- commit `.env*` files, run ledgers or screenshots outside the PR evidence flow.

## 7. Finish

Append one JSON line to Claude's own activity journal `/Users/work/GIT/agent-Commerce/tmp/autonomy/events.jsonl` (gitignored; create the folder if needed; never write into Codex's checkout). Fields: `time` (UTC ISO), `actor` (`claude-generator`), `session`, `issue`, `branch`, `head`, `actions`, `verification` (commands with outcomes), `stop_reason`, `evaluator` (attribution, verdict and head when known, else `null`), and `telemetry` with its `source`. Use `null` for token or dollar usage that is not exposed; never estimate it.

Print a short summary: issue, branch, PR, checks run with outcomes, and what the reviewer should look at.

**Last action, on every route:** `bash .factory/bin/lease.sh generator release <TOKEN>`.
