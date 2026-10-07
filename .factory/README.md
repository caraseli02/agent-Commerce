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

1. **Ownership is a label.** Issues labeled `agent:claude` belong to Claude; every other `ready-for-agent` issue is Codex's pool. Neither agent ever takes the other's issue. Labels are the only claim record; unattended agents do not edit `feature_list.json` or `PROGRESS.md`.
2. **One Claude routine, one local run lock.** Claude runs a single hourly routine that does one thing per run (repair, review or build), so its runs never compete for Desktop's schedule. Every run, scheduled or started by hand, takes `/Users/work/GIT/.locks/claude-routine` with `.factory/bin/run-lock.sh` before reading any GitHub state and holds it for the whole run. The claim is an atomic `mkdir`; a contender yields and never waits. The owner file records a token and the Claude Code process that holds the lock. There is no age-based takeover: a lock is recovered only when that process has stopped (crash, app quit), under a second atomic guard so two contenders cannot both recover it, and a run releases only the lock whose token it holds. Anything the script cannot check (no owner file, unknown process) yields and waits for a human.
3. **WIP=1 per agent.** Under the lock, Claude continues its one open `in-progress` issue labeled `agent:claude`, or (mode `build`) claims exactly one new one. The claim record is the issue's labels, assignee and comment plus the deterministic branch `claude/issue-<number>`, pushed normally. Two Claude `in-progress` issues is a blocker report, never resolved by guessing.
4. **Cross-review.** The builder never reviews its own work: Claude reviews ready PRs without `agent:claude`; Codex reviews ready PRs with `agent:claude`.
5. **Payments stay with Codex.** Claude never builds `area:payments` work or touches protected payment paths, but reviews Codex's payment PRs.
6. **Vlad merges.** No agent merges, approves via GitHub review, or force-pushes. Without GitHub Pro there is no branch protection, so the guard hook and the sandbox below enforce this on Claude's side.

## Daily loop

| Time (Europe/Madrid) | What happens                                                                                     |
| -------------------- | ------------------------------------------------------------------------------------------------ |
| any time             | Vlad labels issues `ready-for-agent` and `agent:claude` for Claude's queue                       |
| hourly, 09:00–19:00  | `claude-routine`: repair its own failed PR, else review one PR without a verdict, else build one |
| Codex's own schedule | Codex builds its issues and reviews `agent:claude` PRs                                           |
| whenever             | Vlad reads `ready-for-human` verdicts and merges                                                 |

The routine starts in `mode: review-only` (it only reviews Codex's PRs). Switching `factory.yaml` to `mode: build` is a reviewed PR, made after the rollout acceptance tracked on PR #608 (review in both directions, same-PR repair, re-review after a new head, duplicate-run exclusion).

## Mac mini setup (once)

1. **Tooling:** Node 24 (`package.json` `engines`), `corepack enable` for pnpm 10.18.3, `gh`, `jq`.
2. **Folder:** `~/GIT/agent-Commerce`, kept on a clean `main`. Each run gets its own worktree under `.claude/worktrees/`, created from `origin/main`. `.worktreeinclude` copies the gitignored `.env.local` into it.
3. **Database:** the folder's `.env.local` points `DATABASE_URL` and `DATABASE_URL_UNPOOLED` at the local PostgreSQL 17 on `127.0.0.1:5432`, database `agent_commerce_claude_gen`, macOS login role, no password, no `sslmode`. Codex uses `agent_commerce_demo`. Keep Neon for CI/previews only. Tests create and drop a temporary schema per run.
4. **Guards (P2):** from `~/GIT/agent-Commerce` on `main`, Vlad runs `sh .factory/bin/install-local.sh` (agents may not change their own settings). It copies the guard hook and the run lock to `~/.local/share/agent-commerce/`, and merges `.factory/settings/routine.settings.local.json` into the folder's `.claude/settings.local.json` (gitignored; Claude Code reads it from the main checkout for every worktree, so it applies only to this folder's sessions). That file turns on the Bash sandbox (writes limited to the worktree, temp, the lock and journal folders and the pnpm/Playwright caches; network limited to GitHub, the npm registry and local PostgreSQL; no unsandboxed retries), registers the guard hook (fails closed if the hook is missing), and runs only the lock command outside the sandbox. Re-run the script after a merged change to `.factory/hooks`, `.factory/bin/run-lock.sh` or `.factory/settings`.
5. **Credential (P1):** Vlad creates a fine-grained token for `caraseli02/agent-Commerce` only (Contents, Issues, Pull requests: read and write; Metadata: read), stores it in a separate gh configuration, and re-runs the install script:

   ```bash
   GH_CONFIG_DIR=~/.config/gh-agent-commerce-claude gh auth login --hostname github.com --git-protocol https --insecure-storage
   ```

   Choose "Paste an authentication token". The install script then sets `GH_CONFIG_DIR` for the folder's sessions and makes the folder's git use only `gh auth git-credential`, so `gh` and `git push` both use this token instead of Vlad's account-wide login. The guard hook blocks commands that override `GH_CONFIG_DIR`/`GH_TOKEN`, print tokens or read the keychain.

