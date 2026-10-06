# agent-Commerce factory

Two coding agents work this repo from Vlad's Mac mini: **Claude** (Claude Desktop local routines defined here) and **Codex** (its own heartbeat, configured outside the repo). Everything runs locally; there are no cloud runners.

The Claude agents are defined here, as code. Each routine's prompt points at a file in this folder, so changing how they work means opening a PR against these files.

| File                              | What it defines                                                    |
| --------------------------------- | ------------------------------------------------------------------ |
| `factory.yaml`                    | Agents, ownership labels, protected paths, schedules, windows      |
| `automations/claude-generator.md` | Planner + generator for one `agent:claude` issue at a time         |
| `automations/claude-evaluator.md` | Independent evaluator for PRs not built by Claude (mainly Codex's) |

The repo workflow itself (roles, verdicts, verification ladder) stays in `AGENTS.md` and `docs/agents/`.

## How the two agents avoid each other

1. **Ownership is a label.** Issues labeled `agent:claude` belong to Claude; every other `ready-for-agent` issue is Codex's pool. Neither agent ever takes the other's issue. Labels are the only claim record; unattended agents do not edit `feature_list.json` or `PROGRESS.md`.
2. **One local run lock per Claude routine.** Before reading any state, every generator run (scheduled by Claude Desktop or started by hand) creates the directory `/Users/work/GIT/.locks/claude-generator` with a plain `mkdir` (no `-p`), which is atomic and fails if the lock is held. A later contender prints `another run is active since <time>` and stops; it never waits and never touches the other run's lock. The run removes the directory as its last step on every route, including stops and early exits. A lock older than 3 hours (crashed or app-quit run) is stale and is taken over once. The evaluator uses its own lock `/Users/work/GIT/.locks/claude-evaluator` with the same rules, so two evaluator runs never review at once (a generator and an evaluator run do not block each other). The locks are local files on the Mac mini, which is the only place the factory runs; Claude Desktop already never overlaps two runs of the same routine, and the lock also covers manual runs and other sessions. The earlier design with a `claude/wip-lock` branch was dropped: the repo's pre-push hook rejects every push of its empty-tree commits, and the branch was never created on GitHub.
3. **WIP=1 per agent.** Under the lock, the generator continues Claude's one open `in-progress` issue labeled `agent:claude`, or claims exactly one new one. The claim record is the issue's labels, assignee and comment plus the deterministic branch `claude/issue-<number>`, pushed normally (the only branch the generator pushes besides ordinary PR branches). If two Claude `in-progress` issues are ever found, the run reports a blocker and stops: it never releases one by lowest number and never deletes a branch.
4. **Cross-review.** The builder never reviews its own work: Claude reviews ready PRs without `agent:claude`; Codex reviews ready PRs with `agent:claude`.
5. **Payments stay with Codex.** Claude never builds `area:payments` work or touches protected payment paths, but reviews Codex's payment PRs.
6. **Vlad merges.** No agent merges, approves via GitHub review, or force-pushes.

## Daily loop

| Time (Europe/Madrid)      | What happens                                                                 |
| ------------------------- | ---------------------------------------------------------------------------- |
| any time                  | Vlad labels issues `ready-for-agent` and `agent:claude` for Claude's queue   |
| 09:30, 13:30, 17:30       | `claude-generator` claims one Claude issue, repairs a failed PR, or waits    |
| every 30 min, 09:00–20:00 | `claude-evaluator` reviews one ready non-Claude PR whose head has no verdict |
| Codex's own schedule      | Codex builds its issues and reviews `agent:claude` PRs                       |
| whenever                  | Vlad reads `ready-for-human` verdicts and merges                             |

## Mac mini setup (once)

1. **Tooling:** Node 24 (`package.json` `engines`), `corepack enable` for pnpm 10.18.3, `gh auth login` (scopes `repo`, `read:org`).
2. **Folders:** `~/GIT/agent-Commerce` (generator; may push its own branches) and `~/GIT/agent-Commerce-eval` (evaluator; a worktree whose `.claude/settings.local.json` denies `git push`, `git commit`, `gh pr review/close/edit`, `gh issue edit`). Codex keeps its own folders.
3. **Database:** each folder's `.env.local` (gitignored) points `DATABASE_URL` and `DATABASE_URL_UNPOOLED` at the local PostgreSQL 17 on `127.0.0.1:5432` — `agent_commerce_claude_gen` for the generator (and other generator worktrees), `agent_commerce_claude_eval` for the evaluator — using the macOS login role, no password, no `sslmode`. Codex uses `agent_commerce_demo`. Keep Neon for CI/previews only: against Neon `pnpm test` takes ~14 min locally vs ~1.5 min. Tests create and drop a temporary schema per run, so agents never share test data.
4. **Locks:** the routines create `/Users/work/GIT/.locks` themselves (`mkdir -p` of the parent, atomic `mkdir` of the lock). If a run was killed, the lock clears itself after 3 hours; to clear it sooner, check that no routine is running and delete the lock directory by hand.
5. **Baseline:** run `./init.sh` in the generator folder and confirm it passes before enabling the routines.
6. **Keep awake:** Claude Desktop → Settings → Desktop app → General → **Keep computer awake**, and macOS energy settings that prevent sleep on power during the work windows.

## Routines (once)

Create two **Local** routines in Claude Desktop (Code tab → Routines → New routine), isolated worktree **on**:

| Field    | claude-generator       | claude-evaluator            |
| -------- | ---------------------- | --------------------------- |
| Folder   | `~/GIT/agent-Commerce` | `~/GIT/agent-Commerce-eval` |
| Schedule | `30 9,13,17 * * *`     | `*/30 9-19 * * *`           |

Instructions for each routine (replace `<name>`):

```text
Run `git fetch origin`, then read the instructions with
`git show origin/main:.factory/automations/<name>.md` and follow them exactly.
```

Reading from `origin/main` means a merged change applies on the next run, whatever state the local folder is in. Click **Run now** once on each while watching and choose "always allow" for `git`, `gh`, `pnpm`, `node` and Playwright. Keep the schedules here and in `factory.yaml` in sync: the routine form, not the file, is what fires.

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

- Edit these files (or `docs/agents/`) in a PR. Once merged, the next run reads the new version from `origin/main`.
- The Claude agents may not edit the factory. When they hit a workflow problem, they open a `needs-triage` issue titled `Factory improvement: …`.
- To pause Claude, pause the routines in Claude Desktop.
