---
name: compound-learning
description: Capture one durable, non-obvious learning from a solved problem into the weekly Learnings inbox, publish approved entries to docs/solutions/, and look up existing learnings before planning or building. Adapted from the ce-compound idea (EveryInc compound-engineering) for this repo's unattended routine.
---

# Compound learning

The code shows what was done; this keeps **why**, so the next plan or build does not rediscover it. Three uses: **capture** (night lane, `claude-maintenance.md` §5), **publish** (an ordinary build of the week's inbox issue) and **look up** (plan-ahead and every build).

## Qualify before writing

Capture only a learning that is all three:

- **Non-obvious:** not recoverable from the code, tests, types, comments or existing docs.
- **Durable:** a root cause, an invariant, a rejected approach or a decision that will still hold next month.
- **Material:** losing it would likely cause the same failure or a costly rediscovery.

Good sources: an evaluator `FAIL` on a Claude PR and the repair that fixed it (what did the reviewer catch that the builder missed?), a `claude-diagnosis` comment, a spike result, a blocker Vlad resolved. Not a learning: a typo, a one-off flake, anything the diff already explains. One learning per night-lane run; a source that does not qualify is still recorded as assessed in the journal.

## Check for overlap

Search `docs/solutions/**/*.md` and the open and recent Learnings inbox entries for the same files, root cause or rule (`git grep -l -i "<file or keyword>" docs/solutions`; read the candidates). A strong overlap (same root cause and same files) becomes an **update** entry naming the existing doc; otherwise a **new** entry. Verify every path, SHA, PR and issue you cite exists (`git cat-file -e <sha>`, `test -e <path>`, `gh pr view <n>`).

## Capture into the Learnings inbox

The inbox is one issue per ISO week, titled `Learnings inbox: <YYYY>-W<ww>`, created without labels when the first entry of the week arrives (`gh issue list --repo caraseli02/agent-Commerce --state open --search "Learnings inbox: <YYYY>-W<ww> in:title"` first). Its body explains: "Tick the entries to publish, then add `agent:claude`; the build writes the ticked ones to `docs/solutions/` in one docs-only PR." Never edit the body or other comments after creating it. Never add an entry to an inbox that carries `agent:claude` or `in-progress` (its publishing build is running); create the next one titled `Learnings inbox: <YYYY>-W<ww> (continued)`.

Each entry is one comment:

```md
<!-- learning: <kebab-slug> kind=<new|update:<docs/solutions path>> -->

- [ ] **Publish:** <one-line rule, phrased as guidance>

**Track:** bug | knowledge
**Context:** source PR/issue/comment links, `origin/main` SHA.
**What happened / the rule:** bug track: symptoms, root cause, what fixed it, what did not work. Knowledge track: the guidance and when it applies.
**Prevention:** the check, test or habit that would have caught it.
**Files:** paths the learning is about (retrieval key).
```

Vlad approves an entry by ticking its box (he edits the comment) or by replying `publish <slug>`.

## Publish (a build of the inbox issue)

When Vlad labels the week's inbox `agent:claude`, the routine builds it like any issue. For each approved entry write or update `docs/solutions/<category>/<slug>-<module>-<YYYYMMDD>.md`, matching the existing files' frontmatter exactly, plus `files`:

```yaml
---
module: <System or area>
date: <YYYY-MM-DD>
problem_type: <logic_error | ui_bug | build_error | runtime_error | workflow>
component: <component or area>
symptoms:
  - '<observable symptom>'
root_cause: <short>
resolution_type: <code_fix | test_fix | config_change | process_change | decision>
severity: <low | medium | high>
tags: [<existing tags first>]
files: [<repo paths>]
---
```

Categories are the existing folders (`logic-errors`, `ui-bugs`, `build-errors`, `runtime-errors`); a knowledge-track learning uses `patterns/`. Body sections: Problem, Root cause, Solution (or Guidance), Prevention, References. Only docs change in that PR; it closes the inbox issue.

## Look up

Before planning (`claude-maintenance.md` §3) or implementing (routine step 4.2), find entries whose `files` or `tags` match the paths you will touch: `git grep -l -E "<path1>|<path2>" docs/solutions`. Read them, follow their Prevention, and link the ones you used in the plan or PR body.
