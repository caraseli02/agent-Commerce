# Design-system lint

`pnpm lint` checks how Vue templates style the `Ui*` primitives in
`app/components/ui/`. It uses [`@shadcn/lint`](https://github.com/shadcn-ui/lint)
inside the existing Nuxt ESLint config (`eslint.config.mjs`). There is no
separate service or workflow. Issue #733 has the evaluation history.

## The rule

`shadcn/no-restyle` (error) applies to every `.vue` file under `app/` except
`app/components/ui/**`:

- **Allowed on a primitive:** layout classes. These are margin, width and
  height, position, display, flex and grid placement, transforms and text
  alignment, for example `mt-4 w-full hidden md:flex`.
- **Reported:** appearance classes. These are color, typography, padding and
  gap, shape (radius, border, ring), effects, motion, and classes the linter
  cannot classify. Use the primitive's `variant` and `size` props. Button's
  are defined in `app/components/ui/button/index.ts`.
- **Contracts** (`eslint.config.mjs`):
  - `UiSkeleton` may also set shape, because a skeleton mirrors the content it
    replaces.
  - `UiDialogContent`, `UiSheetContent` and `UiPopoverContent` may also set
    spacing, because they hold arbitrary content.
- **Out of scope:**
  - Primitive internals (`app/components/ui/**`), which own their styling.
  - Plain elements such as `<div>`.
  - `<style>` blocks, `<component :is>`, and classes read from `$attrs`.

```vue
<!-- Passes -->
<UiButton variant="outline" size="sm" class="mt-4 w-full">Save</UiButton>

<!-- Reported: color, spacing and shape belong to the variant -->
<UiButton class="bg-red-500 px-10 rounded-full">Save</UiButton>
```

Each diagnostic names the class, what the primitive owns and the variant or size
to use, and links back to this page.

### Fixing a finding

1. Use an existing `variant`/`size`.
2. If the design needs a new treatment, add a variant to the primitive's `cva`
   definition and review it like any design change.
3. Only for a reviewed, intentional exception, add a directive with a reason:
   `<!-- eslint-disable-next-line shadcn/no-restyle -- <why> -->`. Find them
   with `rg "eslint-disable.*shadcn/"`.

## Existing debt: the baseline

When the rule was adopted, the templates had 1274 findings in 130 files. Most
were `UiButton` padding and color overrides in `dashboard/`, `layout/`,
`order-confirm/` and `global/`. They are recorded in `eslint-suppressions.json`,
using ESLint's
[bulk suppressions](https://eslint.org/docs/latest/use/suppressions), and are
not migrated (#733 non-goal).

- A **new** override fails `pnpm lint`, including one that raises a file's
  recorded count.
- Fixing an override never fails lint (`--pass-on-unpruned-suppressions`). To
  lower the recorded counts, run `pnpm exec eslint app --prune-suppressions`.
- Never regenerate the whole baseline to hide a new finding.

When two branches change the same file, the second one to merge may need its
count adjusted. Prefer fixing the override.

## Audit-only rules: `pnpm lint:design`

These rules run only in `pnpm lint:design`, as warnings. They have too much
unreviewed debt for `pnpm lint`.

| Rule                         | Findings | Assessment                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ---------------------------- | -------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shadcn/no-arbitrary-values` |      788 | Real policy violations, not bugs. There are 243 distinct legacy values, led by `leading-[1.71]`, `rounded-[100px]`, `text-[#5E6278]` and `py-[3px]`. Enforcing it needs a palette/scale migration decision first.                                                                                                                                                                                                                                                                                                            |
| `shadcn/no-unknown-classes`  |      118 | **Probably real (76, all in `ui/`):** `tailwindcss-animate` names (`animate-in`, `fade-in-0`, `zoom-in-95`, `slide-in-from-*`). The plugin is installed but not loaded by the Tailwind v4 theme, so these classes likely emit no CSS. **Real typos:** `item-center`, `roun ded-full`, `px-`, `full`, `text-red`, `border-red`, `align-end`. **False positives or intentional:** CSS hooks styled elsewhere (`lucide`, `ordersFilter`, `rangeSlider`, `panelView`, `homeNews--swiper`, `header-transition`) and `stroke-1.5`. |

Promote a rule to `pnpm lint` only after its findings are resolved or baselined.
`shadcn/no-raw-colors` is deliberately off until there is an explicit token
migration decision.

## How auto-imported primitives are recognized

`@shadcn/lint` finds a component without an import by its export name
(`Button`). Nuxt registers the primitives with the `Ui` prefix (`UiButton`).
On each run, `eslint.config.mjs` reads `.nuxt/components.d.ts` and writes a
re-export bridge to `node_modules/.cache/shadcn-lint-nuxt-ui/index.ts`, for
example `export { Button as UiButton } from ".../ui/button/index"`. The bridge
follows Nuxt's registry, so new primitives are covered automatically. It needs
`.nuxt/` to exist, which `pnpm install` (`nuxt prepare`) already provides for
ESLint.

Two settings make this work. `tsconfig.json` maps `@/*` to `app/*`, so the
linter can resolve `components.json`'s `@/components` alias. Without it, the
linter cannot find the primitives or their variants. The other setting is
`settings.shadcn.ui`, which accepts several directories. That support arrived
in `@shadcn/lint` 0.2.3, which is pinned exactly.

## Verification

`tests/design-system-lint.spec.ts` runs the real config. It checks that
supported variants and layout classes pass, that overrides on `<UiButton>`,
`<ui-button>`, `:class` bindings and explicit imports are reported with
guidance, and that the contracts and the primitive exemption behave as
documented.
