# Harness audit — Learn Harness Engineering coverage

This file maps ECAS repo artifacts to the course recommendations from Learn Harness Engineering.

## Current coverage

| Course area                              | ECAS artifact                                                                                         | Status                              |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------- |
| L01 — strong models still need harnesses | `AGENTS.md` + executable verification commands                                                        | Covered                             |
| L02 — 5-subsystem harness                | instructions, environment, state, feedback, issue tools                                               | Covered                             |
| L03 — repo as source of truth            | `AGENTS.md`, `CONTEXT.md`, `PROGRESS.md`, `DECISIONS.md`, `feature_list.json`                         | Covered                             |
| L04 — router docs, not giant prompt      | compact `AGENTS.md` with linked topic docs                                                            | Covered                             |
| L05 — continuity across sessions         | `PROGRESS.md`, `DECISIONS.md`, `docs/agents/session-lifecycle.md`                                     | Covered                             |
| L06 — initialization phase               | `init.sh`, `docs/agents/session-lifecycle.md`                                                         | Covered                             |
| L07 — WIP=1 and task boundaries          | GitHub issue claim rules + `feature_list.json` policy                                                 | Covered                             |
| L08 — feature lists as primitives        | `feature_list.json` with status/evidence rules                                                        | Covered                             |
| L09 — no premature victory               | `docs/agents/verification.md` done gates                                                              | Covered                             |
| L10 — full-pipeline verification         | build/lint/typecheck/test plus browser/runtime smoke path                                             | Covered                             |
| L11 — observability inside harness       | sprint contract, task trace, PR evidence checklist                                                    | Covered                             |
| L12 — clean handoff                      | clean-state checklist in `docs/agents/session-lifecycle.md`                                           | Covered                             |
| Projects 01–06                           | baseline harness, readable workspace, continuity, feedback, review, capstone                          | Covered as a practical repo harness |
| Resource templates                       | `AGENTS.md`, `CLAUDE.md`, `feature_list.json`, progress, init, handoff, clean-state, evaluator rubric | Covered/adapted                     |

## Remaining watch points

These are not blockers, but should be revisited when the repo grows:

1. **E2E depth** — browser smoke checks are required, but the repo does not yet have a dedicated Playwright/Cypress suite.
2. **Mechanical feature-list enforcement** — `feature_list.json` is documented as source of truth, but there is no validator script yet.
3. **Telemetry depth** — runtime logs and PR evidence are required, but no app-level tracing stack exists.
4. **Baseline debt** — current `main` passes `pnpm build` and `pnpm test`, but `pnpm lint` and `pnpm typecheck` fail on pre-existing issues recorded in `PROGRESS.md`.
5. **Issue loop model quality** — local model workers should stay on tiny tasks; cloud model escalation remains appropriate for broad diagnosis/review.

## Rule for future updates

When an agent discovers a repeated failure mode, do not keep adding rules to `AGENTS.md`. Add or update the focused topic doc that owns the failure mode, then link it from `AGENTS.md` only if the routing rule is globally useful.
