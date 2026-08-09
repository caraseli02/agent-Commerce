---
module: System
date: 2026-02-25
problem_type: ui_bug
component: nuxt_view
symptoms:
  - 'Mobile search result titles overlapped action icons and could clip at the right edge'
  - 'Product detail gallery rendered broken image placeholders when URLs were missing/invalid'
  - 'Cart entry redirected to sign-in but lost user intent (no return-to), creating a demo dead-end'
  - 'Tablet (768px) home felt empty because hero/banner surface was hidden at md'
  - 'Mock mode badge could overlap UI content (especially on mobile/footer areas)'
  - 'Sign-in modal suggested signup and created confusing demo navigation'
root_cause: ui_bug
resolution_type: code_fix
severity: high
tags: [nuxt3, demo, mock-mode, responsive, auth-redirect, image-fallback, search]
---

# Troubleshooting: Portfolio Demo UI + Flow Blockers (Auth Redirect, Media Fallback, Mobile Search Title)

## Problem

For a portfolio walkthrough, several UI and flow issues reduced demo credibility across customer + admin paths:
broken product media, confusing sign-in/signup entry points, mobile search layout overlap, and an auth redirect that did not preserve intent.

## Scope Decision (Demo MVP)

Signup was explicitly **de-scoped** from the demo story on 2026-02-25 to keep the walkthrough focused on browsing → search → product detail → add to cart → checkout entry.

Reference plan: `/path/to/components-marketplace/docs/plans/2026-02-25-fix-portfolio-demo-ui-flow-blockers-plan.md`

## Environment

- Repo: `/path/to/components-marketplace`
- UI stack: Nuxt 3 + Tailwind (shadcn-style components)
- Evidence screenshots: `/path/to/components-marketplace/tmp/ui-review/2026-02-25/`

## Symptoms

- Search results on mobile (375px) could render product titles under/into the favorite/share icons.
- Product detail pages showed broken image placeholders for missing mock image URLs.
- Unauthed users hitting `/cart` were redirected to sign-in without a return path, making the “add to cart → cart” demo loop feel broken.
- Tablet home (768px) missed the hero/banner surface due to desktop-only visibility.
- Mock-mode badge could overlap content.
- Sign-in modal included a signup CTA even though signup was not demo-ready.

## Solution

### 1) Fix mobile search result title overlap

Adjusted the search result title row so actions are in-flow on mobile and spacing is resilient.

- File: `/path/to/components-marketplace/components/search/SearchItem.vue`
- Changes:
  - Inline mobile favorite/share actions next to the title (in flow).
  - Hide the absolute right-side action column on mobile.
  - Add small mobile right padding and tighten icon hit areas to avoid clipping.

### 2) Add resilient product gallery images (no broken placeholders)

Use the existing fallback component for main image + thumbnails.

- File: `/path/to/components-marketplace/components/product/Gallery.vue`
- File: `/path/to/components-marketplace/components/global/ImageWithFallback.vue`

### 3) Preserve redirect intent through sign-in (cart → sign-in → return)

Keep the auth gate (mock cart expects a user id) but preserve where the user intended to go.

- File: `/path/to/components-marketplace/pages/cart.vue`
- File: `/path/to/components-marketplace/pages/index.vue`
- File: `/path/to/components-marketplace/components/layout/account-modal/Form.vue`
- Behavior:
  - Unauthed `/cart` → `/?signin=true&redirect=/cart`
  - After sign-in, redirect back to `redirect` (sanitized: disallow protocol-relative `//`).

### 4) Restore “hero surface” presence on tablet

Ensure tablet (md) isn’t visually empty by allowing the hero/popover container to render at md.

- File: `/path/to/components-marketplace/components/home/Hero.vue`

### 5) Prevent mock badge overlap

Move mock badge to a safer fixed position that avoids footer overlap.

- File: `/path/to/components-marketplace/layouts/default.vue`

### 6) De-scope signup entry points in demo sign-in modal

Remove or replace signup entry points and clarify the demo purpose (“choose a demo role”).

- File: `/path/to/components-marketplace/components/layout/account-modal/Index.vue`
- File: `/path/to/components-marketplace/components/layout/account-modal/Form.vue`

## Verification (Manual)

- Mobile (375px): search results show long titles without overlapping favorite/share icons.
- Desktop + Mobile: product detail renders image fallback instead of broken image placeholders.
- Demo flow: add to cart → `/cart` prompts sign-in but returns the user to the intended flow.
- Tablet (768px): home includes the hero/banner surface rather than feeling empty.
- Mock badge does not overlap footer/UI.

Screenshots captured under:
`/path/to/components-marketplace/tmp/ui-review/2026-02-25/`

## Prevention

- Avoid absolute-positioned action controls on small screens; keep actions in-flow at `max-md`.
- Standardize image rendering via `ImageWithFallback` wherever mock/optional media is used.
- When redirecting to auth, always preserve intent via a sanitized `redirect` query param.
- Treat demo scope as a first-class product decision (de-scope broken paths rather than exposing “dead” CTAs).

## Related Docs

- `/path/to/components-marketplace/docs/solutions/runtime-errors/demo-route-crashes-mock-mode-system-20260218.md`
- `/path/to/components-marketplace/docs/solutions/ui-bugs/desktop-category-selection-hides-banner-and-renders-detail-panel-system-20260218.md`
- `/path/to/components-marketplace/docs/solutions/ui-bugs/broken-product-media-fallback-and-icon-overlap-product-20260303.md`
