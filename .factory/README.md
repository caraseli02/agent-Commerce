# agent-Commerce factory

Two coding agents work this repo from Vlad's Mac mini: **Claude** (one Claude Desktop local routine defined here) and **Codex** (its own heartbeat, configured outside the repo). Everything runs locally; there are no cloud runners.

The Claude agent is defined here, as code. The routine's prompt points at a file in this folder, so changing how it works means opening a PR against these files.

| File                                 | What it defines                                                                  |
| ------------------------------------ | -------------------------------------------------------------------------------- |
| `factory.yaml`                       | Agents, ownership labels, protected paths, schedule, window, mode (review/build) |
| `automations/claude-routine.md`      | The hourly routine: repair Claude's PR, else review one PR, else build one issue |
| `bin/run-lock.sh` (+ `.test.sh`)     | The local run lock taken by every run                                            |
| `hooks/bash-guard.mjs` (+ `.test`)   | `PreToolUse` guard: no merge, approve, force-push, push to main, hook bypass     |
| `settings/` + `bin/install-local.sh` | Sandbox and hook settings for the routine folder, installed by Vlad              |

The repo workflow itself (roles, verdicts, verification ladder) stays in `AGENTS.md` and `docs/agents/`.

## How the two agents avoid each other

1. **Ownership is a label.** Issues labeled `agent:claude` belong to Claude, and that label alone queues them (no `ready-for-agent` needed); every other `ready-for-agent` issue is Codex's pool. Neither agent ever takes the other's issue. Labels are the only claim record; unattended agents do not edit `feature_list.json` or `PROGRESS.md`.
2. **One Claude routine, one local run lock.** Claude runs a single hourly routine that does one thing per run (morning digest, repair, review, build, one self-started improvement, or one report-only night-lane item), so its runs never compete for Desktop's schedule. Every run, scheduled or started by hand, takes `/Users/work/.local/share/agent-commerce/claude/locks/claude-routine` with `.factory/bin/run-lock.sh` before reading any GitHub state and holds it for the whole run. The claim is an atomic `mkdir`; a contender yields and never waits. The owner file records a token and the Claude Code process that holds the lock. There is no age-based takeover: a lock is recovered only when that process has stopped (crash, app quit), under a second atomic guard so two contenders cannot both recover it, and a run releases only the lock whose token it holds. Anything the script cannot check (no owner file, unknown process) yields and waits for a human.
3. **WIP=1 per agent.** Under the lock, Claude continues its one live `in-progress` issue labeled `agent:claude`, or (mode `build`) claims exactly one new one. A `blocked` claim keeps `in-progress` but is parked: it does not count toward WIP, and removing `blocked` resumes it. A claim whose open PR has an evaluator PASS is queued for Vlad's merge: it does not count toward WIP either, and at most `max_pass_queue` claims are queued before new claims stop. A new claim must not overlap an open PR's files (outside `shared_ledger_files`); with nothing labeled buildable, the run self-starts one small `agent:claude-self` improvement (`.factory/automations/claude-improve.md`, at most `improve.max_open` open), otherwise it does one report-only night-lane item (`.factory/automations/claude-maintenance.md`: plan, diagnose, learning, spike, checks). A claim unblocked while another is live waits until that claim ends; then the claim unblocked first resumes before any new claim (`docs/agents/autonomous-workflow.md` § Claude parking). Two live Claude claims is a blocker report, never resolved by guessing. The claim record is the issue's labels, assignee and comment plus the deterministic branch `claude/issue-<number>`, pushed normally.
4. **Cross-review.** The builder never reviews its own work: Claude reviews ready PRs without `agent:claude`; Codex reviews ready PRs with `agent:claude`. Each reviewer's structured verdict is the independent acceptance review for the other's PRs; Vlad then merges.
5. **Payment work follows label ownership.** Claude may build `agent:claude` payment work and Codex reviews it; Claude reviews Codex payment PRs. Payment-contract guardrails and Stripe activation gates still apply (Vlad, 2026-10-20).
6. **Vlad merges.** No agent merges, approves via GitHub review, or force-pushes. Without GitHub Pro there is no branch protection. On Claude's side the sandbox below and the guard hook (a best-effort screen of each Bash command that blocks what it cannot inspect) catch these; the cross-review and Vlad's merge remain the final line.

