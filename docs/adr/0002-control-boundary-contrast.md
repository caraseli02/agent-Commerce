# ADR 0002: Control Boundary Contrast

Status: Accepted
Date: 2026-10-21

## Context

Issue #760 found that the dark-mode `--border` and `--input` tokens
(`225 10% 18%`) reach only about 1.3:1 against the page and card surfaces, and
the light value (`230 9% 73%`) only about 2:1 against white. Inputs, textareas
and outline buttons are identified by their edge alone, so WCAG 1.4.11
(non-text contrast) applies to that edge. Card outlines, table rules and
section dividers are decorative and are not covered by 1.4.11.

## Decision

Control boundaries target **3:1** against the surfaces controls sit on. The
`--input` token carries that contrast and `--border` stays the subtle divider
colour:

- Light `--input`: `230 9% 56%`, at least 3:1 on `--background`, `--card`,
  `--muted` and `--secondary`.
- Dark `--input`: `225 10% 42%`, at least 3:1 on `--background` and `--card`.
- `UiInput`, `UiTextarea`, `UiSelectTrigger` and the `outline` `UiButton`
  variant draw their edge with `border-input`. The select trigger and outline
  button no longer override the edge in dark mode.

`tests/control-boundary-contrast.spec.ts` computes these ratios from
`app/assets/css/main.css` and fails if a token change drops below 3:1.

## Consequences

- Inputs and outline buttons have visibly stronger edges in both modes.
  Dividers and card outlines do not change.
- Call sites that pass their own `border-*` colour to these primitives still
  win through `cn`. The search toolbar selects (`search/Products.vue`) dropped
  their `border-border` override in this change; the disabled select in
  `order-confirm/ActionMenu.vue` keeps it, since 1.4.11 exempts inactive
  controls.
- The select trigger previously used `border-grey-600` (about 2.3:1 on white)
  and `dark:border-slate-800`, so it moves to the token too. The checkbox keeps
  its fixed edges (`border-slate-600` in light, `slate-50` in dark), which
  already exceed 3:1.
