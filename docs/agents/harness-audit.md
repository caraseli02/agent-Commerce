# Harness audit — Learn Harness Engineering coverage

This file maps Components Marketplace repo artifacts to the course recommendations from Learn Harness Engineering.

## Current coverage

| Course area                              | Components Marketplace artifact                                                                       | Status                              |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------- |
| L01 — strong models still need harnesses | `AGENTS.md` + executable verification commands                                                        | Covered                             |
| L02 — 5-subsystem harness                | instructions, environment, state, feedback, issue tools                                               | Covered                             |
| L03 — repo as source of truth            | `AGENTS.md`, `CONTEXT.md`, `PROGRESS.md`, `DECISIONS.md`, `feature_list.json`                         | Covered                             |
| L04 — router docs, not giant prompt      | compact `AGENTS.md` with linked topic docs                                                            | Covered                             |
| L05 — continuity across sessions         | `PROGRESS.md`, `DECISIONS.md`, `docs/agents/session-lifecycle.md`                                     | Covered                             |
| L06 — initialization phase               | `init.sh`, `docs/agents/session-lifecycle.md`                                                         | Covered                             |
| L07 — WIP=1 and task boundaries          | GitHub issue claim rules + `feature_list.json` policy                                                 | Covered                             |
| L08 — feature lists as primitives        | `feature_list.json` with status/evidence rules                                                        | Covered                             |
| L09 — no premature victory               | `docs/agents/verification.md` done gates + `docs/agents/autonomous-workflow.md` role separation       | Covered                             |
| L10 — full-pipeline verification         | fast default gate plus explicit full/handoff gates for architecture, smoke, and clean state           | Covered                             |
| L11 — observability inside harness       | sprint contract, task trace, PR evidence checklist, evaluator verdict format                          | Covered                             |
| L12 — clean handoff                      | clean-state checklist in `docs/agents/session-lifecycle.md`                                           | Covered                             |
| Projects 01–06                           | baseline harness, readable workspace, continuity, feedback, review, capstone                          | Covered as a practical repo harness |
| Resource templates                       | `AGENTS.md`, `CLAUDE.md`, `feature_list.json`, progress, init, handoff, clean-state, evaluator rubric | Covered/adapted                     |

## Remaining watch points

These are not blockers, but should be revisited when the repo grows:

1. **Gate weight** — keep `pnpm verify` fast enough for normal loops; reserve `pnpm verify:full` and `pnpm verify:handoff` for runtime-sensitive work and final handoff.
2. **Runtime smoke depth** — `pnpm smoke` checks representative static routes, but auth/cart/checkout/dashboard changes still need targeted runtime evidence.
3. **Telemetry depth** — runtime logs and PR evidence are required, but no app-level tracing stack exists.
4. **Source-of-truth hygiene** — GitHub Issues are the primary work tracker; `PROGRESS.md` must stay current as the short session mirror and should not drift behind merged PRs.
5. **Issue loop model quality** — local model workers should stay on tiny tasks; cloud model escalation remains appropriate for broad diagnosis/review.
6. **UI design-system consistency** — static gates do not detect native HTML vs shadcn usage; evaluators must apply the UI checklist in `docs/agents/verification.md`. Legacy modals still mix patterns; new modal work should prefer shadcn.
7. **CI/pre-push parity** — CI now runs `pnpm verify`; pre-push still runs build/lint/typecheck/test only. Align hooks when hook latency is acceptable.

## Rule for future updates

When an agent discovers a repeated failure mode, do not keep adding rules to `AGENTS.md`. Add or update the focused topic doc that owns the failure mode, then link it from `AGENTS.md` only if the routing rule is globally useful.
