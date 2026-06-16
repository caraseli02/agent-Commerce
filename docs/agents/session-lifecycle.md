# Agent session lifecycle

Use this when starting, continuing, or ending an ECAS agent session.

## 1. Startup order

Read these before coding:

1. `AGENTS.md` — repo router and hard constraints
2. `PROGRESS.md` — current durable state
3. `DECISIONS.md` — durable architecture/product decisions
4. `feature_list.json` — machine-readable task state
5. Relevant issue via `gh issue view <number> --comments`
6. Relevant topic docs under `docs/agents/`

Then run:

```bash
./init.sh
```

If `./init.sh` fails, fix the baseline or report the failure before feature work.

## 2. Sprint contract before coding

Before editing files, write a short contract in the issue or PR notes:

```md
## Sprint contract

-   Issue: #<number>
-   Scope: <one small behavior>
-   Files expected: <likely files or directories>
-   Out of scope: <explicit exclusions>
-   Verification: <commands + browser/runtime check>
-   Stop condition: pass verification or report blocker after 2 focused attempts
```

This makes the process observable and prevents scope creep.

## 3. WIP=1 claim protocol

1. Pick exactly one `ready-for-agent` issue.
2. Skip issues already assigned, already `in-progress`, or already linked to an active PR.
3. Add `in-progress`, assign the working account, and comment with branch name.
4. Create a fresh branch/worktree from `origin/main`.
5. Do not start a second issue until the first one has a PR, blocker note, or explicit handoff.

## 4. During work

-   Prefer TDD when a behavior can be expressed as a test.
-   Make one small decision, one small change, then one verification run.
-   If the task grows past roughly three files or crosses unrelated concerns, split it.
-   Do not refactor adjacent code until the core behavior is verified.
-   Record durable decisions in `DECISIONS.md`, not in chat only.
-   Update `feature_list.json` when feature/task state changes.

## 5. Blocker protocol

Stop and report a blocker after two focused failed attempts or when the task needs a product/design decision.

Blocker note format:

```md
## Blocked

-   Issue: #<number>
-   Branch: <branch>
-   Failing command/check: `<command>`
-   Observed error: <short exact symptom>
-   Tried: <attempt 1>, <attempt 2>
-   Best next move: <recommended human/stronger-model action>
```

## 6. Clean-state checklist before handoff

A session is not complete until both task verification and clean-state checks pass.

Run/check:

```bash
pnpm build
pnpm lint
pnpm typecheck
pnpm test
```

Also verify:

-   `git status --short` contains only intentional files.
-   No temporary debug files are left under `tmp/`, project root, or source folders.
-   No new `console.log`, commented-out code, or TODO markers were introduced unless explicitly intended.
-   `PROGRESS.md` states current focus, blockers, and next verification.
-   `feature_list.json` evidence is updated if task state changed.
-   PR body includes verification evidence and any known risks.

## 7. Handoff template

Use this in PRs, issue comments, or session summaries:

```md
## Handoff

-   Issue/PR: #<number> / #<number>
-   Branch: <branch>
-   Scope completed: <short summary>
-   Files changed: <key files>
-   Verification run:
    -   `pnpm build`: <pass/fail>
    -   `pnpm lint`: <pass/fail>
    -   `pnpm typecheck`: <pass/fail>
    -   `pnpm test`: <pass/fail>
    -   Browser/runtime smoke: <pass/fail/not applicable>
-   Evidence: <screenshots, route checked, test output, logs>
-   Known risks: <none or list>
-   Next best action: <review/merge/follow-up issue/blocker>
```
