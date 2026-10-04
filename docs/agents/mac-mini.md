# Mac mini continuation

Prepared 2026-10-04. The controller continues the existing payments and modular-monolith design work. The evaluator runs separately and publishes GitHub comments; follow `autonomous-workflow.md` for exact-head verdict routing.

## Local environment

- Primary checkout: `/Users/work/Documents/agent-Commerce`.
- Migration/handoff checkout: `/Users/work/.codex/worktrees/9dab/agent-Commerce`, branch `codex/mac-mini-autonomy`.
- Node 24.11.0 and pnpm 10.18.3 are installed. The Mac also has an unrelated Node 22 installation earlier on its usual PATH. Repo-scoped blocks in `.zprofile`, `.zshrc` and `.bash_profile` select Node 24 for these checkout paths; existing shell files have `before-agent-commerce` backups.
- Codex shell environment configuration also prepends the Node 24/PostgreSQL paths for future sessions (backed up as `config.toml.before-agent-commerce`). Existing tool sessions can retain their old PATH; source the environment explicitly before commands.
- To select the toolchain explicitly: `. /Users/work/.local/share/agent-commerce/env.sh`. Confirm `node --version` and `pnpm --version` before initialization.
- Homebrew PostgreSQL 17 runs as a user service and restarts at login. Check `brew services info postgresql@17` and `/opt/homebrew/opt/postgresql@17/bin/pg_isready`.
- Both checkouts use the local `agent_commerce_demo` database through ignored, mode-600 `.env.local`. Mock provider is selected and Stripe Gate A is false. Copy that ignored file when creating another local worktree; never copy its contents into PR evidence.
- Tests create/drop isolated PostgreSQL schemas through the existing runner. Never point this local work at a real customer database.
- Chromium is installed through the repository's Playwright version. Use `pnpm test:e2e`; it starts its own isolated built server. Stop conflicting servers first.
- GitHub CLI is authenticated as `caraseli02`. Repository-local commit identity is `Codex Agent <codex@openai.com>`; unrelated repositories retain their existing identity.
- macOS power settings already disable system sleep and enable restart after power failure. The Codex app must remain running and the user session logged in for its local heartbeat; this is not a boot daemon.

## Recovered work and next task

The reviewed chats were “Discuss Codex Models”, “Decompose Review Plan”, “Stripe Adapter Update”, “Review PR progress” and “Review merged pull request”, supplemented by current GitHub issues, PR comments, Git history and the legacy Hermes scheduler/scripts. Current repository/GitHub state supersedes older chat plans.

- #554/#555 and payment-recovery foundations are merged.
- #582/#589 repaired task decomposition and verification reuse.
- #583/#590 merged on 2026-10-04. Its final independent report is PASS, 9/10, for `c5cd2084237ff96ca179f70c9acc5343e5ac3567`; earlier process-failure reports are superseded.
- After this setup PR is evaluated and human-merged, #584 is the next eligible payment child: owner-scoped refresh/return recovery. #586 is a later independently eligible Refund task. Choose one only after rechecking live dependencies, assignments and open PRs.
- #585 requires a commercial recovery selection decision. #587/#588/#556/#559 remain dependency-gated. Stripe activation and schema contraction remain separate decisions.
- PR #591 proposes a separate nightly lane managed elsewhere. Do not merge it, install its routines, claim its nightly tasks or assume its unmerged factory definitions are active. Re-read merged instructions if it lands.

## Recurring controller

The existing Codex heartbeat resumes this chat hourly, every day, including overnight. Keep one scheduler and one implementation owner. A turn continues its bounded task through verification and PR delivery; the hourly interval is for waking/resuming, not a limit of one edit per hour. Keep Codex open in the logged-in user session. Do not install a second daemon or a second planner/generator schedule.

At the first wake each local day, refresh GitHub/main, inspect previous-day merges and open PRs, and append a concise daily priority/health checkpoint to `tmp/autonomy/events.jsonl` in the primary checkout. Check Node/pnpm, PostgreSQL, auth and space before heavy work. Do not repeat installation or full application checks merely because a new day started.

On every wake, route the active issue first:

1. Inspect the open PR's CI, current-head evaluator reports and inline findings. Pending checks or absent/stale evaluation mean quiet waiting, not implementation failure.
2. CI failure or evaluator FAIL means a bounded repair on the same issue/branch/PR, followed by the invalidated checks and one strongest delivery gate. Two focused unsuccessful attempts mean a concrete blocker report; avoid rapid repeated retries for persistent auth/quota/provider failures.
3. Independent exact-head PASS means wait for human merge. After merge, reconcile GitHub labels/feature state/PROGRESS before claiming new work. Resolve ordinary conflicts in the owned branch without resetting unrelated work.
4. When WIP is clear, choose exactly one unassigned `ready-for-agent` executable issue with satisfied dependencies. Prefer payment critical path #584, then #586; next choose eligible architecture, correctness or demo-flow issues by documented priority. Do not select blocked epics, invent commercial policy or compete for `lane:nightly` work managed elsewhere. Do not idle forever on a blocked payment dependency when another eligible issue can be claimed with WIP clear.
5. Write the sprint contract, use a clean issue worktree and its own ignored local environment, implement the complete bounded outcome, inspect consumers, verify and publish a PR with acceptance-to-evidence mapping. Keep provider I/O outside retryable transactions and preserve public module boundaries.
6. Append activity/evidence and waiting state at delivery, repair, evaluation and merge checkpoints. Record unavailable usage as null; desktop activity does not claim API cost accounting. Keep logs out of commits and update durable repo state only when it materially changes.

Sol owns planning, payment/concurrency decisions, integration and delivery. The earlier model-routing discussions support Luna for isolated discovery/mechanical checks and well-defined low-risk work when delegation is authorized; they do not require every model on every issue. The separately operated evaluator is the final checker. Do not launch Astra evaluation or create user-owned chats for ordinary subtasks.

Stay quiet while waiting. Report meaningful delivery, evaluator findings, a completed repair or a required decision. A daily internal checkpoint is not a daily notification.

Before implementation, re-read `AGENTS.md`, `PROGRESS.md`, `DECISIONS.md`, `feature_list.json`, the live issue and relevant topic docs. Use the narrowest meaningful checks and one strongest delivery gate with the existing evidence-reuse rules. Do not broaden work to unrelated queue items when payment dependencies are blocked.

## Legacy scheduler cleanup

The migration review found live Hermes jobs still targeting `/Users/work/conductor/repos/Ecas` / `caraseli02/Ecas`. The old setup script can reset/clean that checkout; the planner/generator models fail with 404. Paused through `hermes cron pause`:

- `77c73e447150` — ECAS Dev — Generator.
- `512230646ed2` — ECAS PM — Issue Dispatcher.
- `490522a27665` — ECAS Dev Retry Watchdog.

These jobs remain recoverable and are not deleted. Unrelated jobs are preserved. Legacy evaluator `6bf3bc311d58` is unchanged pending clarification of the user's separate evaluator; its last error says its configured model is unavailable. Do not silently treat that failed job as working external evaluation. PR #593 currently has green CI but no independent verdict.

The separate Node chat “Make Node 24 reliable on the Mac mini” verified fresh zsh/bash login and non-login shells in both checkouts, `pnpm exec node`, and repo clean-state commands under Node 24.11.0 / pnpm 10.18.3. No further host edit or Codex restart was required. Old processes can retain their previous PATH.
