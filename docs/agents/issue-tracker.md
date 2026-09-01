# Issue tracker: GitHub

Issues and PRDs for this repo live as GitHub issues in `caraseli02/agent-Commerce`. Use the `gh` CLI for all operations.

## Conventions

- **Create an issue**: `gh issue create --title "..." --body "..."`. Use a heredoc for multi-line bodies.
- **Read an issue**: `gh issue view <number> --comments`
- **List issues**: `gh issue list --state open --json number,title,body,labels,comments` with appropriate `--label` and `--state` filters.
- **Comment on an issue**: `gh issue comment <number> --body "..."`
- **Apply / remove labels**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Close**: `gh issue close <number> --comment "..."`

`gh` infers the repo from `git remote` when run inside this clone.

## Pickup rules

- The controller loop should behave like a standing `/goal`: keep one issue alive until evaluator pass, blocker, or human intervention.
- Only issues with the `ready-for-agent` label are eligible for planner pickup.
- Before editing code, the planner claims exactly one issue:
  - remove `ready-for-agent`
  - add the `in-progress` label
  - assign the issue to the working account
  - leave a short comment with the branch name
- If an issue is already assigned or already has an active PR, skip it.
- WIP is 1: never work two issues in parallel.
- The generator may only implement the issue already claimed by the planner.
- The generator opens or updates a PR, but does not declare final completion.
- If an `in-progress` issue has an open PR, do not select new work. Wait for evaluator, or repair that same PR when the evaluator fails it.
- The evaluator independently checks the PR and moves the issue toward `ready-for-human` only after evidence passes.

## When a skill says "publish to the issue tracker"

Create a GitHub issue.

## When a skill says "fetch the relevant ticket"

Run `gh issue view <number> --comments`.

## Suggested issue body

Each issue should include:

- problem statement
- acceptance criteria
- verification command
- evaluator expectations: evidence the evaluator must check before marking review-ready
- notes about mock/live mode if relevant

## PR body requirement

Every generator PR should include:

- Related issue and `Closes #<issue>`
- Verification evidence from local pre-flight checks, including exact command outcomes
- Runtime/browser evidence when UI, route, auth, cart, checkout, mock API, or state flow changed, with links or paths to the exact proof
- Risks, known failures, or explicit `none`

If a PR uses temporary evidence artifacts during review, the PR body should say where they live and whether they will be removed before merge.

The evaluator report is separate from the generator PR body and should use `docs/agents/autonomous-workflow.md`.

## Claim comment example

`Claimed by agent-Commerce loop on branch feat/123-short-slug`
