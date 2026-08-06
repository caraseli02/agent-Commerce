# Domain docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

ECAS is a **single-context** repo.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root
- **`docs/buyer-flow-design-contract.md`** — Buyer Flow design contract (problem, scope, use cases, shall-style requirements)
- **`docs/buyer-flow-architecture.md`** — Buyer Flow as-built architecture (layers, routes, mock boundary, observations)
- **`docs/adr/`** — read ADRs that touch the area you're about to work in
- **`AGENTS.md`** — harness/router for autonomous loops
- **`PROGRESS.md`** — current focus and verification baseline
- **`DECISIONS.md`** — durable cross-session choices
- **`feature_list.json`** — machine-readable work state

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The producer skill (`/grill-with-docs`) creates them lazily when terms or decisions actually get resolved.

## File structure

```
/
├── CONTEXT.md
├── docs/buyer-flow-design-contract.md    ← Buyer Flow design contract
├── docs/buyer-flow-architecture.md       ← Buyer Flow as-built architecture
├── docs/adr/                          ← architectural decisions (add as needed)
├── DECISIONS.md
├── PROGRESS.md
└── feature_list.json
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/grill-with-docs`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (event-sourced orders) — but worth reopening because…_