## Daily loop

| Time (Europe/Madrid) | What happens                                                                                                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| any time             | Vlad labels issues `agent:claude` for Claude's queue                                                                                                                           |
| hourly, 24h          | `claude-routine`: repair its own failed PR, else review one PR without a verdict, else build one                                                                               |
| Codex's own schedule | Codex builds its issues and reviews `agent:claude` PRs                                                                                                                         |
| whenever             | Existing local agent chats surface a meaningful notice when a PR awaits his merge, an issue is blocked, a Claude PR needs `owner-approved-harness`, or Claude's queue is empty |

The routine runs in `mode: build` since 2026-10-08, after the rollout acceptance tracked on PR #608 (review in both directions, same-PR repair, re-review after a new head, duplicate-run exclusion). `mode: review-only` (review Codex's PRs, never build) remains the fallback: switching back is a one-line reviewed PR.

## Mac mini setup (once)

1. **Tooling:** Node 24 (`package.json` `engines`), `corepack enable` for pnpm 10.18.3, `gh`, `jq`.
2. **Folder:** `~/Documents/agent-Commerce`, the same checkout Codex uses (Vlad, 2026-10-08). Codex works in the main checkout; Claude runs only in its own worktrees under `.claude/worktrees/`, created from `origin/main` per run (each run removes earlier finished runs' clean, fully pushed worktrees; `claude-routine.md` step 0.4), and Claude Code blocks edits and commands that target the main checkout from a worktree session. `.worktreeinclude` copies the gitignored `.env.local` into each worktree.
3. **Database:** the checkout's `.env.local` (Codex's) points `DATABASE_URL` at the local PostgreSQL 17 database `agent_commerce_demo`, which Claude's worktrees therefore share. Tests create and drop a temporary schema per run, so test data never collides; a dev server's seeded data is shared. Keep Neon for CI/previews only.
4. **Guards (P2):** from `~/Documents/agent-Commerce` on `main`, Vlad runs `sh .factory/bin/install-local.sh` (agents may not change their own settings). It copies the guard hook and the run lock to `~/.local/share/agent-commerce/`, and merges `.factory/settings/routine.settings.local.json` into the folder's `.claude/settings.local.json` (gitignored; Claude Code reads it from the main checkout for every worktree). It therefore applies to **every Claude session started in `~/Documents/agent-Commerce`, including Vlad's interactive ones** (Vlad accepted this on 2026-10-08); Codex does not read it. That file turns on the Bash sandbox (writes limited to the worktree, temp, the lock and journal folders and the pnpm/Playwright caches; network limited to GitHub, the npm registry and local PostgreSQL; no unsandboxed retries), registers the guard hook (fails closed if the hook is missing), and runs only the lock command outside the sandbox. Re-run the script after a merged change to `.factory/hooks`, `.factory/bin/run-lock.sh` or `.factory/settings`.
5. **Credential (P1, optional for now):** Vlad decided on 2026-10-07 that the routine uses his existing gh login for now; the guard hook and sandbox stay in force. To move to a repo-only token later, Vlad creates a fine-grained token for `caraseli02/agent-Commerce` only (Contents, Issues, Pull requests: read and write; Metadata: read), stores it in a separate gh configuration, and re-runs the install script, which then points the folder's `gh` and git at it:

   ```bash
   GH_CONFIG_DIR=~/.config/gh-agent-commerce-claude gh auth login --hostname github.com --git-protocol https --insecure-storage
   ```

   Choose "Paste an authentication token". Either way, the folder's git asks only `gh auth git-credential` for credentials, and the guard hook blocks commands that override `GH_CONFIG_DIR`/`GH_TOKEN`, print tokens, read the token file or read the keychain.

