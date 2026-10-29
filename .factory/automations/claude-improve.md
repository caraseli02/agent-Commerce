# Claude improve lane

The claude-routine follows this file from step 4.4 when nothing labeled is buildable and the improve slot is free. Instead of a report-only night-lane run, Claude finds **one** small, high-value improvement to the app, opens an issue for it, claims it, and builds it like any other claim. Codex reviews the PR and Vlad merges, exactly as for `agent:claude` work (Vlad, 2026-10-21). Settings live under `claude-routine.improve` in `.factory/factory.yaml`. The run already holds the run lock; when this file is done, return to step 6 (**Finish**) of `.factory/automations/claude-routine.md`.

## 1. When it runs

All of these hold, otherwise continue at the **Night lane** (step 4.3):

- `improve.enabled` is `true` and `claude-routine.mode` is `build`;
- no Claude claim is live or waiting (step 2), and fewer than `budgets.max_pass_queue` claims are queued;
- step 4.1 found no eligible `agent:claude` issue (labeled work always comes first);
- fewer than `improve.max_open` open issues carry both `agent:claude-self` and `in-progress` (parked ones included).

`node scripts/owner-attention.mjs route` prints `"route":"improve"` exactly in this case.

## 2. Pick the focus

1. **Area:** the first of `improve.areas` with no `"action":"improve"` journal line, otherwise the one whose newest `improve` line is oldest.
2. **Surface:** within that area, the least recently used of `improve.surfaces`: the first surface with no improve line in that area, otherwise the one whose newest improve line in that area is oldest. This wraps after a full rotation, so a choice always exists.

| Area          | What to look for                                                                                                     | Repo skills to apply (`.agents/skills/`)           |
| ------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `ui-a11y`     | contrast, focus order and rings, accessible names, hit targets, spacing and alignment drift, dark mode, mobile width | `audit`, `polish`, `critique`                      |
| `ux-flow`     | missing loading, empty or error states, confusing feedback after an action, dead ends, unclear copy in a flow        | `critique`, `clarify`, `polish`                    |
| `logic`       | edge cases and incorrect behavior, unhandled errors, dead code, a composable doing too much, missing focused tests   | `diagnosing-bugs`, `improve-codebase-architecture` |
| `performance` | avoidable client work, oversized images or chunks, waterfalls, hydration cost on the surface's route                 | `optimize`                                         |

Follow `CONTEXT.md` § API access and the architecture shortcuts in `CLAUDE.md`; an improvement never introduces a pattern they forbid.

## 3. Audit one surface and choose one finding

Work at `origin/main`. Read the surface's pages, components and composables, and the `docs/solutions/` entries whose files overlap. For `ui-a11y`, `ux-flow` and `performance`, collect runtime evidence through the owned server (`claude-maintenance.md` §6.1; for screenshots use the `verify-ui-change` skill against it at 375 and 1280 px). List candidate findings, then choose the **single** one with the best user value for its size that passes every check:

- the change fits `improve.max_files` and `improve.max_diff_lines` (shared ledger files excluded) and only touches `improve.allowed_paths`;
- it touches nothing in `protected_paths`, nothing in `improve.excluded` (payment, checkout, Stripe, refund and migration code; dependency changes; new features; brand or legal copy);
- it is a fix or refinement of existing behavior a reviewer can verify from evidence, not a matter of taste;
- **not a duplicate:** no open or closed issue carries its key (§4), no open issue already describes it (search titles and bodies for the component or route), and no open PR changes its files (the busy-files rule of step 4.1).

A finding that is real but too big, excluded or a product decision is not built: file it once as a `needs-triage` issue titled `Improvement idea: <summary>` with the same key marker and evidence, journal it, and stop. When nothing qualifies, journal `action: "improve"`, `result: "none"` and continue at the **Night lane** in the same run.

## 4. Open and claim the issue

Key: `<area>:<surface>:<slug>`, where the slug names the finding in a few kebab-case words (for example `ui-a11y:cart:quantity-buttons-accessible-name`). Deduplicate exactly as the night lane does (`claude-maintenance.md` §6.2, `contains` on open **and** closed issues), with the marker `<!-- claude-improve: <key> -->`. A closed issue with the key means Vlad already merged or rejected it: never retry it.

Write the body to `$TMPDIR/improve-issue.md`, then `gh issue create --repo caraseli02/agent-Commerce --title "Improve: <short summary>" --label agent:claude-self --label in-progress --body-file "$TMPDIR/improve-issue.md"`:

```md
<!-- claude-improve: <key> -->

**Problem:** what a shopper or admin experiences today, on which route and viewport.
**Evidence:** screenshot paths, command outcomes or file:line references from the audit.
**Change:** the smallest fix, in one or two sentences.

## Acceptance criteria

- [ ] observable behavior after the fix
- [ ] focused test or parity/visual evidence that proves it

**Files** (one path per line; the overlap check reads this list)

    app/components/...

Self-started by the claude-routine improve lane. Codex reviews the PR and Vlad merges or closes it; closing the PR unmerged retires this idea.
```

Then assign the working account and comment `Claimed by claude-routine on branch claude/issue-<number>` with the sprint contract (`session-lifecycle.md` §2), and create the branch as step 4.1 item 3 describes. This issue is now Claude's **live claim**: from here on it follows the routine unchanged (step 4.2 to build and open the PR, step 2 for conflicts, repairs and queueing). Continue with step 4.2 in the same run when at least half of `night_lane.budget_minutes` remains; otherwise stop, and the next run resumes it through step 2.

## 5. Size guard during the build

Before opening the PR, measure `git diff --stat origin/main...HEAD` without the shared ledger files. When it exceeds `improve.max_files` or `improve.max_diff_lines`, or the work turns out to need an excluded or protected path, do not open a PR: push what is done, comment on the issue why it outgrew the lane, remove `in-progress` and add `needs-triage` so Vlad decides, and stop.

## 6. Closed without merge

A self-started claim whose canonical PR Vlad closed unmerged is **released**, not parked (this replaces step 2's closed-without-merge route for `agent:claude-self` issues): comment `Improvement declined; claude-routine will not retry <key>.`, remove `in-progress` and unassign. Leave the issue open for Vlad to close; its key keeps dedup from proposing the idea again. Never close it or delete its branch.

## 7. Limits

Everything in step 5 (**Never**) of the routine applies. In addition, the improve lane:

- adds `agent:claude-self` only to issues it creates in §3–§4, never to any other issue, and never adds `agent:claude`;
- holds at most `improve.max_open` self-started claims and at most one new issue (§3 or §4) per run;
- never edits files outside `improve.allowed_paths` or the shared ledger files, even when the guard would allow it.

## 8. Journal

Return to the routine's step 6 with `action: "improve"`, `area`, `surface`, `key`, `issue`, `result` (`claimed`, `proposed` for a `needs-triage` idea, or `none`), `pr` when step 4.2 opened one in the same run, `verification` and `stop_reason` (for example `improve: claimed #770 ui-a11y:cart:quantity-buttons-accessible-name`).
