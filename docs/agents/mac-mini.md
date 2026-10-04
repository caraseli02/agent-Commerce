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

The reviewed chats were “Decompose Review Plan”, “Stripe Adapter Update” and “Review merged pull request”, supplemented by current GitHub issues, PR comments and Git history. Current repository/GitHub state supersedes older chat plans.

- #554/#555 and payment-recovery foundations are merged.
- #582/#589 repaired task decomposition and verification reuse.
- #583/#590 merged on 2026-10-04. Its final independent report is PASS, 9/10, for `c5cd2084237ff96ca179f70c9acc5343e5ac3567`; earlier process-failure reports are superseded.
- After this setup PR is evaluated and human-merged, #584 is the next eligible payment child: owner-scoped refresh/return recovery. #586 is a later independently eligible Refund task. Choose one only after rechecking live dependencies, assignments and open PRs.
- #585 requires a commercial recovery selection decision. #587/#588/#556/#559 remain dependency-gated. Stripe activation and schema contraction remain separate decisions.
- PR #591 proposes a separate nightly lane managed elsewhere. Do not merge it, install its routines, claim its nightly tasks or assume its unmerged factory definitions are active. Re-read merged instructions if it lands.

## Recurring controller

The Codex heartbeat resumes this chat hourly. It checks existing work and external evaluator feedback first, keeps WIP=1, repairs the same PR after FAIL, waits on missing/stale verdicts, and waits for human merge after PASS. It may then claim one eligible payments/system-design child and produce a small verified PR. It stays quiet while waiting and reports meaningful progress or blockers.

Before implementation, re-read `AGENTS.md`, `PROGRESS.md`, `DECISIONS.md`, `feature_list.json`, the live issue and relevant topic docs. Use the narrowest meaningful checks and one strongest delivery gate with the existing evidence-reuse rules. Do not broaden work to unrelated queue items when payment dependencies are blocked.