6. **Lock:** the routine creates `/Users/work/GIT/.locks` itself. `~/.local/share/agent-commerce/bin/claude-run-lock status` shows the owner and whether its Claude session is alive. A lock whose session has stopped is recovered by the next run. If a run reports a lock it cannot check, make sure no Claude routine session is running, then delete `/Users/work/GIT/.locks/claude-routine` by hand.
7. **Baseline:** run `./init.sh` in the folder and confirm it passes before enabling the routine.
8. **Keep awake:** Claude Desktop → Settings → **Keep computer awake**, and macOS energy settings that prevent sleep during the work window.

## Routine (once)

Create one **Local** routine in Claude Desktop (Code tab → Routines → New routine):

| Field    | claude-routine                              |
| -------- | ------------------------------------------- |
| Folder   | `~/GIT/agent-Commerce`                      |
| Worktree | on                                          |
| Schedule | `0 9-19 * * *` (hourly at :00, 09:00–19:00) |
| Mode     | Accept edits (never Bypass permissions)     |

Instructions:

```text
Run `git fetch origin`, then read the instructions with
`git show origin/main:.factory/automations/claude-routine.md` and follow them exactly.
```

Reading from `origin/main` means a merged change applies on the next run, whatever state the folder is in. Click **Run now** once while watching and choose "always allow" for the prompts. Sandboxed Bash commands run without prompts; the guard hook still blocks the forbidden ones. Keep the schedule here and in `factory.yaml` in sync: the routine form, not the file, is what fires.

The earlier `pr-evaluator` task and the `claude-generator` / `claude-evaluator` pair are retired; `~/GIT/agent-Commerce-eval` is no longer used.

## Codex side (configured by Vlad, outside this repo)

Codex must follow these rules for the split to hold. Paste them into the Codex heartbeat:

```text
Ownership: never claim, implement or repair an issue labeled agent:claude; those belong to the Claude agent. Your pool is ready-for-agent issues without that label.
Review duty: review open, non-draft PRs labeled agent:claude whose current head has no structured evaluator report. Only a comment containing both `## Evaluator verdict` and `<!-- evaluator-head: <headRefOid> -->` (or legacy `<!-- local-evaluator sha=<headRefOid> -->`) counts; bot summaries or comments that merely mention the SHA do not. Never review a PR you built, and never review PRs without agent:claude (Claude reviews those).
Review method: follow docs/agents/autonomous-workflow.md (Evaluator contract, report format) and docs/agents/verification.md; verify yourself at the exact head; CONFLICTING/DIRTY can never PASS. Also FAIL any agent:claude PR that changes a path in .factory/factory.yaml protected_paths.
Verdict comment: one comment per head that starts with `<!-- evaluator-head: <headRefOid> -->`, then `## Evaluator verdict`, the verdict, and `Independent evaluator: Codex. Evaluated exact PR head <sha>.` On PASS add ready-for-human to the linked issue; on BLOCKED add blocked. Never push to, edit, approve or merge a Claude PR.
INCONCLUSIVE: when verification cannot finish for environment reasons, start the comment with `<!-- evaluator-inconclusive: <headRefOid> -->` instead, name the failed prerequisite, and retry the unchanged head later (not sooner than 2 hours); after 2 INCONCLUSIVE reports on one head, post BLOCKED naming the prerequisite.
Conflicts on your own PRs: merge main into the same branch and push normally; never rebase a published branch or force-push. Check mergeability before treating an earlier PASS as still valid.
Shared state: GitHub labels, assignments and linked PRs are the live claim record; leave feature_list.json and PROGRESS.md unchanged in unattended runs. Keep your own activity journal; Claude writes only to ~/GIT/agent-Commerce/tmp/autonomy/events.jsonl.
Your own PRs: open them ready for review (not draft) when your gates pass; Claude reviews them. Do not label them agent:claude.
```

The label `lane:nightly` was renamed to `agent:claude` on GitHub on 2026-10-06; Codex's heartbeat already skips `agent:claude`. `agent:claude` is the only Claude owner label and only Vlad sets or removes it.

## Changing the factory

- Edit these files (or `docs/agents/`) in a PR. Once merged, the next run reads the new version from `origin/main`. After a change to the hook, the lock script or the settings, Vlad re-runs `sh .factory/bin/install-local.sh` (setup step 4).
- Tests: `sh .factory/bin/run-lock.test.sh` and `node --test .factory/hooks/bash-guard.test.mjs`.
- The Claude agent may not edit the factory. When it hits a workflow problem, it opens a `needs-triage` issue titled `Factory improvement: …`.
- To pause Claude, pause the routine in Claude Desktop.
