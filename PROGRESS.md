# PROGRESS

## Current focus

- Issue [#603](https://github.com/caraseli02/agent-Commerce/issues/603) (epic #595), branch `claude/603-auto-merge-low-risk`. This is the sole active task: auto-merge low-risk PRs on green CI plus evaluator PASS. This PR touches `.github/**` and `scripts/**`, so it needs a human merge.

## In progress

- The policy module, runner, workflow, tests and docs are in place. The workflow does nothing until the owner completes the setup steps in `docs/agents/auto-merge.md`: the Evaluator and Merger Apps, the `auto-merge` environment, the ruleset and the variables. #583 / PR #590 is merged.

## Blocked / known baseline failures

#597 (the evaluator "did not run" outcome) is not done yet. The workflow treats any non-success `evaluator/verdict`, or a missing one, as no merge, so #597 can land afterwards without changes here. No application, payment or schema changes.

## Verification baseline

`pnpm exec vitest run tests/auto-merge-policy.spec.ts` covers the policy, routing, runner and workflow boundary. actionlint passes on `.github/workflows/*.yml`. See the PR for `pnpm verify` and CI on the published head.
