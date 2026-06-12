# Issue tracker: GitHub

Issues and PRDs for this repo live as GitHub issues in `caraseli02/Ecas`. Use the `gh` CLI for all operations.

## Conventions

- **Create an issue**: `gh issue create --title "..." --body "..."`. Use a heredoc for multi-line bodies.
- **Read an issue**: `gh issue view <number> --comments`
- **List issues**: `gh issue list --state open --json number,title,body,labels,comments` with appropriate `--label` and `--state` filters.
- **Comment on an issue**: `gh issue comment <number> --body "..."`
- **Apply / remove labels**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Close**: `gh issue close <number> --comment "..."`

`gh` infers the repo from `git remote` when run inside this clone.

## Pickup rules

- Only issues with the `ready-for-agent` label are eligible.
- Before editing code, claim the issue:
  - add the `in-progress` label
  - assign the issue to the working account
  - leave a short comment with the branch name
- If an issue is already assigned or already has an active PR, skip it.
- WIP is 1: never work two issues in parallel.

## When a skill says "publish to the issue tracker"

Create a GitHub issue.

## When a skill says "fetch the relevant ticket"

Run `gh issue view <number> --comments`.

## Suggested issue body

Each issue should include:

- problem statement
- acceptance criteria
- verification command
- notes about mock/live mode if relevant

## Claim comment example

`Claimed by ECAS loop on branch feat/123-short-slug`
