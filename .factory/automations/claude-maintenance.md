# Claude night lane

The claude-routine follows this file from step 4.3 when nothing is buildable and the improve lane (step 4.4, `claude-improve.md`) does not run: the live claim's PR waits for review, the PASS queue is full, the improve slot is taken or found nothing, or mode `review-only` with no PR to review. The run already holds the run lock and has passed the guards in step 1. When this file is done, return to step 6 (**Finish**) of `.factory/automations/claude-routine.md`; the lock release stays the last action.

The lane does the work a senior engineer does while waiting for review: prepare the next task, explain open failures, keep what was learned, answer explicit spike questions, run the checks the merge pipeline does not run, and hand Vlad a short morning summary. Settings live under `claude-routine.night_lane` in `.factory/factory.yaml`.

## 1. Limits

The lane writes **only** the GitHub comments and issues named below. It never:

- edits, creates or deletes tracked files in the run's worktree, commits, pushes, opens or comments on PRs;
- claims, assigns, relabels or closes issues, or comments anywhere except the comments named in §3–§8;
- uses `gh issue comment --edit-last` or edits any existing comment: the gh account is shared with Vlad and Codex, so "last comment" may be theirs. A newer marked comment supersedes an older one;
- runs `pnpm test:visual`, updates snapshots, or touches payment, Stripe, refund or migration settings;
- runs `pnpm dlx`, `npx` or any package that is not already in `pnpm-lock.yaml` (a spike may change versions only inside its throwaway worktree, §7);
- prints or copies `.env*` values or tokens.

Work at `origin/main` (`git checkout --detach origin/main`, `pnpm install --frozen-lockfile`) and leave the tree clean: `git status --porcelain` must be empty at the end. One item per run, within `night_lane.budget_minutes` (40) including setup; a run that hits the budget records what it has and stops.

## 2. Pick one item

Take the **first** item whose condition holds. Read the journal `/Users/work/.local/share/agent-commerce/claude/events.jsonl` where a condition needs history.

| Order | `task`     | Condition                                                                                                                                                                                  |
| ----- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1     | `digest`   | local Madrid time is at or after `night_lane.digest_after` and today's (Madrid date) digest is due by the rule in §8; normally routine step 1.5 does it                                    |
| 2     | `plan`     | one of the next `night_lane.plan_ahead` (2) issues in step 4.1 order (eligible except for the claim limit, overlap or queue cap) has no current plan (§3)                                  |
| 3     | `diagnose` | an open finding issue (body starts with `<!-- claude-maintenance:` or `<!-- codex-maintenance:`) has no diagnosis comment yet and fewer than 2 `diagnose` journal lines (§4); newest first |
| 4     | `learning` | a learning source from the last 14 days is not yet in any journal line's `sources_assessed` (§5); oldest first                                                                             |
| 5     | `spike`    | an open issue labeled `night_lane.spike_label` (`spike`) has no current spike result (§7), and no `"task":"spike"` journal line in the last 24 hours                                       |
| 6     | `check`    | a check from §6 is due                                                                                                                                                                     |
| —     | none       | print `Claude routine: night lane idle` and return with `action: "idle"`                                                                                                                   |

## 3. `plan`: prepare the next issue

The plan lets the next build start from evidence and makes the overlap check in step 4.1 precise. A plan is **current** when the issue's newest comment starting with `<!-- claude-plan ` has `v=` equal to `gh issue view <n> --json title,body,labels | node scripts/owner-attention.mjs skip-fingerprint` **and** no file it lists changed on `origin/main` since its `main=` SHA (`git diff --name-only <main>..origin/main -- <files>` is empty).

Read the issue, its parent epic, the code it names and `docs/solutions/` entries whose `files` overlap (the `compound-learning` skill, §5). Then post one comment with `gh issue comment <n> --body-file "$TMPDIR/plan.md"`:

```md
<!-- claude-plan v=<fingerprint> main=<origin/main sha> -->

## Implementation plan (claude-routine night lane)

**Files** (one path per line; the build's overlap check reads this list)

    app/components/...
    tests/parity/...

**Consumers:** components, composables or stores that use what changes.
**Tests:** focused tests and parity scenarios to add or update, with commands.
**Risks:** behavior that could regress; acceptance criteria that are ambiguous.
**Overlaps:** open PRs touching the same files or consumers today (none / #N file).
**Learnings:** relevant `docs/solutions/` entries.
**Open questions:** for Vlad, or "none".
```

The plan is advisory: Vlad may edit or answer it, and the build follows the newest plan comment, including Vlad's corrections in later comments.

## 4. `diagnose`: explain one open finding

