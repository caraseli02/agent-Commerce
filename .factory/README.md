# agent-Commerce factory

The unattended agents for this repo are defined here, as code. Claude Desktop local routines on the Mac mini are only the scheduler: each routine's prompt points at a file in this folder, so changing how the agents work means opening a PR against these files.

| File                               | What it defines                                                        |
| ---------------------------------- | ---------------------------------------------------------------------- |
| `factory.yaml`                     | Lanes, labels, protected paths, schedules, run windows, budgets        |
| `automations/nightly-generator.md` | Planner + generator for one non-payments `ready-for-agent` issue       |
| `automations/nightly-evaluator.md` | Independent evaluator for nightly PRs and payment PRs (draft or ready) |

The repo workflow itself (roles, verdicts, verification ladder) stays in `AGENTS.md` and `docs/agents/`. This folder only adds the nightly lane and its schedule.

## Daily loop

1. **Day:** Vlad works payment and checkout issues in the interactive lane, reviews nightly PRs marked `ready-for-human`, and labels the next issues `ready-for-agent` (optionally `lane:nightly` to queue one for tonight).
2. **00:47:** the generator claims one eligible issue, or repairs last night's PR if the evaluator failed it, and opens a draft PR.
3. **05:13:** the evaluator reviews the nightly PR and any payment PR whose current head has no verdict yet.
4. **Morning:** read the verdict comments, then merge or redirect.

## Mac mini setup (once)

1. **Tooling:** Node 24 (`.nvmrc`), `corepack enable` for pnpm 10.18.3, `gh auth login`, and `pnpm exec playwright install chromium` in the clone.
2. **Database:** PostgreSQL 17 running locally (for example `brew install postgresql@17 && brew services start postgresql@17`), a database named `ecas_test`, and `DATABASE_URL=postgresql://<user>@127.0.0.1:5432/ecas_test` in the clone's `.env.local` (gitignored). This matches CI.
3. **Baseline:** in a fresh clone, run `./init.sh` and confirm it passes before enabling the routines.
4. **Keep awake:** Claude Desktop → Settings → Desktop app → General → **Keep computer awake**. Leave the app running.

## Routines (once)

Create two **Local** routines in Claude Desktop (Code tab → Routines → New routine):

| Field    | nightly-generator        | nightly-evaluator        |
| -------- | ------------------------ | ------------------------ |
| Folder   | the agent-Commerce clone | the agent-Commerce clone |
| Worktree | on                       | on                       |
| Schedule | Daily, 00:47             | Daily, 05:13             |

Instructions for each routine (replace `<name>` with the routine name):

```text
Run `git fetch origin`, then read the instructions with
`git show origin/main:.factory/automations/<name>.md` and follow them exactly.
```

Reading from `origin/main` means a merged change to the factory applies on the next run, whatever state the local clone is in.

Then click **Run now** on each once while watching, and choose "always allow" for the commands they need (`git`, `gh`, `pnpm`, `node`, Playwright). Later runs reuse those approvals; review them on each routine's detail page.

Keep the schedule here and in `factory.yaml` in sync: the routine form, not the file, is what actually fires.

## Changing the factory

- Edit these files (or `docs/agents/`) in a PR. Once merged, the next run reads the new version from `origin/main`.
- The nightly agents are not allowed to edit the factory. When they hit a workflow problem, they open a `needs-triage` issue titled `Factory improvement: …` for you to decide on.
- To pause the nightly lane, pause the routines in Claude Desktop.