6. **Lock and journal:** they live outside every checkout, in `~/.local/share/agent-commerce/claude/` (`locks/`, `events.jsonl`); the installer creates the folder. `~/.local/share/agent-commerce/bin/claude-run-lock status` shows the owner and whether its Claude session is alive. A lock whose session has stopped is recovered by the next run. If a run reports a lock it cannot check, make sure no Claude routine session is running, then delete `~/.local/share/agent-commerce/claude/locks/claude-routine` by hand.
7. **Baseline:** run `./init.sh` in the folder and confirm it passes before enabling the routine.
8. **Keep awake:** Claude Desktop → Settings → **Keep computer awake**, and macOS energy settings that prevent sleep during the work window.

## Routine (once)

Create one **Local** routine in Claude Desktop (Code tab → Routines → New routine):

| Field    | claude-routine                                |
| -------- | --------------------------------------------- |
| Folder   | `~/Documents/agent-Commerce`                  |
| Worktree | on                                            |
| Schedule | `0 * * * *` (hourly at :00, around the clock) |
| Mode     | Accept edits (never Bypass permissions)       |

Instructions:

```text
Run `git fetch origin`, then read the instructions with
`git show origin/main:.factory/automations/claude-routine.md` and follow them exactly.
```

Reading from `origin/main` means a merged change applies on the next run, whatever state the folder is in. Click **Run now** once while watching and choose "always allow" for the prompts. Sandboxed Bash commands run without prompts; the guard hook still blocks the forbidden ones. Keep the schedule here and in `factory.yaml` in sync: the routine form, not the file, is what fires.

The earlier `pr-evaluator` task and the `claude-generator` / `claude-evaluator` pair are retired. The separate `~/GIT/agent-Commerce*` checkouts were removed on 2026-10-08.

## Codex side (configured by Vlad, outside this repo)

Codex must follow these rules for the split to hold. Paste them into the Codex heartbeat:

