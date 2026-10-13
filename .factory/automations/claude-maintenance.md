# Claude maintenance lane

The claude-routine follows this file from step 4.3 when nothing is buildable: no eligible issue, the PASS queue is full, or mode `review-only` with no PR to review. The run already holds the run lock and has passed the guards in step 1. When this file is done, return to step 6 (**Finish**) of `.factory/automations/claude-routine.md`; the lock release stays the last action.

## 1. Limits

This lane **reports only**. It never:

- edits, creates or deletes tracked files, commits, pushes, opens or comments on PRs;
- claims, assigns, relabels, closes or comments on existing issues;
- runs `pnpm test:visual`, updates snapshots, or touches payment, Stripe, refund or migration settings;
- runs `pnpm dlx`, `npx` or any package that is not already in `pnpm-lock.yaml`;
- prints or copies `.env*` values or tokens.

Work in the run's worktree at `origin/main` (`git checkout --detach origin/main`, `pnpm install --frozen-lockfile`). Leave the tree clean; `git status --porcelain` must be empty at the end.

## 2. Pick one task

Read the journal `/Users/work/.local/share/agent-commerce/claude/events.jsonl`, find the newest line with `"action":"maintain"` and take the task after its `task` in the list below (after the last, wrap to the first; no earlier maintenance run means task 1). Run **one** task per run.

| #   | `task`         | Commands                                                                                                                                                                                                          | A finding is                                                                                                                           |
| --- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `regression`   | `pnpm verify:full`                                                                                                                                                                                                | a gate step that fails on `main`                                                                                                       |
| 2   | `e2e`          | `pnpm test:e2e`                                                                                                                                                                                                   | a failing Playwright test, a console error or a failed request it records                                                              |
| 3   | `flaky`        | `pnpm test` three times; compare the failing test names                                                                                                                                                           | a test that fails in some runs and passes in others                                                                                    |
| 4   | `dependencies` | `pnpm deps:audit`, then `pnpm deps:outdated`                                                                                                                                                                      | a `high` or `critical` advisory; a direct dependency at least one major version behind and not already tracked                         |
| 5   | `performance`  | `pnpm test:performance`                                                                                                                                                                                           | a budget the suite reports as exceeded                                                                                                 |
| 6   | `architecture` | `node scripts/check-arch-invariants.mjs`; then read `CONTEXT.md`, `docs/adr/` and the API flow in `CLAUDE.md` § Architecture shortcuts, and look for modules that break the documented flow or duplicate a domain | an invariant failure; refactor candidates go into **one** issue per month (at most 3 candidates with file paths), never one issue each |

Known noise, never a finding: `tests/stripe-unpaid-resume.spec.ts` can flake when another process shares the test Postgres; ports 3000/3100 can be busy while Codex verifies in the main checkout.

## 3. Confirm before filing

- Rerun the failing command (or the single failing test) once. Only a failure that reproduces counts.
- A failure caused by the environment (database, network, sandbox, toolchain, a busy port) is not a finding. Record it in the journal `verification` and file nothing.
- Check that the finding exists on `origin/main` at the SHA you ran, not only on a branch.

## 4. File findings

At most **3** new issues per run, the most severe first, and none while **5** or more open issues already carry a maintenance marker:

```bash
gh issue list --repo caraseli02/agent-Commerce --state open --limit 500 --json number,body --jq '[.[] | select(.body | contains("<!-- claude-maintenance: "))] | length'
```

Before each issue, deduplicate across open **and** closed issues by the exact marker (GitHub search does not reliably index HTML comments):

```bash
gh issue list --repo caraseli02/agent-Commerce --state all --limit 1000 --json number,body --jq '[.[] | select(.body | contains("<!-- claude-maintenance: <task>:<key> -->"))] | length'
```

and, for `dependencies`, also `gh issue list --repo caraseli02/agent-Commerce --state open --search "<package> in:title"`. Any match → do not file and do not comment.

`<key>` must stay the same across runs: the spec file and test title for tests, the package name and advisory id for advisories, the package name and target major for upgrades, the budget name for performance, the invariant name for an architecture invariant failure, and `candidates-<YYYY-MM>` for refactor candidates.

Write the body to a file under `$TMPDIR` and file it with:

```bash
gh issue create --repo caraseli02/agent-Commerce --label needs-triage --title "Maintenance: <short finding>" --body-file "$TMPDIR/maintenance-issue.md"
```

The body starts with the marker line, then short sections:

```md
<!-- claude-maintenance: <task>:<key> -->

**Evidence:** the command, its outcome and a short excerpt (no secrets).
**Reproduced:** yes, twice on `origin/main` <sha>.
**Suspected cause:** one or two lines.
**Suggested scope:** the files or area a fix would touch, as one bounded issue.

Found by the claude-routine maintenance lane. Vlad triages it; `needs-triage` keeps every builder away until then.
```

A clean run files nothing.

## 5. Journal

Return to the routine's step 6 with these journal fields: `action: "maintain"`, `task`, `findings` (count confirmed), `issues_filed` (numbers, or `[]`), `verification` (commands with outcomes), `stop_reason` (for example `maintenance: e2e clean` or `maintenance: 1 issue filed`).
