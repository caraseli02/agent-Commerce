# shadcn native-element migration plan

Date: 2026-10-09
Status: approved by owner 2026-10-09; tracked in epic #631

## Goal

Replace native interactive/form elements (`<button>`, `<input>`, `<label>`, `<textarea>`, `<table>`) in application `.vue` files with the shadcn-vue primitives in `components/ui/`, wherever the swap is safe, and leave a CI ratchet that stops new native elements from appearing.

Previous rounds (#313/#315, #394, #401, #410, #421) covered modals only. The modal-scoped check in `scripts/verify-ui-conventions.mjs` now has an empty grandfather list.

## Decisions (owner, 2026-10-09)

1. **Scope:** every native element that can be replaced safely. "Safe" means the swap keeps behavior: same handlers, form semantics, refs, test selectors and accessibility. Anything else is an explicit, commented exception (see Conventions).
2. **Styling:** use the current `components/ui` variants as they are. Visual drift to the shadcn look is accepted. Avoid adding one-off variants; use `class` overrides only for layout (position, width, display), not to recreate the old look.
3. **Execution:** research first (done; findings below), then one dedicated PR per slice, run **one after another** (WIP=1 is unchanged). Mechanical slices are implemented by Haiku subagents and reviewed by the orchestrating session; behavior-sensitive slices use Sonnet/Opus.
4. **Validation:** every slice proves parity with a before/after UI test (see Migration parity harness) in addition to the normal gates.
5. **Signup is deleted, not migrated.** It is `Won't` in `docs/plans/2026-07-09-feature-prioritization-audit.md`.
6. **#530 (move sources to `app/`) lands first.** Paths in this plan are relative to the Nuxt source directory, which becomes `app/` after #530.
7. **Tracking:** one GitHub epic plus child issues, and this plan doc.

## Baseline (SFC-parsed, comments stripped, outside `components/ui/`)

100 files: 216 `<button>`, 34 `<input>`, 47 `<label>`, 3 `<textarea>`, 1 `<table>`, 0 `<select>`.

| Area                              | Elements |
| --------------------------------- | -------: |
| components/dashboard              |       91 |
| components/order-summary          |       51 |
| components/search                 |       40 |
| components/layout                 |       36 |
| components/global                 |       24 |
| components/signup (deleted in D1) |       17 |
| components/product                |       11 |
| components/shared                 |        9 |
| everything else (14 files)        |      ~21 |

Reproduce: parse each tracked `.vue` (minus `components/ui/`) with `@vue/compiler-sfc`, strip HTML comments from `descriptor.template.content`, count `<tag` openings. A line-based grep undercounts by about 60% because many tags break onto a new line after `<button`.

## Research findings that shape the plan

### Primitive facts

- `UiButton` (`components/ui/button/Button.vue`) supports `as`/`as-child` and passes `type` through, but sets **no default `type`**. A migrated button inside a `<form>` submits unless `type="button"` is set.
- `UiCheckbox` and `UiSwitch` render `<button role=checkbox|switch>`, not `<input>`. A wrapping `<label>` no longer toggles them implicitly. They need `id`/`for` and `:checked` + `@update:checked`, not `:value`/`@change`.
- `UiInput` is a component: a template `ref` on it no longer points at the DOM `<input>`. `.focus()` / `.click()` calls break. Known sites: `Hero.vue:151`, `layout/header/Search.vue:106`, `layout/header/MainRow.vue:346`, `icon/Upload.vue:30`. `UiInput` also does no number casting.
- `UiNumberField` renders `type="text" role="spinbutton"` and drops `valueAsNumber`. It is not a drop-in for `type=number`.
- **Missing primitives:** `radio-group`, `toggle-group`. `radix-vue` 1.9.17 exports `RadioGroupRoot` and `ToggleGroupRoot`, so wrappers can be generated.
- The `link` button variant uses `hover:underline-none`, which isn't a real Tailwind class.
- `cn()` uses `tailwind-merge` 2.x, but the app runs Tailwind 4. Conflict resolution for v4-only utilities is unreliable, so check override-heavy swaps visually.

### Convention check gaps (`scripts/verify-ui-conventions.mjs`)

Resolved by #633: the script now SFC-parses every `.vue` outside `components/ui/` and ratchets against `scripts/ui-conventions-baseline.json` (see `docs/agents/verification.md` §7). The gaps below describe the script before that change.

- It only scans `*Modal*.vue` files and `components/layout/**/*modal*`, and only `<button>`/`<input>`.
- Template extraction uses a non-greedy regex that stops at the first nested `</template>`, so elements after a `v-if` template are missed. For example, it reports 0 hits for `dataTable/filter/Range.vue`, which has 2 native inputs.

### Ownership boundary

Per `docs/agents/autonomous-workflow.md`, Claude never builds payment or checkout work. These slices go to Codex (no `agent:claude` label):

- `components/order-summary/**` (checkout page, payment method selection, shipping options)
- dashboard credit/payment files: `control-panel/settings-view/CustomerCreditEdit.vue`, `CustomerCredit.vue`, `CustomerDiscount.vue`, `client/Credit.vue`, `client/settings/Credit.vue`, `client/settings/PaymentsDialog.vue`, `client/PaymentCard.vue`, `customers/RecentTransactions.vue`

### Pre-existing bugs found (file separately, do not fix inside migration PRs)

- `dashboard/control-panel/settings-view/Settings.vue:78`: `@:click="resetPassword(...)"` never fires.
- `pages/forgot-password.vue:14`, `pages/password-reset.vue:34`: a button with `@click` inside `<form @submit.prevent="handleSubmit">` runs the action twice per click (inferred from code). Fix before M1. `password-reset.vue:74` never compares the repeated password.
- `dashboard/client/Credit.vue:37`: `type=submit` in a `<form>` with no handler reloads the page (payments → Codex).
- Nested interactive content: `order-summary/PayByCard.vue:44`, `NewCard.vue:2`, `PaymentMethodSection.vue:85/105` (button inside button; SSR is on for `/order-summary`, so there is a hydration risk). `global/Notifications.vue:86` and `dashboard/Header.vue:109` (button inside `NuxtLink`).
- `:value` bound instead of `:checked` on checkboxes, so native state never syncs: `CheckBoxAll.vue:3`, `order-summary/Table/ItemHeader.vue:69`, `dashboard/.../Settings.vue:22,43,93`.
- Unreferenced files: `order-summary/ProductCard.vue`, `order-summary/Table/ItemLG.vue`. Delete them; don't migrate.
- Dead controls with no handler: about 25 buttons (listed per slice in the research notes). Migrate as-is; deleting or wiring them is product work.

## Conventions every slice follows

1. **Element → primitive map:** `button` → `UiButton` (explicit `type` inside forms; `size="icon"` + `aria-label` for icon-only). `NuxtLink`/`a` styled as a button → `UiButton as-child`. `label` with text → `UiLabel`. Text-less wrapper `label` → `div`/`span`, unless it provides click-to-focus. `input` text/search/email → `UiInput`. Checkbox → `UiCheckbox`, toggle → `UiSwitch`, `textarea` → `UiTextarea`, `table` → `UiTable*`.
2. **Exceptions are inline and explained.** A native element that must stay gets `<!-- ui-native: <reason> -->` on the line above it. The ratchet accepts only commented exceptions. Expected permanent exceptions: hidden/file inputs (`icon/Upload.vue`), `error.vue`, and markup the parser requires (e.g. a native element inside a third-party slot).
3. **Behavior-neutral PRs:** no copy changes, no handler rewiring, no restyling beyond what the primitive brings. Preserve `data-testid`, `aria-label` text and button names (e2e relies on "Open my account", "Open shopping cart", "Regional preferences", "Secure checkout", `checkout-as-guest`, `payment-management`).
4. **Source-text tests:** several specs assert literal strings in component source (`tests/empty-states.spec.ts`, `cart-delete-confirmation.spec.ts`, `favorites-removal-boundary.spec.ts`, `buyer-form-input.spec.ts`, `account-demo-credentials.spec.ts`). Run them for every slice that touches those files.
5. **Each PR shrinks the ratchet baseline** for the files it touched, in the same commit.

## Migration parity harness

Styling is allowed to change, so pixel diffs can't be the pass/fail signal. What must not change is behavior: which controls exist, their roles, accessible names and states, and what happens when they are used. The harness checks exactly that, before and after each slice.

- **Where:** `tests/visual/migration-parity.spec.ts`, run under the existing `playwright.visual.config.ts` (fresh built preview, mock mode, fixed locale/timezone). Script: `pnpm test:parity`.
- **Scenarios:** a manifest `tests/visual/migration-parity/scenarios.ts`. Each scenario has an id, its slice, a route, a viewport (mobile 390 and/or desktop 1440), setup steps (sign in as a demo role, open a menu or sheet), a region locator and an interaction script.
- **Strict checks (fail the run):**
  1. ARIA snapshot of the region (`expect(locator).toMatchAriaSnapshot({ name })`). It records roles, accessible names and states (checked, pressed, expanded, disabled), so a lost `aria-label`, a checkbox that stops reporting `checked`, or a button that turns into a generic element fails.
  2. Interaction outcomes: each step asserts the observable result (a sheet opens, a checkbox toggles the stored value, a filter changes the result count, Enter submits once).
  3. Keyboard: the region's tab order (names of focused elements, in order) is captured as part of the snapshot.
  4. Clean runtime: no console errors, hydration warnings, page errors or 5xx (reuse `installVisualSignals` from `visual-regression.spec.ts`).
- **Informational (not gating):** a full-region screenshot before and after. Both are attached to the PR so the reviewer sees the intended visual drift.
- **Per-slice workflow:**
  1. **Before commit:** on the slice branch, before touching components, add or extend the slice's scenarios and record the snapshots against unchanged code (`pnpm test:parity --grep <slice> --update-snapshots`). Commit the snapshots alone.
  2. **Migration commits:** change the components. `pnpm test:parity --grep <slice>` must pass with the snapshot files **unchanged**.
  3. **Intentional accessibility or behavior changes** (for example, a new `aria-label` on an unnamed icon button) come after the unchanged-snapshot migration proof, in their own separate, explicitly described commit (or a separate accessibility PR). That commit contains both the source change and the matching snapshot update, and the PR body lists each snapshot change line by line.
- The reviewer checks that commit 1 only adds scenarios and snapshots, that the parity-preserving migration commits don't touch snapshot files, and that every snapshot change after them sits in an explicitly described accessibility/behavior commit together with the source change that causes it.

## Phases and slices

Order is strict. Each slice is one issue, one branch, one PR. The next slice starts only after the previous one is merged.

Every slice also adds an `aria-label` to the icon-only buttons in its files that lack one. This is an intentional accessibility change, not part of the parity-preserving migration: it goes in its own explicitly described commit (or a separate accessibility PR) after the unchanged-snapshot migration proof, with the source change and the snapshot update together. Dead controls are migrated as they are. Deleting or wiring them is product work, except where an issue says otherwise. The dead promo buttons in `layout/header/main-menu/Banners.vue` (div/img inside a button) wait for a product decision and stay as a `ui-native:` exception.

| Order | #         | Slice                                                                                                                                                                                                                                     | Owner    | Model  |
| ----: | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------ |
|     0 | #530      | Move sources to `app/` (existing issue)                                                                                                                                                                                                   | per #530 | —      |
|     1 | F0 (#632) | Migration parity harness: spec, scenario manifest, `pnpm test:parity`, docs in `docs/agents/verification.md`                                                                                                                              | Claude   | Sonnet |
|     2 | F1 (#633) | Ratchet: rewrite `verify-ui-conventions.mjs` to SFC-parse every `.vue` outside `components/ui/`, count the 5 tags, honor `ui-native:` comments, compare against a per-file count baseline JSON that can only shrink; update spec and docs | Claude   | Sonnet |
|     3 | F2 (#634) | Primitive gaps: add `ui/radio-group` (radix `RadioGroupRoot`), fix the `link` variant hover class, document the `UiInput` ref pattern                                                                                                     | Claude   | Sonnet |
|     4 | D1 (#635) | Delete signup: `pages/signup.vue`, `components/signup/*`, `composables/signup/*`, links in `layout/account-modal/Links.vue`, specs that reference it                                                                                      | Claude   | Haiku  |
|     5 | X1 (#636) | Bug: forgot-password / password-reset run the action twice per click                                                                                                                                                                      | Claude   | Haiku  |
|     6 | X2 (#637) | Bug: `settings-view/Settings.vue:78` `@:click` never fires                                                                                                                                                                                | Claude   | Haiku  |
|     7 | M1 (#638) | Auth pages: `pages/forgot-password`, `password-reset`, `verify-email`                                                                                                                                                                     | Claude   | Haiku  |
|     8 | M2 (#639) | Search: `search/Filters`, `Filter`, `Filter2`, `SearchItem`, `layout/AddRemoveSearchFilter` (excluding `Products.vue` dropdowns)                                                                                                          | Claude   | Haiku  |
|     9 | M3 (#640) | Product + small globals: `product/Details`, `Gallery`, `Quantity`, `Table`, `global/ProductCard`, `ProductTabs`, `CopyClipboard`, `QuickBuy/*`, `home/Hero`                                                                               | Claude   | Haiku  |
|    10 | M4 (#641) | Header chrome: `layout/header/*`, `main-menu/*`, `global/Notifications` (input refs; e2e/visual baselines)                                                                                                                                | Claude   | Sonnet |
|    11 | M5 (#642) | Dashboard widgets: `Aside`, `Header`, `CustomersTotal`, `ReturningCustomers`, `new-customers/*`, `customers/*` (non-payment), `orders/InfoCards`, `client/*` (non-payment), `dashboard/Search`, `pages/dashboard/**`                      | Claude   | Haiku  |
|    12 | M6 (#643) | Dashboard control panel: `AccountView`, `BillingView`, `OrganizationView`, `ShippingView`, `settings-view/Settings`, `client/settings/AlertsItem`, `Marketing`                                                                            | Claude   | Sonnet |
|    13 | M7 (#644) | Shared table bits: `shared/tables/micro/CheckBoxAll`, `row-items/ThreeDotMenu`, `admin-table/order/Order`                                                                                                                                 | Claude   | Haiku  |
|    14 | B1 (#645) | Form wrappers: `global/FormInput`, `FormPassword`, `FormSelect` (needs F2; fewer call sites after D1)                                                                                                                                     | Claude   | Opus   |
|    15 | B2 (#646) | Numeric inputs: `global/QuantityButtons`, `categories/Range`, `dataTable/filter/Range` (keep numeric semantics; cart path)                                                                                                                | Claude   | Sonnet |
|    16 | B3 (#647) | `search/Products.vue` Show / Sort / Per-page dropdowns → `UiSelect` / `UiRadioGroup`                                                                                                                                                      | Claude   | Sonnet |
|     — | C1 (#648) | order-summary mechanical: labels, icon buttons, `Table/*`, banners, `Header`, `Summary`, `NoteSection`; delete unreferenced `ProductCard.vue` and `Table/ItemLG.vue`                                                                      | Codex    | —      |
|     — | C2 (#649) | order-summary structural: option cards, accordion headers, nested-button fixes in `PayByCard` / `NewCard` / `PaymentMethodSection`                                                                                                        | Codex    | —      |
|     — | C3 (#650) | Dashboard credit/payment/discount files (incl. `client/Credit.vue` submit-reload bug) + `order-confirm` textareas                                                                                                                         | Codex    | —      |
|  last | Z1 (#651) | Close-out: baseline holds only `ui-native:` exceptions; the ratchet becomes strict; docs updated                                                                                                                                          | Claude   | Sonnet |

Codex slices C1–C3 run in Codex's own queue after F0–F2 have landed. They don't block Claude's order, and Z1 waits for them.

## Per-slice workflow (Claude slices)

1. The orchestrating session claims the child issue (labels, assignee, branch `claude/issue-<n>`).
2. It records the parity snapshots on unchanged code and commits them (Migration parity harness, step 1).
3. A subagent with the named model implements the slice in the same worktree. Its brief contains the slice's research rows, the Conventions and the exact checks to run.
4. The orchestrator reviews the diff against the research rows, runs `pnpm test:parity --grep <slice>`, the targeted Vitest/e2e specs and a browser pass (`.agents/skills/verify-ui-change/SKILL.md`), and checks the ratchet delta.
5. `pnpm verify` → PR with `Closes #<child>` / `Related #<epic>` and before/after screenshots → independent Codex evaluation → owner merges → next slice.

## Verification per slice

- `pnpm test:parity --grep <slice>` passes with snapshot files unchanged by the migration commits.
- `node scripts/verify-ui-conventions.mjs`: the baseline shrinks for the touched files, and nothing new appears (from F1 on).
- Targeted Vitest specs for touched files (source-text specs listed under Conventions).
- Playwright e2e specs that select touched elements. `tests/visual` baselines are refreshed only on purpose, with before/after screenshots in the PR.
- `pnpm verify` before push.

## Risks and dependencies

- **#530** renames every path in this plan. Nothing here starts before it merges.
- **Visual baselines:** M3, M4 and B1 will change `tests/visual` screenshots (header, sign-in, cart, purchase panel).
- **Tailwind merge:** see Primitive facts. If overrides misbehave, upgrading to `tailwind-merge` 3 becomes a separate issue.
- **Harness flakiness:** ARIA snapshots on data-driven regions (charts, lists) must use stable mock data. Scope the region to the migrated controls, and use regex names for dynamic counts.
