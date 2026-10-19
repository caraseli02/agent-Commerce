# Agent session lifecycle

Use this when starting, continuing, or ending an Components Marketplace agent session.

## 1. Startup order

Read these before coding:

1. `AGENTS.md` — repo router and hard constraints
2. `PROGRESS.md` — optional historical session context; recheck live GitHub for current work
3. `DECISIONS.md` — durable architecture/product decisions
4. `feature_list.json` — durable policy and historical evidence archive, without task statuses
5. Relevant issue via `gh issue view <number> --comments`
6. Relevant topic docs under `docs/agents/`

For a fresh checkout/worktree, run:

```bash
./init.sh
```

If `./init.sh` fails, fix the baseline or report the failure before feature work. In an already initialized continuing session, inspect the saved verification record and baseline evidence before choosing checks; do not reinstall/reinitialize after each repair.

## 2. Sprint contract before coding

Before editing files, write a short contract in the issue or PR notes:

```md
## Sprint contract

- Issue: #<number>
- Scope: <one small behavior>
- Files expected: <likely files or directories>
- Out of scope: <explicit exclusions>
- Verification: <commands + browser/runtime check>
- Stop condition: pass verification or report blocker after 2 focused attempts
```

This makes the process observable and prevents scope creep.

## 3. WIP=1 per-builder claim protocol

1. Read live GitHub claims and PRs for this builder. Pick exactly one bounded eligible executable issue in its ownership pool (`ready-for-agent`; for Claude, `agent:claude` alone); skip `epic` tracking parents and children with unresolved capability dependencies.
2. Skip issues already assigned, already `in-progress`, or already linked to an active PR.
3. Add `in-progress`, assign the working account, and comment with branch name.
4. Create a fresh branch/worktree from `origin/main`.
5. Do not start a second issue while this builder's `in-progress` issue has an open PR (Claude only: parked (`blocked`) and queued (open PR with an evaluator PASS, waiting for Vlad's merge, at most `max_pass_queue`) claims do not count toward Claude's WIP=1, and Claude never has two live claims; `autonomous-workflow.md` § Claude parking). Keep the same issue until evaluator PASS or a human blocker/replacement and state cleanup, as defined in `autonomous-workflow.md`.

Codex native routing additionally distinguishes live, queued and parked claims as specified in [.codex-autonomy](../../.codex-autonomy/README.md) and `autonomous-workflow.md`. Waiting CI/first evaluation holds the live slot. Queue entry requires trusted exact-head Claude PASS and current head/base local verification; queue capacity is two for new claims. Parked work is preserved, oldest eligible unparked work precedes new claims and actionable repairs retain the original chat/PR. Host activation follows human merge and watched migration; never infer policy installation from repository source alone.

## 4. During work

- Prefer TDD when a behavior can be expressed as a test.
- Make one small decision, one small change, then the smallest meaningful verification. Inspect affected consumers and record check-selection reasons; use `verify-ui-change` for direct or indirect UI effects.
- After a focused repair, rerun only invalidated checks and continue the authorized task. Save stage, revision/diff fingerprint, evidence freshness, and next action in ignored `tmp/verification/<task-id>.md` when continuation is needed; see `verification.md`.
- Scope by one observable behavior, including its necessary implementation/endpoint/tests. Review scope when it exceeds roughly three implementation files; split unrelated outcomes into named issues before coding.
- Do not refactor adjacent code until the core behavior is verified.
- Record durable decisions in `DECISIONS.md`, not in chat only.
- Record all live task transitions, blockers and evidence in GitHub labels and issue/PR comments. Normal feature PRs leave `feature_list.json` / `PROGRESS.md` unchanged. Update the optional short session note at most once per session on `main` when explicitly requested, or generate it from GitHub; archive edits require an explicit archival/policy task. Historical notes never replace live claim checks.

## 5. Blocker protocol

Stop and report a blocker after two focused failed attempts or when the task needs a product/design decision. Do every part of the task that does not depend on the blocker first, add `blocked`, and make **Best next move** name the single action Vlad must take; the existing agent chat surfaces the blocker. Claude keeps `in-progress` so the claim is parked; when `blocked` is removed it resumes, or waits while another claim is live (`autonomous-workflow.md` § Claude parking); Codex keeps its existing handling.

Blocker note format:

```md
## Blocked

- Issue: #<number>
- Branch: <branch>
- Failing command/check: `<command>`
- Observed error: <short exact symptom>
- Tried: <attempt 1>, <attempt 2>
- Best next move: <recommended human/stronger-model action>
```

## 6. Clean-state checklist before handoff

A session is not complete until both task verification and clean-state checks pass.

For application PR/session delivery, run/check:

```bash
pnpm verify:handoff
```

`verify:handoff` includes the lower gates; do not run `verify` or `verify:full` first. Matching local base-gate evidence may be reused, while architecture/runtime and clean-state checks run. Pre-push independently validates receipt freshness and the actual pushed range. Independent review runs fresh checks; verified documentation-only changes use the focused gate described in `verification.md`. Do not claim clean-tree delivery checks passed while changes remain uncommitted.

Also verify:

- `git status --short` contains only intentional files.
- No temporary debug files are left under `tmp/`, project root, or source folders.
- No new `console.log`, commented-out code, or TODO/FIXME markers were introduced unless explicitly intended; `node scripts/check-clean-state.mjs` checks the changed source files for those regressions while skipping itself so it does not self-flag. It does not read `PROGRESS.md` or require a session-note update.
- GitHub issue labels, assignments and linked PRs are the only live task state. Verify them directly; a historical archive entry cannot claim an issue or prove completion.
- A code-only handoff passes with `PROGRESS.md` and `feature_list.json` unchanged. Preserve evidence in the issue/PR, not in a duplicate tracked task ledger.
- Remove temporary screenshots/logs/task records before handoff. The ignored four-hour delivery receipt may remain for pre-push reuse; it is never committed or treated as an evaluator verdict.
- PR body includes verification evidence and any known risks.
- If a PR was created or updated, publish evaluator-ready evidence for its exact head. The separate evaluator owns scheduling; wait for its report and human merge before another issue for this builder.

## 7. Handoff template

Use this in PRs, issue comments, or session summaries:

```md
## Handoff

- Issue/PR: #<number> / #<number>
- Branch: <branch>
- Scope completed: <short summary>
- Files changed: <key files>
- Verification run:
  - `pnpm build`: <pass/fail>
  - `pnpm lint`: <pass/fail>
  - `pnpm typecheck`: <pass/fail>
  - `pnpm test`: <pass/fail>
  - Browser/runtime smoke: <pass/fail/not applicable>
- Evidence: <screenshots, route checked, test output, logs>
- Known risks: <none or list>
- Next best action: <review/merge/follow-up issue/blocker>
```
