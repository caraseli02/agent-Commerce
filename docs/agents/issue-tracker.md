# Issue tracker

ECAS uses **GitHub Issues** as the task queue for autonomous work.

## Pickup rules

- Only issues with the `ready-for-agent` label are eligible.
- Before editing code, claim the issue:
  - add the `in-progress` label
  - assign the issue to the working account
  - leave a short comment with the branch name
- If an issue is already assigned or already has an active PR, skip it.
- WIP is 1: never work two issues in parallel.

## Why this matters

This repo uses issues as the shared source of truth so the agent does not duplicate work or drift across tasks.

## Suggested issue body

Each issue should include:
- problem statement
- acceptance criteria
- verification command
- notes about mock/live mode if relevant

## Claim comment example

`Claimed by ECAS loop on branch feat/123-short-slug`
