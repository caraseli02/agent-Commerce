---
status: complete
priority: p2
issue_id: '024'
tags: [code-review, tooling, eslint, prettier, developer-experience]
dependencies: []
---

# Align Prettier indentation with ESLint

## Problem Statement

`npm run lint` previously failed with massive indentation and formatting errors after Prettier rewrote files to 4 spaces while ESLint expected 2 spaces. The formatter and linter now agree on 2-space indentation.

## Findings

- Running `npm run lint` produces a very large number of issues (repo-wide), dominated by indentation rules.
- Example error observed after recent changes: `app.vue` `vue/html-indent` expected 2 spaces but files had been rewritten to 4 spaces.
- Prettier was configured with `tabWidth: 4`.

## Proposed Solutions

### Option 1: Configure ESLint Vue indentation to 4 spaces

**Approach:** Update `vue/html-indent` and `@stylistic/indent` (and related rules) to match 4-space indentation.

**Pros:**

- Consistent with documented style
- Makes `npm run lint` actionable again

**Cons:**

- Requires updating eslint config carefully to avoid regressions

**Effort:** Medium

**Risk:** Medium

---

### Option 2: Make Prettier authoritative and disable conflicting ESLint formatting rules

**Approach:** Use Prettier for formatting and disable/relax indentation rules in ESLint.

**Pros:**

- Minimizes lint noise
- Common setup for Vue/Nuxt repos

**Cons:**

- Might reduce enforcement of certain stylistic rules

**Effort:** Small/Medium

**Risk:** Low/Medium

## Recommended Action

Use 2-space indentation for JavaScript, TypeScript, Vue, JSON, YAML, CSS, and Markdown so Prettier matches the Nuxt ESLint defaults. Keep generated/local mirror artifacts out of Prettier's write path.

## Technical Details

**Likely files:**

- `eslint.config.mjs`
- Prettier config (if present)

## Acceptance Criteria

- [x] `npm run lint` output is actionable (no repo-wide indentation explosion)
- [x] Prettier and ESLint agree on indentation
- [x] A small set of representative `.vue` files lint clean after formatting

## Work Log

### 2026-02-22 - Initial Discovery

**By:** Codex

**Actions:**

- Ran `npm run lint` and observed massive indentation mismatches against 4-space formatting

**Learnings:**

- Tooling mismatch is currently a major DX blocker

### 2026-02-22 - Deferred

**By:** Codex

**Actions:**

- User requested deferring lint alignment to a separate refactor pass

### 2026-06-22 - Completed

**By:** Codex

**Actions:**

- Set Prettier `tabWidth` to 2.
- Added generated/local mirror paths to `.prettierignore`.
- Ran the formatter in a dedicated normalization branch.

**Learnings:**

- Matching Prettier to the existing Nuxt ESLint default avoids hook churn and keeps future feature PRs smaller.