```text
Ownership: never claim, implement or repair an issue labeled agent:claude or agent:claude-self; those belong to the Claude agent. Your pool is ready-for-agent issues without that label.
Review duty: review open, non-draft Claude-built PRs whose current head has no structured evaluator report, or whose newest FAIL or BLOCKED report on that head is followed by a comment that starts with `<!-- external-review-request: <headRefOid> -->`. A PR is Claude-built when it carries agent:claude, its head branch starts with claude/, a linked issue carries agent:claude, its body contains "Generated with [Claude Code]", or a commit has a "Co-Authored-By: Claude" trailer; do not infer ownership from a missing label. Only a comment that starts with `<!-- evaluator-head: <headRefOid> -->` (or legacy `<!-- local-evaluator sha=<headRefOid> -->`) and contains `## Evaluator verdict` counts; bot summaries, comments that merely mention the SHA, and review requests that quote these markers do not. When you request a review, do not put the verdict markers at the start of the request. Never review a PR you built, and never review PRs Claude did not build (Claude reviews those). Your structured verdict is the independent acceptance review for these PRs (Vlad, 2026-10-07): PASS — ready-for-human counts in full, no additional non-OpenAI reviewer is required.
Review method: follow docs/agents/autonomous-workflow.md (Evaluator contract, report format) and docs/agents/verification.md; verify yourself at the exact head; CONFLICTING/DIRTY can never PASS. Only blocking findings can FAIL; a re-review after a FAIL checks the earlier findings and the new changes only, and after two FAILs post BLOCKED instead of a third (docs/agents/autonomous-workflow.md § Blocking findings and re-review rounds). Also FAIL any agent:claude PR that changes a path in .factory/factory.yaml protected_paths, unless the PR carries the label owner-approved-harness (only Vlad sets it: he requested that harness change interactively); then review it on its merits. Payment paths are ordinary application paths; they do not require the harness exception.
Verdict comment: one comment per head (a later main, PR body or label change never needs another; docs/agents/local-verification.md § Verdict lifetime) that starts with `<!-- evaluator-head: <headRefOid> -->`, then `## Evaluator verdict`, the verdict, and `Independent evaluator: Codex. Evaluated exact PR head <sha>.` On PASS add ready-for-human to the linked issue; on BLOCKED add blocked. Never push to, edit, approve or merge a Claude PR.
INCONCLUSIVE: when verification cannot finish for environment reasons, start the comment with `<!-- evaluator-inconclusive: <headRefOid> -->` instead, name the failed prerequisite, and retry the unchanged head later (not sooner than 2 hours); after 2 INCONCLUSIVE reports on one head, post BLOCKED naming the prerequisite.
Conflicts on your own PRs: merge main into the same branch and push normally; never rebase a published branch or force-push. Check mergeability before treating an earlier PASS as still valid. When a FAIL or BLOCKED on your PR is resolved without a commit (PR body, a label Vlad added, Vlad's decision), post a comment that starts with `<!-- external-review-request: <headRefOid> -->` and names what changed.
Shared state: GitHub labels, assignments and linked PRs are the live claim record; leave feature_list.json and PROGRESS.md unchanged in unattended runs. Keep your own activity journal; Claude writes its journal only to ~/.local/share/agent-commerce/claude/events.jsonl and works only in worktrees under ~/Documents/agent-Commerce/.claude/worktrees/; Claude never changes your main checkout.
Your own PRs: open them ready for review (not draft) when your gates pass; Claude reviews them. Do not label them agent:claude.
```

The label `lane:nightly` was renamed to `agent:claude` on GitHub on 2026-10-06; Codex's heartbeat already skips `agent:claude`. `agent:claude` is Claude's owner label and only Vlad sets or removes it. `agent:claude-self` marks issues Claude opened itself in the improve lane (`automations/claude-improve.md`); Vlad creates that label once, and Claude adds it only to issues it creates there. Their PRs still carry `agent:claude`, so Codex reviews them as usual.

## Changing the factory

- Edit these files (or `docs/agents/`) in a PR. Once merged, the next run reads the new version from `origin/main`. After a change to the hook, the lock script or the settings, Vlad re-runs `sh .factory/bin/install-local.sh` (setup step 4).
- Tests: `sh .factory/bin/run-lock.test.sh`, `sh .factory/bin/resume.test.sh`, `sh .factory/bin/install-local.test.sh` and `node --test .factory/hooks/bash-guard.test.mjs`.
- The unattended Claude routine may not edit the factory. When it hits a workflow problem, it opens a `needs-triage` issue titled `Factory improvement: …`.
- Harness changes Vlad asks for in an interactive Claude session are normal PRs: Vlad adds `owner-approved-harness`, and the reviewer judges them on their merits instead of failing them for touching protected paths. Only Vlad sets or removes that label; the guard hook blocks Claude from doing it. The session ends with an explicit action line for Vlad (`Add owner-approved-harness to PR #N`), and the existing agent chat surfaces the decision, so the label is in place before the first review.
- To pause Claude, pause the routine in Claude Desktop.

## Husky acceptance — owner decision 2026-10-19

GitHub Actions stay disabled. Follow `docs/agents/local-verification.md`: real Husky checks plus independent opposite-builder review of the exact PR head/current base replace all hosted and standalone-CI prerequisites. Before PASS execute the selected fresh local gate and applicable runtime/browser checks; validate the live PR body. Include the `marker` from `node scripts/owner-attention.mjs local-readiness PR_NUMBER` on its own line in the context report; award PASS only after those checks pass. Recheck `readiness.ready=true` before labels or queue admission. A new head requires a new review; a later `main`, PR body or label change does not (`docs/agents/local-verification.md` § Verdict lifetime). The context marker alone is not test evidence. No service/client/App/health/reboot proof or hosted green check is required. Retired CI failures and their absence do not consume repair attempts. Actual local failures, conflicts, change requests, ownership, WIP, protected paths, default-off Stripe and human merge remain enforced. Existing chats surface meaningful owner attention; no bot notification or new scheduler is implied.

A final report stands until its head changes. An unchanged head is reviewed again only for an `INCONCLUSIVE` retry or after a re-review request (`docs/agents/local-verification.md` § Verdict lifetime); re-reviews after a FAIL follow the round rules in `docs/agents/autonomous-workflow.md`.