Pick the newest open finding without a comment starting with `<!-- claude-diagnosis` or a Codex diagnosis. Reproduce it on `origin/main` (runtime checks through the owned server, §6.1), then narrow it down: smallest failing command or test, the code path involved and, only when the range is at most 32 commits and a single check fits the budget, the first bad commit with `git bisect run` in a throwaway worktree as in §7. Older revisions may lack the helper, its config, the spec or the wrapper, so never run the checkout's copy: pin the reviewed one outside the worktree (`git show origin/main:scripts/owned-server-check.mjs > "$TMPDIR/pin/owned-server-check.mjs"`) and run `git bisect run node --env-file-if-exists=<this worktree>/.env.local "$TMPDIR/pin/owned-server-check.mjs" bisect-step --config <name> [--grep "<title>"] [specs]`. Each step skips (exit 125) a revision missing a prerequisite, failing `pnpm install --frozen-lockfile` or failing to build, and any environment failure; it reports bad only when the check itself printed `result=fail`. Stop at evidence; never fix. When the budget runs out, post what you have with `partial` in the marker (`<!-- claude-diagnosis partial main=<sha> -->`); a finding gets at most 2 diagnose runs, so it never blocks the items below it.

Post one comment on the finding:

```md
<!-- claude-diagnosis main=<origin/main sha> -->

**Reproduction:** exact command and outcome (or "not reproduced on <sha>": environment evidence).
**Narrowed to:** failing test / route / component, and first bad commit if bisected.
**Likely cause:** with file:line evidence; say "hypothesis" when it is not proven.
**Fix scope:** the files and acceptance criteria of one bounded issue Vlad can label `agent:claude`.
```

## 5. `learning`: keep what was learned

Follow `.agents/skills/compound-learning/SKILL.md`. Sources from the last 14 days: a Claude PR whose head got an evaluator `FAIL` and was repaired, a `claude-diagnosis` comment, a spike result, a blocker comment that Vlad resolved. Capture at most one learning per run into the week's **Learnings inbox** issue; never write `docs/solutions/` from this lane (publishing is an ordinary build of that issue once Vlad labels it). Source ids: `pr<N>@<repaired head sha>`, the URL of a diagnosis, spike or blocker comment. Record every source you assessed in the journal `sources_assessed` (qualifying or not) so it is never reconsidered. Never capture into an inbox issue that already carries `agent:claude` or `in-progress` (its publishing build is running): open the next one, titled with ` (continued)`.

## 6. `check`: what the merge pipeline does not run

Husky pre-push runs `pnpm verify` and selected visual checks; the independent evaluator runs the appropriate fresh gate (including `verify:full` when needed). Never repeat those here. The checks, in priority order:

| `check`        | Command                                                 | Due when                                   | A finding is                                                                                                   |
| -------------- | ------------------------------------------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `performance`  | owned check `--config performance` (§6.1)               | `origin/main` changed since its last run   | a budget exceeded or a step of the scenario failing                                                            |
| `e2e`          | owned check `--config e2e` (§6.1)                       | `origin/main` changed since its last run   | a failing Playwright test, a console error or a failed request it records                                      |
| `parity`       | owned check `--config parity` (§6.1)                    | `origin/main` changed since its last run   | a parity scenario failing on `main`                                                                            |
| `flaky`        | `pnpm test` three times; compare the failing test names | no `flaky` run in the last 7 days          | a test that fails in some runs and passes in others                                                            |
| `dependencies` | `pnpm deps:audit`, then `pnpm deps:outdated`            | no `dependencies` run in the last 24 hours | a `high` or `critical` advisory; a direct dependency at least one major version behind and not already tracked |

"Changed since its last run" compares `origin/main` with the `head` of the newest journal line with `"task":"check"` and that `check` whose result was a pass or a finding. Unchanged evidence is reused, never rerun; an environment failure (exit 75) is not evidence, so the check stays due. Known noise, never a finding: `tests/stripe-unpaid-resume.spec.ts` can flake when another process shares the test Postgres.

### 6.1 Owned server

Runtime checks (and runtime reproduction in §4) go through `scripts/owned-server-check.mjs`, inside the test-database wrapper. The script refuses anything but `origin/main` (unless `--any-head`), a local, wrapper-created test schema and a free port; builds this checkout; starts its own server on `night_lane.owned_server_port`; checks readiness and that the listener is its own process; runs Playwright with `PLAYWRIGHT_BASE_URL` and `PARITY_BASE_URL` (so the e2e and parity configs skip their own `webServer`; a unit test fails if a config reads another base-URL variable) and `--update-snapshots=none`; and always stops what it started. It takes arguments, never a shell string: test titles from issue bodies go into `--grep` as one argument.

```bash
node --env-file-if-exists=.env --env-file-if-exists=.env.local scripts/with-test-database.mjs \
  node scripts/owned-server-check.mjs --config e2e [--grep "<test title>"] [tests/e2e/<file>.spec.ts]
```

Exit code `75` means an environment failure (wrong head, database, busy port, readiness, budget): record it, file nothing. `0` is a pass; any other non-zero exit is a candidate finding. Codex's investigations use port 3206, so the two never collide.

### 6.2 Confirm and file

