# UI Review Fixes (2026-02-22)

Based on findings from `/Users/vladislavcaraseli/Documents/Ecas/tmp/ui-review-2026-02-22/`.

## Critical

- [x] Fix customer dashboard crash: TooltipProviderContext missing
- [x] Fix `/order-summary` crash: `undefined.filter`

## High

- [x] Close sign-in drawer after successful login (and strip `signin` query)
- [x] Provide a working cart route (`/cart`) or remove broken navigation
- [x] Fix `/checkout/session` empty dead-end (redirect or CTA)

## Medium

- [x] Standardize currency formatting (`Lei` spacing)
- [x] Improve mobile header height/discoverability
- [x] Improve mobile PDP top-actions clarity (labels/menu)
- [x] Prevent MOCK MODE badge from overlapping UI

## Low

- [x] Replace `| Lei` trigger label with clear regional preferences label
