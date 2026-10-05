# Auto-merge for low-risk PRs

Decision: #603 (epic #595). The policy is recorded in `DECISIONS.md`. Pure logic and tests: `scripts/auto-merge-policy.mjs` and `tests/auto-merge-policy.spec.ts`. Runner: `scripts/auto-merge.mjs`. Workflow: `.github/workflows/auto-merge.yml`.

Low-risk PRs merge automatically once CI and the evaluator pass on the exact head. Every other PR still needs a human merge.

## Low-risk class

The class is computed only from the PR's changed-file list. Labels, PR text and anything the agent declares are ignored. A PR is low-risk only if **every** changed path matches the allowlist and **none** matches the denylist. Renames and copies count by both the old path and the new path. Deletions count by their path. An empty or truncated file list is never low-risk.

| Allowlist                           | Denylist (always human merge; wins over the allowlist)                    |
| ----------------------------------- | ------------------------------------------------------------------------- |
| `README.md`                         | `AGENTS.md`, `CLAUDE.md`, `DECISIONS.md`                                  |
| `docs/**` (except `docs/agents/**`) | `docs/agents/**`                                                          |
| `.agents/skills/**`                 | `.github/**`, `.husky/**`, `scripts/**`                                   |
| `.claude/skills/**`                 | `package.json`, `pnpm-lock.yaml`                                          |
| `skills-lock.json`                  | anything not on the allowlist (app, server, tests, config, `PROGRESS.md`) |

Denylist matching is case-insensitive, so `docs/Agents/x.md` is still denied (it would collide with `docs/agents/` on macOS).

## Merge conditions

All of these are checked against the PR's **current head SHA**. If any fails, the PR is not merged:

1. The PR is open, not a draft, targets `main`, and GitHub reports it `mergeable` (no conflicts).
2. The newest `CI` workflow run (`.github/workflows/ci.yml`) for that head completed with `success`, including a successful `verify` job.
3. `evaluator/verdict` is `success` on that head. Signals count only if they come from the Evaluator App named by the repo variable `EVALUATOR_APP_SLUG`. A commit status must be created by `<slug>[bot]`; a check run must belong to app `<slug>`. The newest trusted signal of each kind must be success. Missing, pending, failure, error and any "did not run" outcome (#597) block the merge, as does an unset slug.
4. The repo variable `AUTO_MERGE_ENABLED` is exactly `true`. The runner re-reads it through the API just before it decides.
5. The triggering event refers to that same head SHA. A stale event is ignored; the event for the new head re-evaluates it.

The merge uses `PUT /pulls/{n}/merge` with `merge_method: merge` (the repo's merge-commit convention) and `sha` pinned to the evaluated head. If the head moves in the meantime, GitHub refuses the merge and nothing happens. The commit message ends with the trailers `Auto-merged-by: .github/workflows/auto-merge.yml` and `Auto-merge-pr: #<n>`.

## Triggers and trust boundary

The workflow runs from `main` only, on:

- `workflow_run`: CI completed
- `status`: `evaluator/verdict` success
- `check_run`: `evaluator/verdict` completed with success
- `workflow_dispatch`: takes `pr_number` to re-evaluate one PR

It never uses `pull_request_target` and never checks out or runs PR head code. It sparse-checks-out `scripts/` from `main` and talks to the REST API only. It authenticates as a separate **Merger** GitHub App, using `actions/create-github-app-token`. Its secrets live in the `auto-merge` environment, which is restricted to `main`. An App token is required, because a merge made with `GITHUB_TOKEN` would not trigger the push-to-`main` CI run.

The workflow is a no-op until setup is complete. If the Merger App secrets are missing, the job logs that and exits successfully. If `AUTO_MERGE_ENABLED` is not `true`, the merge paths are skipped.

## Auto-pause

When CI fails (`failure`, `timed_out` or `startup_failure`) on a push to `main` whose commit carries the `Auto-merged-by` trailer, the workflow:

1. sets `AUTO_MERGE_ENABLED=false`
2. opens an issue titled `Auto-merge paused: CI failed on main after auto-merge <sha7>`. The issue links the merge commit, the PR and the failed run.

Human-merged commits never trigger a pause. To resume, fix `main` and set the variable back to `true`.

## For agents

- After an evaluator PASS on a low-risk PR, the PR may merge without a human. Re-check the PR state before selecting new work: WIP is clear once the PR is merged.
- Every PR outside the class still waits for a human merge after PASS.
- There is no opt-out label and no dry-run mode (the owner declined both). To keep a low-risk PR from auto-merging, leave it as a **draft**. A human can also set `AUTO_MERGE_ENABLED` to anything other than `true` to stop all auto-merges.
- Never try to get a PR into the class by splitting out or hiding runtime changes. The class is a property of the diff, not of intent.

## Setup (owner, one time)

Until these steps are done, the workflow does nothing.

1. **Evaluator App.** Create a GitHub App named for example "Evaluator", with **Commit statuses: write** (or **Checks: write**) only, and install it on the repo. The evaluator runner posts `evaluator/verdict` with it. Keep its private key on the owner's Mac mini; never put it in repo secrets.
2. **Merger App.** Create a second GitHub App, "Merger", and install it on the repo. Repository permissions:
   - Contents: write
   - Pull requests: write
   - Issues: write
   - Variables: write
   - Actions: read
   - Checks: read
   - Commit statuses: read
3. **Environment.** Create the environment `auto-merge` (Settings → Environments). Under deployment branches, allow only `main`. Add the environment secrets `MERGER_APP_ID` (the App ID) and `MERGER_APP_PRIVATE_KEY` (a generated private key). The workflow refers to this environment, and GitHub auto-creates a referenced environment without restrictions. Confirm the `main` restriction is in place before adding the secrets.
4. **Ruleset on `main`.** Require the status checks `verify` (CI) and `evaluator/verdict`, with the source set to the Evaluator App. If PR approvals are required, add the Merger App as a bypass actor, or the merge is refused. A bypass actor skips **every** rule in its ruleset. So keep the approval rule in a separate ruleset from the required-status-checks ruleset, and give the Merger App bypass on the approval ruleset only.
5. **Repo variables** (Settings → Secrets and variables → Actions → Variables):
   - `EVALUATOR_APP_SLUG`: the Evaluator App's slug, for example `ecas-evaluator`
   - `AUTO_MERGE_ENABLED`: `true`, to turn the workflow on

To check the setup, run the workflow manually (Actions → Auto-merge → Run workflow, `pr_number`) against an open docs-only PR that has CI and evaluator PASS. Also run it against an application PR, and confirm the log lists why that PR was not merged.