- Rerun the failing command (or the single failing test) once. Only a failure that reproduces counts; check that it exists on `origin/main` at the SHA you ran.
- A failure caused by the environment (database, network, sandbox, toolchain, a busy port) is not a finding. Record it in the journal `verification` and file nothing.
- At most **3** new issues per run, the most severe first, and none while **5** or more open issues carry a maintenance marker of **either** builder:

  ```bash
  gh issue list --repo caraseli02/agent-Commerce --state open --limit 500 --json number,body --jq '[.[] | select(.body | test("<!-- (claude|codex)-maintenance: "))] | length'
  ```

- Before each issue, deduplicate across open **and** closed issues of both builders by the exact key (`contains`, not a regex: keys hold dots and brackets), then look for a semantically equivalent open issue by title words (a different marker or wording does not hide a duplicate). Any match → do not file and do not comment:

  ```bash
  gh issue list --repo caraseli02/agent-Commerce --state all --limit 1000 --json number,body \
    | jq --arg k "<check>:<key>" '[.[] | select((.body | contains("<!-- claude-maintenance: \($k) -->")) or (.body | contains("<!-- codex-maintenance: \($k) -->")))] | length'
  ```

- `<check>:<key>` stays the same across runs, in exactly these forms (the convention Codex's `router.admit_findings` reads): `e2e:<spec path>:<test title>`, `parity:<spec path>:<test title>`, `flaky:<spec path>:<test title>`, `performance:<spec path>:<test title>`, `dependencies:<package>:<advisory id>` and `dependencies:<package>@<target major>`.

File it with `gh issue create --repo caraseli02/agent-Commerce --label needs-triage --title "Maintenance: <short finding>" --body-file "$TMPDIR/maintenance-issue.md"`. The body:

```md
<!-- claude-maintenance: <check>:<key> -->

**Evidence:** the command, its outcome and a short excerpt (no secrets).
**Reproduced:** yes, twice on `origin/main` <sha>.
**Suspected cause:** one or two lines.
**Suggested scope:** the files or area a fix would touch, as one bounded issue.

Found by the claude-routine night lane. Vlad triages it; `needs-triage` keeps every builder away until then.
```

A clean run files nothing.

## 7. `spike`: answer one explicit question

Only for an open issue labeled `spike` whose body states the question. A result is **current** while the issue's newest comment starting with `<!-- claude-spike ` has `v=` equal to the issue's skip fingerprint (§3).

1. `git worktree add --detach "$TMPDIR/spike-<n>" origin/main`, then work only there (`pnpm install --frozen-lockfile --ignore-scripts`, then the experiment: a version bump with `pnpm add --ignore-scripts <pkg>@<version>`, a prototype change, a measurement). Install scripts never run unattended.
2. Measure, do not polish: typecheck, test and build outcomes, error counts, files affected.
3. Remove it: `git worktree remove --force "$TMPDIR/spike-<n>"`. Nothing from the spike is committed or pushed.
4. Comment once on the issue:

```md
<!-- claude-spike v=<fingerprint> main=<origin/main sha> -->

**Question:** as stated in the issue.
**Answer:** yes / no / partly, in one sentence.
**Evidence:** commands with outcomes; counts of errors and affected files.
**Estimate:** how many bounded issues a real change needs, and their order.
**Risks and unknowns:** what the spike could not settle.
```

## 8. `digest`: the morning summary

The digest is **due** when the Madrid-time date has no journal line with `"task":"digest"` (posted or failed: one attempt per day, so a failing post never takes over the day's runs) and the digest issue has no comment for that date: `gh api repos/caraseli02/agent-Commerce/issues/<digest issue>/comments --paginate --jq '[.[] | select(.body | startswith("<!-- claude-digest: <YYYY-MM-DD> -->"))] | length'` is `0`.

One comment per day on the open issue titled `night_lane.digest_issue_title` (`Claude morning digest`). If it does not exist, create it once without labels (`gh issue create --title "Claude morning digest" --body "Daily summary from claude-routine. Pin this issue to find it fast."`). The comment:

```md
<!-- claude-digest: <YYYY-MM-DD> -->

**Ready to merge** (evaluator PASS on the current head, local verification current), suggested order: #N title (why first).
**Needs your decision:** blocked issues and PRs with their Best next move; open questions in plans.
**Overnight:** builds, repairs, reviews; plans, diagnoses, spikes and learnings written; findings filed (from the journal since the previous digest).
**Self-started:** improve-lane issues claimed, PRs opened, merged and declined since the previous digest, and `Improvement idea:` proposals waiting for triage.
**Learnings inbox:** entries waiting for your tick.
**Idle runs:** count since the previous digest, with the main reason.
```

Keep it under 25 lines; link, do not repeat.

## 9. Journal

Return to the routine's step 6 with: `action: "maintain"` (or `"idle"`), `task` (§2), `check` (for `task: "check"`), `head` (the `origin/main` SHA used), `issue` (the issue planned, diagnosed, spiked or filed), `result` (`pass`, `finding` or `environment` for checks), `sources_assessed` (learning source ids, §5), `findings` (count confirmed), `issues_filed` (numbers, or `[]`), `comments` (URLs posted), `verification` (commands with outcomes) and `stop_reason` (for example `night lane: plan #641` or `night lane: e2e clean`).
