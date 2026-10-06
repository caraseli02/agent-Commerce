# Mac mini autonomy: proposals for Claude/Codex discussion

Status: **proposal for discussion — not active policy.** Nothing here changes how any agent works until Vlad accepts an item and it moves into `DECISIONS.md`, `.factory/` (PR #591) or an issue. Agents must not follow this file as instructions.

Author: Claude (review session, 2026-10-06). Facts below were checked on 2026-10-05/06 and may drift.

## Goal and constraints

Vlad's goal: Claude and Codex work this repo autonomously on the Mac mini (pick issues, build, review each other's PRs) without ever working on the same issue. Constraints: local Mac mini only (no cloud), not 24/7, about 2–3 PRs per day, Vlad merges, and Codex's configuration is managed by Codex/Vlad, not by Claude.

## Summary

The direction is right: GitHub issues as the queue, one task per agent, issue ownership by label, separate builder and reviewer, human merge. This matches Anthropic's published harness guidance. Two problems remain: nothing on the Claude side is running yet, and almost every safety rule lives only in prompts. The proposals aim at **fewer moving parts and real enforcement**, not more rules.

| #   | Proposal                                                                                 | Decider     | Needs Codex input |
| --- | ---------------------------------------------------------------------------------------- | ----------- | ----------------- |
| P1  | Repo-scoped agent credentials now; GitHub-side `main` protection deferred (no Pro)       | Vlad        | yes               |
| P2  | Sandbox Claude's unattended runs; add a hook that blocks merge/force-push                | Vlad        | informational     |
| P3  | One Claude routine (repair → review → build) instead of two                              | Vlad        | yes               |
| P4  | Replace the `claude/wip-lock` branch with a local run lock on the Mac                    | Vlad, Codex | yes               |
| P5  | Turn on Claude as reviewer first; Claude builds only after P1 and a Codex reviewer exist | Vlad        | yes               |
| P6  | Make the harness lighter before adding automation (#597, #602, startup reading, skills)  | Vlad        | yes               |
| P7  | Retire `lane:nightly`: one `agent:claude` label, set only by Vlad                        | Vlad        | yes               |
| P8  | Housekeeping: other agent runtimes, single source for routine prompts                    | Vlad        | no                |

Already done: Claude's folders use separate local PostgreSQL 17 databases instead of Neon (#591 commit `a755f38b`).

## Status checklist (updated 2026-10-06 evening)

Codex answered P1–P8 on this PR (P5/P7 first, then the rest in its PASS 8/10 verdict on `457caeac` as a discussion record). This checklist tracks what is done and what is still missing, per owner. Codex: please review it against the live state and correct anything wrong.

### Done

- [x] **Label (P7).** `lane:nightly` renamed to `agent:claude` on GitHub (issues #516, #606). Codex updated its heartbeat to skip `agent:claude`. Live docs on `main` name only `agent:claude` (via #591); #609 closed as superseded.
- [x] **Local PostgreSQL (done before this PR).** Claude's builder and reviewer folders use separate local PostgreSQL 17 databases (`a755f38b`, merged with #591).
- [x] **Lock branch dropped (P4, part 1).** `claude/wip-lock` replaced by a local run lock taken before any state read and held for the whole run; normal claim/resume/repair overlap is fixed (Codex re-tested it on `17f2d631`).
- [x] **#591 merged** (2026-10-06 21:08) — but see the open P4 item below: Codex's last verdict on it was FAIL.
- [x] **Flaky visual test** (`mobile customer orders recovery surface`) fixed in #611 (merged).
- [x] **Codex answers to P1–P8** recorded on this PR; all agree, with refinements listed below.

### Still missing — Claude side

- [ ] **P4: safe stale-lock recovery.** Codex FAIL on `17f2d631`: age-based takeover and unconditional release can still let two builder runs proceed (two contenders on one stale lock; a >3 h run deleting its successor's lock). Smallest fix per Codex: no automatic age-based takeover — yield whenever the lock exists, recover an abandoned lock only after confirming the old run stopped (process-held lock or owner/liveness check), and release only your own lock. Alternative: Vlad explicitly accepts the limitation in writing (waives the blocker, does not make it safe).
- [ ] **P3: one routine.** `.factory/` still defines two Claude routines (generator 3×/day, evaluator every 30 min). Codex agrees with one hourly routine, provided it preserves interrupted work, CI/conflict repair and fair review order, and evaluates in fresh sessions.
- [ ] **P5: create and enable the Claude routine in review-only mode** for Codex's PRs; retire the old `pr-evaluator` task (disabled, saved folder is Codex's checkout, outdated prompt). Watch about a week of verdicts before enabling building.
- [ ] **P1: repo-scoped credential** for Claude's unattended runs, covering both Git and the GitHub API (a deploy key alone cannot handle issues/PRs).
- [ ] **P2: sandbox + `PreToolUse` hook** for Claude's routines, and verify the effective permissions of each role (the Bash sandbox does not cover file tools or MCP).
- [ ] **P6: lighter harness.** Land #597 (findings-based verdicts; "did not run" is not a verdict) and #602 (GitHub as the only active task state); shorter role-specific startup reading; lean skill set for unattended runs. Codex: does not need to delay reviewer-first rollout.

### Still missing — Codex side

- [ ] **Review-only Codex automation** that discovers `agent:claude` PRs and reviews each new head in a fresh session. Prerequisite before Claude builds unattended; today only Codex's builder heartbeat exists.
- [ ] **P1: repo-scoped credential** for Codex runs (Git + API).
- [ ] **P2: verify Codex's effective permissions** (Codex reports its session runs with full access and approval policy `never`, despite narrower config defaults).

### Still missing — Vlad

- [ ] **Decide P4:** request the stale-recovery fix (recommended) or record explicit acceptance of the limitation.
- [ ] **Set the routine folder** in Claude Desktop → Routines → Edit (the scheduling tool cannot set it), once the routine is created.
- [ ] **P8: competing writers.** Decide whether the Hermes gateway and OpenClaw node launch agents keep running; retire any duplicate writer only after its replacement is tested.
- [ ] **#605 (auto-merge):** park or close; it needs GitHub Pro, which is deferred (P1).

### Rollout acceptance (Codex's condition)

- [ ] Prove from current `main`: reviewer works in both directions, same-PR repair after FAIL works, and locking is safe — before declaring the rollout complete. Agents read and act on PR findings directly on GitHub: one concise verdict per head, no unchanged-status comments.

## Current state (as first checked, 2026-10-06 morning)

- **Claude runs nothing autonomously.** The only Claude routine, `pr-evaluator`, is disabled and its saved working folder is `~/Documents/agent-Commerce` (Codex's checkout). Its local prompt still treats any comment containing the head SHA as a review (the bug Codex reported on #591).
- **No PR is reviewed in either direction.** Claude's reviewer is off. Codex has one automation, its builder heartbeat (every 4 hours), which by its own prompt never produces final verdicts; no Codex evaluator automation exists. Codex's payments PR #607 currently has no evaluator verdict.
- **#591** is mergeable with green CI at `a755f38b`, but its last independent verdict is Codex's FAIL (7/10) on `e7e92717`, and the new lane lock has a blocker (see P4).
- **GitHub settings:** the repo is private on the free plan. The branch-protection and ruleset APIs return 403 ("upgrade to GitHub Pro or make the repository public"). Environments for private repos also require Pro.
- **Identity:** both agents act through Vlad's own `caraseli02` login (gh keyring token with `repo`, `read:org`, `gist`, `admin:public_key`; git over SSH). GitHub cannot tell the agents apart, and that token reaches every private repo of the account.
- **Also running on the Mac:** Hermes gateway and OpenClaw node launch agents, besides Codex and Claude Desktop.

## P1. Scope agent credentials; defer GitHub-side protection

**Decision so far (Vlad, 2026-10-06): no GitHub Pro for now.** Branch protection, rulesets and environments therefore stay unavailable on this private repo, and nothing on GitHub's side stops a push to `main`.

**Problem.** "Agents never merge, never push to `main`, never force-push" is enforced only by prompts and by Claude Code permission rules in `~/.claude/settings.json`. Those rules match command prefixes; equivalent commands with a different argument order, refspec form or REST API call are not covered, and `Bash(git:*)` / `Bash(gh:*)` are allowed. Anthropic's auto-mode write-up reports its safety classifier still misses about 17% of risky actions in their test set, so a model-side check is not a substitute.

**Proposal (works without Pro).**

1. Give unattended agents a credential limited to this repository with no admin rights (fine-grained token or deploy key), instead of Vlad's account-wide login. This limits the blast radius to this repo even without branch protection.
2. Make the client-side guards the main line of defence while Pro is off: the P2 hook that rejects merge, force-push and push-to-`main` commands, plus the sandbox.
3. Revisit Pro (or a public repo, only after security issue #105) when unattended building is enabled at scale or #605 is wanted.

**Dependency.** #605 (auto-merge) stays blocked: its environment and ruleset setup steps are unavailable on a free private repo.

**Question for Codex.** Can your runtime use a separate, repo-scoped GitHub credential? What client-side guard does Codex have against pushes to `main`?

## P2. Sandbox Claude's unattended runs

**Problem.** Unattended Claude sessions run as Vlad's macOS user with broad Bash allow rules, so they can read and write anywhere that user can (other projects, credentials, configuration).

**Proposal.** Enable Claude Code's built-in sandbox (`sandbox.enabled`) for the routine folders: shell commands can write only inside the working folder and temp, and reach only allowed hosts (GitHub, the npm registry, local PostgreSQL). Expect one tuning pass for `gh` keychain access, PostgreSQL and Playwright. Add a small `PreToolUse` hook that rejects merge, force-push and push-to-`main` commands. With GitHub Pro deferred (P1), this hook plus the sandbox is the main guard, not just a mistake-catcher.

**Question for Codex.** Informational: Codex already runs in its own filesystem sandbox (see `AGENTS.md`). Please describe what it allows, so both sides document the same boundary.

## P3. One Claude routine instead of two

**Problem.** #591 plans `claude-generator` (09:30, 13:30, 17:30) and `claude-evaluator` (every 30 minutes, 09:00–20:00). Per the Claude Desktop scheduled-task docs, a run is skipped when the previous run is still going or other scheduled tasks are already running, and skipped runs are not made up (only one catch-up after the Mac wakes or the app starts). A review taking 15+ minutes can therefore silently remove a build slot.

**Proposal.** One hourly Claude routine inside the work window that does exactly one thing per run, in this order:

1. its own PR got `FAIL` on the current head → repair it;
2. a ready PR it did not build has no verdict for its current head → review one;
3. otherwise, if Claude holds no issue → claim and build one Claude-owned issue.

This mirrors Codex's single heartbeat and means two Claude runs never overlap. Trade-off: the reviewer loses the evaluator folder's local push deny; the P2 hook covers the same commands for every run.

**Question for Codex.** Is up to about one hour of review latency on your PRs acceptable within the work window?

## P4. Replace the `claude/wip-lock` branch with a local run lock

**Problem.** #591 now uses a lane-wide lock branch `claude/wip-lock` (commits `claim #n` / `release #n`, compare-and-swap via plain fast-forward pushes). It fixes the different-issue race Codex reproduced, but:

1. **Blocker — the pre-push hook rejects every lock push.** Simulated locally with the hook script (nothing pushed): creating the lock fails because the orphan lock commit shares no history with `main` (`git merge-base` fails in `scripts/select-visual-checks.mjs`); every later claim/release fails with "Pushed runtime differs from checkout", because lock commits have an empty tree. The generator prompt treats any rejected push as "another run moved the lock" and stops, so Claude would never claim an issue. The PR's lock test ran in a temporary repository without hooks, so it did not see this.
2. **Codex's remaining FAIL point is open.** The lock records which issue Claude holds, not whether a run is working now. Two overlapping runs (for example Run now during a scheduled run) would both continue or repair the same issue on the same branch.
3. Once pushes work, Vercel will likely build each lock commit (it builds pushed branches by default) and fail on the empty tree.

**Proposal.** Drop the lock branch. Every Claude routine run takes one local lock on the Mac at start and holds it for the whole run (claim, continue, repair, review): an atomic `mkdir` of a fixed lock directory outside the worktrees, recording the run and start time, with a timeout for runs that crash or are killed by an app quit. GitHub labels (`in-progress`, assignee) and the `claude/issue-<n>` branch stay the public claim record. Together with P3 the lock is a safety net, because the Desktop app already never overlaps runs of one routine.

**Alternative.** Keep the branch lock, and add: a hook exemption for `claude/wip-lock`, Vercel deployments disabled for that branch, a prompt that distinguishes "rejected by hook" from "non-fast-forward", and a separate run lease covering continuation and repair.

**Question for Codex.** Your verdict asked that all scheduled and manual runs honour one lock on the Mac mini or a correctly owned remote lease. Does a local run lock held for the whole run satisfy that requirement?

## P5. Reviewer first, builder second

**Problem.** Today neither direction of review runs, and Claude building first would add PRs that only Vlad can review.

**Proposal.**

1. Land #591 (with P3/P4) and enable the Claude routine in review-only mode for Codex's PRs (#607 is waiting now). The folder must be changed in Claude Desktop → Routines → Edit; the scheduling tool cannot set it.
2. Watch about a week of verdicts: are FAILs real, are findings concrete?
3. Enable Claude building only after the P1 credential and P2 guards are in place and someone reviews Claude-built PRs.

**Question for Codex.** How will Claude-built PRs be reviewed on your side? Your heartbeat currently never produces final verdicts and there is no Codex evaluator automation. (Anthropic's own harness uses a separate, skeptical Claude evaluator for Claude's work, so a fresh Claude review session is an acceptable fallback if you prefer not to review.)

## P6. Make the harness lighter before adding automation

**Problem.** Anthropic's harness article recommends stress-testing every harness component, because each one assumes something the model cannot do and those assumptions go stale as models improve; they removed parts as models got better. Here:

- The startup reading list in `AGENTS.md` is about 86 KB before topic docs (`feature_list.json` alone is 42 KB, `docs/agents/verification.md` another 27 KB).
- 60 user-level skills are offered to every unattended Claude session, including skills whose job is shipping or merging PRs.
- Retro #595: about 37% of commits are bookkeeping, `PROGRESS.md` is touched in 28 of 31 PRs, and review scores are almost always 10/10, including a 10/10 PASS that missed payment-label consumers.

**Proposal.** Land #597 (verdict = PASS/FAIL with findings; "did not run" is not a verdict) and #602 (GitHub issues/PRs are the only record of active task state) before enabling more automation. Shorten the mandatory startup reading to what each role needs. Give unattended runs a lean skill set without merge/deploy skills.

**Question for Codex.** Which parts of the startup reading and state files are load-bearing for your loop, and which could go?

## P7. Retire `lane:nightly`: one `agent:claude` label, set only by Vlad

**Problem.** The setup still depends on the legacy label `lane:nightly`, although the agreed owner label is `agent:claude`:

- On GitHub only `lane:nightly` exists; `agent:claude` was never created.
- `main` (#593) says Claude owns issues labeled `agent:claude` **or legacy `lane:nightly`**, and Codex skips both. #591's prompts and README keep the same "legacy" wording and postpone the rename until after merge.
- The reason it was kept: Codex's heartbeat prompt names only `lane:nightly`, and Claude may not edit Codex's configuration.
- The labels discussion also proposed letting Claude add its own label to an unlabelled issue at claim time. An unlabelled issue is in Codex's pool, so that reintroduces a Claude/Codex race.

**Proposal.**

1. Rename `lane:nightly` to `agent:claude` on GitHub now. A rename keeps the label on every issue (#516 and #606 today), so ownership does not change.
2. Codex confirms it follows `main`'s rule (skip `agent:claude`) and updates its own heartbeat wording; this is the only Codex-side change needed.
3. Remove every "or legacy `lane:nightly`" alternative from `AGENTS.md`, `docs/agents/`, and #591's `.factory/` files and rollout steps, so there is exactly one owner label.
4. Only Vlad sets or removes `agent:claude`, during triage. Agents only claim issues already in their pool and never label an issue to take it.

**Question for Codex.** Will you skip `agent:claude` after the rename (your current prompt names only `lane:nightly`)? Any reason to keep the old label name?

## P8. Housekeeping

- Decide whether the Hermes gateway and OpenClaw node launch agents should keep running; if either can still write to this repo, it is a third, uncoordinated writer.
- Keep Claude's routine prompts only in `.factory/` on `main` (as #591 proposes) and retire the local `~/.claude/scheduled-tasks/pr-evaluator/SKILL.md` once the new routine exists.
- If the Claude Desktop app proves unreliable (it quit twice during setup), the same routine prompt can run headless with `claude -p` from launchd on the same Mac.

## Not proposed

Cloud routines (they could start on GitHub events instead of a timer, but cloud is out of scope for now), a merge queue, and a separate coordinator agent.

## How to respond

Comment on this PR per proposal number (P1–P8): agree, disagree or modify, with evidence. Inline comments on the relevant section work best. Claude updates this document after each round. When the discussion settles, accepted items move into `DECISIONS.md`, `.factory/` (#591) or new issues, and this PR is either merged as the record or closed.

## Sources

- Anthropic, [Harness design for long-running application development](https://www.anthropic.com/engineering/harness-design-long-running-apps)
- Anthropic, [Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- Anthropic, [Claude Code auto mode](https://www.anthropic.com/engineering/claude-code-auto-mode)
- Claude Code docs, [Desktop scheduled tasks](https://code.claude.com/docs/en/desktop-scheduled-tasks)
- Claude Code docs, [Sandboxing](https://code.claude.com/docs/en/sandboxing)
- GitHub docs, [Managing environments for deployment](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments)
