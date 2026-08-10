# Modern loop-engineering audit

_Research date: 2026-08-10. Sources are first-party Anthropic, OpenAI, and GitHub documentation. Repository comparison covers `AGENTS.md`, `docs/agents/autonomous-workflow.md`, `docs/research/claude-dreams.md`, and the current `scripts/ecas-loop-controller.mjs` family._

## Verdict

ECAS is **directionally correct but operationally overbuilt for its present scale**. The valuable modern pattern is small and recognizable: one scoped work item, an agent that edits and verifies, deterministic CI, an independent evaluator or human gate, bounded retry, and a separate candidate-only learning pass. ECAS has those boundaries, but currently implements them through a 995-line controller, six PR-comment marker formats, a 60-second repository-wide poll, three substantially duplicated repair paths, and roughly 730 lines of custom event-ledger/validation code.

That complexity is not required by the cited guidance. Anthropic explicitly recommends the simplest solution possible and adding complexity only when it demonstrably improves outcomes. OpenAI describes the basic agent loop as model → tools → result until final output or a turn limit; its own harness guidance emphasizes legible feedback loops and repository invariants, not a bespoke state machine for every signal. [Anthropic: Building effective agents](https://www.anthropic.com/engineering/building-effective-agents), [OpenAI Agents SDK: running agents](https://openai.github.io/openai-agents-python/running_agents/), [OpenAI: Harness engineering](https://openai.com/index/harness-engineering/)

## Comparison

| Concern                  | Current ECAS design                                                                                                                  | Evidence-based recommendation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Core loop                | Separate evaluator, repair, review-repair, and CI-repair paths, coordinated through GitHub comment markers                           | **Keep the separation, simplify the machinery.** Use one table-driven repair runner with `source_kind`, `source_id`, `head_sha`, and one terminal state. Independent evaluation is appropriate when the result has objective criteria; Anthropic calls this an evaluator-optimizer pattern, while also warning to add complexity only when it improves measured outcomes. [Anthropic](https://www.anthropic.com/engineering/building-effective-agents)                                                                                                                                                                                                                                                                                                                            |
| CI and review triggers   | LaunchAgent polls all open PRs every 60 seconds and repeatedly scans comments, reviews, checks, and labels                           | **Replace with events.** GitHub recommends webhooks instead of API polling, subscribing only to needed events, checking event/action, and deduplicating with `X-GitHub-Delivery`. GitHub Actions already exposes `workflow_run`, `pull_request_review`, `pull_request_review_comment`, and `issue_comment`. Use one event payload as the queue item; keep a slower reconciliation poll only as recovery. [GitHub REST best practices](https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api), [GitHub webhook best practices](https://docs.github.com/en/webhooks/using-webhooks/best-practices-for-using-webhooks), [GitHub Actions events](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows) |
| Comment classification   | Trusted top-level comments can trigger from a broad action-word regex                                                                | **Require an explicit command for free-form comments**, such as `@codex fix` or `/repair`. Continue to accept formal `CHANGES_REQUESTED`, inline review comments, and known Qodo findings. This removes false-positive classifier complexity while preserving the user's stated PR-comment automation goal.                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| WIP, staleness, retry    | WIP=1, current-head SHA checks, fresh-run lease, two focused attempts, human final gate                                              | **Keep.** A turn/retry ceiling and human handoff after failure are standard safeguards. OpenAI recommends maximum-turn exit conditions and human intervention after failure thresholds; GitHub concurrency can cancel stale in-progress work for a newer head. [OpenAI practical guide](https://openai.com/business/guides-and-resources/a-practical-guide-to-building-ai-agents/), [OpenAI Agents SDK](https://openai.github.io/openai-agents-python/running_agents/), [GitHub Actions concurrency](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency)                                                                                                                                                           |
| Workflow state           | GitHub labels/comments, `PROGRESS.md`, and `feature_list.json` all mirror active state                                               | **Choose one runtime source of truth: GitHub.** Keep repository docs for durable instructions and decisions, not duplicate live queue state. OpenAI's harness guidance recommends a short `AGENTS.md` as a map into structured repository knowledge and mechanically enforced invariants. [OpenAI: Harness engineering](https://openai.com/index/harness-engineering/)                                                                                                                                                                                                                                                                                                                                                                                                            |
| Observability and ledger | Raw Codex JSONL, a second normalized JSONL ledger, a 499-line validator, and an extra accountability evaluator for terminal failures | **Retain raw traces plus a small run summary; remove mandatory per-action re-validation from the default path.** OpenAI's SDK tracing already models a run as traces/spans for generations, tools, guardrails, handoffs, timestamps, and usage, and warns that payloads may be sensitive. A summary needs only run/event ID, PR/head, actor, start/end, token usage, result, verification links, and trace path. [OpenAI Agents SDK tracing](https://openai.github.io/openai-agents-js/guides/tracing/)                                                                                                                                                                                                                                                                           |
| Learning / “dreaming”    | Weekly candidate-only automation; immutable evidence; no direct policy edits                                                         | **Keep the candidate boundary, trigger by evidence threshold.** Dreams reads sessions and a memory store, produces a separate output, and lets a reviewer adopt or discard it; it is synthesis, not a source editor. Run after enough evidence exists—for example 10 completed PR loops or 5 related failures—with a monthly fallback, rather than generating a weekly empty/noisy reflection. [Anthropic Dreams](https://platform.claude.com/docs/en/managed-agents/dreams)                                                                                                                                                                                                                                                                                                      |

## Minimal target architecture

```text
GitHub event (CI failure / explicit review request)
  -> dedupe by delivery ID + current head SHA
  -> one bounded repair agent in an isolated worktree
  -> CI
  -> one independent evaluator
  -> ready-for-human OR one retry OR blocked

Completed run summaries
  -> threshold/monthly synthesis
  -> candidate issue
  -> human promotion into tests, docs, or tooling
```

The controller should coordinate this flow, not become a second workflow platform. GitHub owns event delivery and PR state; Codex owns the open-ended repair; CI owns deterministic acceptance checks; the evaluator owns issue-level assessment; the human owns merge and learned-policy promotion.

## Keep / simplify / remove

### Keep

- WIP=1 and exact current-head binding.
- Isolated worktrees and explicit denied destructive/merge actions.
- Two-attempt ceiling, blocker escalation, and human merge gate.
- Deterministic `pnpm verify`/PR-contract checks.
- Independent final evaluator where acceptance is objective.
- Candidate-only dreaming with evidence provenance and no self-promotion.

### Simplify now

- Collapse CI, review, and evaluator-failure repair into one generic dispatch pipeline with source-specific prompt fragments.
- Replace marker parsing with one small state record keyed by `{delivery/source ID, head SHA}`; PR comments should be human-readable status, not the database.
- Make formal GitHub events and explicit `@codex fix` the only repair triggers.
- Store one compact run summary and retain the raw Codex trace for debugging.
- Treat GitHub labels/PR state as the sole live queue; stop mirroring transient state across three stores.
- Run learning synthesis only when enough completed evidence has accumulated.

### Remove from the default path

- The 60-second full-repository poll and repeated auth checks. Use event wakeups plus a low-frequency recovery reconciliation.
- Automatic interpretation of ordinary top-level prose as a repair command.
- The independent “accountability evaluator” after every failed/blocked repair.
- Full ordered file/command ledger validation for this low-risk portfolio repository.

A durable, independently validated action ledger becomes justified when the loop can merge/deploy autonomously, handle money or customer data, cross security boundaries, satisfy an audit/compliance obligation, coordinate many concurrent workers, or incur material metered spend. ECAS currently has a single-repository WIP limit and a human merge gate, so raw traces plus compact summaries provide proportionate accountability.

## Recommended next move

Do not add another repair feature to the present controller. First make a simplification PR with one measurable target: **reduce the controller and accountability path by at least half while preserving current-head idempotency, two-attempt blocking, CI gating, evaluator independence, and human merge control**. Run it in observe-only mode beside the current hook for several real PRs, then switch over after it handles CI failure and explicit PR-review repair without duplicate runs.
