# Issue tracker

ECAS uses **GitHub Issues** as the task queue for autonomous work.

## Pickup rules

### PM / human role
- Choose one scoped issue from `ready-for-agent`.
- Claim it by adding `in-progress` and assigning it.
- Leave a short comment with the branch name.
- Do not queue a second issue until the first one is done.

### Local worker role
- Only work issues that are already assigned and labeled `in-progress`.
- Never choose your own issue from the queue.
- If the assigned issue is missing or already closed, stop and report idle.
- If an issue already has an active PR, skip it.
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
