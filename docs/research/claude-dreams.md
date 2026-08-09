# Claude Dreams: patterns for a loop-engineering harness

_Research date: 2026-08-09. Scope: first-party Anthropic documentation only. Dreams is a research-preview feature, so the API details below may change._

## Executive summary

Claude Dreams is a **memory curation pipeline**, not another ordinary work session. It reads an existing memory store plus 1–100 past session transcripts, then creates a **separate** reorganized memory store in which duplicated knowledge is merged, stale or contradicted material is replaced, and cross-session insights can be surfaced. The source store is never modified, so the synthesized result can be reviewed, adopted, archived, or deleted independently. [Anthropic: Dreams](https://platform.claude.com/docs/en/managed-agents/dreams)

The most useful idea for a loop-engineering harness is therefore not “let an agent think overnight.” It is a controlled knowledge-compilation cycle:

1. Preserve immutable evidence from ordinary execution loops.
2. Periodically synthesize repeated failures, successful repairs, user corrections, and evaluator feedback into a candidate knowledge set.
3. Evaluate that candidate separately from the agent that produced it.
4. Promote only verified lessons into the harness; retain the source evidence and a rollback path.

For CI failures and PR review comments, this means learning reusable classifiers, repair playbooks, routing rules, and escalation thresholds from the history of completed loops—not blindly replaying the last fix.

## What Dreams actually does

### Inputs and output

A dream is an asynchronous job with two required input classes:

- one pre-existing memory store, which provides the knowledge base to verify and reorganize; and
- 1–100 session transcripts, which provide episodic evidence from which to find patterns and new insights.

The output is another ordinary memory store. It is distinct from the input store and becomes available in `outputs[]` after the workflow clones the source. A running job may briefly have an empty `outputs[]`. [Anthropic: Dreams — how it works](https://platform.claude.com/docs/en/managed-agents/dreams#how-it-works)

This establishes a useful separation:

- **sessions are evidence** of what happened;
- **the current memory store is the prior knowledge state**; and
- **the output store is a candidate next knowledge state**.

### Synthesis, not line editing

An optional `instructions` field steers what the pipeline reads closely, merges, drops, preserves, and how it structures the output. Anthropic explicitly describes this as high-level synthesis rather than deterministic editing of particular lines. Targeted corrections should be applied to the output memory through the Memory Stores API afterward. [Anthropic: Dreams — steer with instructions](https://platform.claude.com/docs/en/managed-agents/dreams#steer-with-instructions)

For a harness, the reflection prompt should consequently express durable questions such as:

- Which CI failures recurred, and which diagnosis/fix reliably resolved each fingerprint?
- Which PR comments reflect a stable repository convention versus a one-off reviewer preference?
- Which agent behaviors repeatedly required user correction?
- Which checks would have caught a failure earlier?
- Which existing rule is now contradicted by stronger, newer evidence?

It should not ask the synthesis job to make exact source-code or policy-file edits.

## Lifecycle and observability

Dreams expose an explicit job state machine:

| State | Meaning | Harness analogue |
| --- | --- | --- |
| `pending` | Accepted and queued | Reflection run recorded but not started |
| `running` | Processing; usage updates | Synthesis in progress and observable |
| `completed` | Output store fully populated | Candidate learning ready for evaluation |
| `failed` | Pipeline failed; partial output remains | Quarantine partial candidate and diagnose |
| `canceled` | Run canceled; partial output remains | Preserve evidence, never auto-promote |

The underlying pipeline has its own session ID once running. Its event stream can be watched to see what is read and written, and the pipeline session is archived rather than deleted after termination, preserving its transcript. [Anthropic: Dreams — lifecycle and pipeline](https://platform.claude.com/docs/en/managed-agents/dreams#lifecycle)

Cancellation is supported only from active states; terminal runs can instead be archived. Archiving changes discoverability, not job status, and does not alter the output memory store. [Anthropic: Dreams — cancel and archive](https://platform.claude.com/docs/en/managed-agents/dreams#cancel-a-dream)

The transferable pattern is to make reflection a first-class run with:

- a durable run ID;
- fixed input session/evidence IDs;
- a status and timestamps;
- captured token/cost usage;
- an inspectable event log;
- an output candidate ID;
- a terminal verdict and promotion decision.

## Safety and integrity guardrails

### Never mutate trusted input during reflection

Dreams never delete or modify their inputs. On failure or cancellation, the partially populated output remains separately inspectable. Input stores or sessions removed during execution cause typed failures such as `input_memory_store_unavailable` and `input_session_unavailable`. Other documented failure classes include timeout, internal error, storage-cap exhaustion, and oversized input. [Anthropic: Dreams — output and errors](https://platform.claude.com/docs/en/managed-agents/dreams#errors)

The harness equivalent should synthesize into a new candidate artifact or branch. It should never rewrite `AGENTS.md`, verification commands, CI workflows, or repair playbooks in place. Promotion should be a separate, reviewable operation.

### Keep provenance and rollback

Memory stores create an immutable version on every mutation, providing audit history and point-in-time recovery. Their API also supports optimistic concurrency through a content-hash precondition, so a stale writer cannot silently overwrite newer knowledge. [Anthropic: memory versions and safe edits](https://platform.claude.com/docs/en/managed-agents/memory#safe-content-edits-optimistic-concurrency)

Every promoted harness lesson should therefore retain:

- the sessions, CI runs, PR threads, and commits that support it;
- the prior and candidate policy versions;
- the evaluator result;
- who or what approved promotion; and
- a deterministic rollback path.

### Separate trust and write access

Anthropic warns that read-write memory exposed to untrusted prompts, fetched web content, or third-party tool output can persist prompt injection that later sessions treat as trusted memory. It recommends read-only access when the agent does not need to write and separate stores for material with different owners, access rules, or lifecycles. [Anthropic: memory-store access safety](https://platform.claude.com/docs/en/managed-agents/memory#attach-a-memory-store-to-a-session)

Applied to loop engineering:

- raw CI logs, issue text, and PR comments are **untrusted evidence**;
- curated repository rules are **trusted policy**;
- generated lessons are **candidate policy** until evaluated;
- the execution agent should generally read trusted policy but should not directly promote into it.

### Bound scope and cost

Anthropic recommends starting with a small batch because Dream cost scales roughly with the number and length of session transcripts. Managed-agent sessions also support hard per-session list-cost ceilings; when reached, work pauses rather than being destroyed, preserving state for inspection or resumption. [Anthropic: Dreams billing and limits](https://platform.claude.com/docs/en/managed-agents/dreams#billing), [Anthropic: session budgets](https://platform.claude.com/docs/en/managed-agents/budgets)

A local harness should likewise bound each reflection by evidence count, elapsed time, retries, or token budget and resume from durable state rather than starting over.

## Adjacent managed-agent patterns that strengthen the design

### Independent evaluation

Managed-agent “outcomes” provision a grader with a separate context window. The grader evaluates the artifact against a required rubric and sends criterion-level feedback to the working agent for another iteration. The explicit purpose of the separate context is to avoid influence from the implementation agent’s choices. Iteration is bounded (`max_iterations`, default 3 and maximum 20 in the documented API). [Anthropic: Define outcomes](https://platform.claude.com/docs/en/managed-agents/define-outcomes)

The loop harness should mirror this separation: the process that proposes a learned CI/PR rule must not be the sole process that approves it. A candidate lesson should pass a rubric such as:

- supported by more than one occurrence, unless a single incident is severe and deterministic;
- identifies a stable failure fingerprint;
- gives a reproducible diagnosis and bounded repair;
- does not weaken tests, permissions, or branch protections;
- distinguishes repository-specific convention from general advice;
- defines when to escalate instead of retrying;
- includes a verification proving the repair worked.

### Scheduled but inspectable operation

Scheduled deployments create autonomous sessions on cron schedules, record run history, require an initial message or defined outcome, and may apply a separate budget to every run. Schedules can be paused, and actual execution may be jittered. [Anthropic: Scheduled deployments](https://platform.claude.com/docs/en/managed-agents/scheduled-deployments)

This supports using reflection either on a cadence or on thresholds—for example after ten completed issue loops, five CI-repair loops, or a release—not after every action. The important property is that each run remains independently inspectable and budgeted.

## Concrete implications for CI and PR automation

### CI-error learning loop

Capture each CI incident as structured evidence:

`check + environment + normalized error fingerprint + first failing command + suspected cause + attempted fixes + final patch + verification + recurrence`.

The reflection job should group fingerprints, discard accidental noise, identify successful repair patterns, and produce candidate entries for an error taxonomy and repair playbook. Promotion should require replaying the narrowest reproducer plus the repository’s verification gate. Unknown, nondeterministic, security-sensitive, or repeatedly failing cases should be escalated rather than generalized.

This changes automation from “keep asking an agent to fix CI” to “recognize known failure classes, apply a bounded verified repair, and learn only from evidence that survived review.”

### PR-comment and review learning loop

Capture each review thread as:

`comment source + affected code + category + requested change + agent response + resulting diff + CI result + resolved/dismissed state + follow-up comments`.

Reflection can then separate:

- actionable recurring conventions worth encoding in repository guidance or lint/tests;
- one-off code-specific feedback that belongs only in the PR;
- false positives or rejected suggestions;
- recurring misses that should become pre-PR checks; and
- comments requiring human product or architecture decisions.

Candidates should never be promoted merely because a comment exists or was mechanically resolved. The acceptance signal is the completed thread plus verification and, where applicable, reviewer approval.

## Recommended architecture pattern

```text
execution sessions / CI runs / PR threads
                  |
                  v
        immutable evidence ledger
                  |
        threshold or scheduled trigger
                  |
                  v
          reflection/synthesis run
                  |
                  v
       candidate learned knowledge
                  |
          independent rubric grader
            /                 \
      revise/quarantine      promote
                                 |
                                 v
          versioned trusted harness knowledge
```

The core guardrail is the boundary between **candidate** and **trusted** knowledge. Dreams provides the conceptual model—separate inputs and outputs, inspectable asynchronous state, preserved partial results, and optional adoption—while outcomes, memory versioning, scoped access, and budgets supply the evaluation and operational controls needed to make that model safe for an autonomous engineering loop.

## Sources

- [Anthropic Claude Platform: Dreams](https://platform.claude.com/docs/en/managed-agents/dreams)
- [Anthropic Claude Platform: Using agent memory](https://platform.claude.com/docs/en/managed-agents/memory)
- [Anthropic Claude Platform: Define outcomes](https://platform.claude.com/docs/en/managed-agents/define-outcomes)
- [Anthropic Claude Platform: Session budgets](https://platform.claude.com/docs/en/managed-agents/budgets)
- [Anthropic Claude Platform: Scheduled deployments](https://platform.claude.com/docs/en/managed-agents/scheduled-deployments)
