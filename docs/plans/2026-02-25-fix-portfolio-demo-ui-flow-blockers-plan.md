---
title: 'fix: Portfolio demo UI + flow blockers (signup, cart, product media, responsive)'
type: fix
date: 2026-02-25
---

# fix: Portfolio demo UI + flow blockers (signup, cart, product media, responsive)

## Overview

The portfolio demo currently has multiple UX/visual issues that reduce “demo-readiness” across customer + admin flows.
This plan focuses on fixing the **highest-impact blockers first** (signup wizard, cart entry, product media), then tightening responsive layout and polish for a portfolio-quality walkthrough.

### Primary conversion goal (portfolio demo)

- Customer: Browse → Search → Product detail → Add to cart → Checkout entry (with clear auth expectation)
- Admin: Sign in as Admin → Access dashboard pages confidently (no confusing “ghost” auth)

### Demo MVP scope (validate what’s actually needed)

For a portfolio demo, not every production-like feature is required. To keep scope tight, categorize items as:

**Must-have (demo credibility)**

- Storefront browsing/search works and looks good (375 / 768 / 1440).
- Product detail does not show broken media (images have fallback).
- Add-to-cart + cart/checkout entry is coherent (no surprise dead-ends).
- Demo sign-in makes sense (role selection is obvious; clicking produces feedback and lands you somewhere meaningful).
- “Mock mode” indicators never obscure content (especially on mobile).

**Nice-to-have (only if you want to demo it explicitly)**

- Full signup wizard completion (steps 1–5) with validation.
- “Perfect” empty state messaging polish.

**Key decision:** Do you want **signup** to be part of the demo story?

- Option A (recommended for speed): **De-scope signup** from the portfolio walkthrough and remove/hide “Sign up now” entry points until the wizard is fixed.
- Option B: **Keep signup in scope** and treat the signup wizard as a first-class demo flow.

**Decision (2026-02-25): Option A — De-scope signup for demo.**

## Problem Statement / Motivation

From the UI review (Feb 2026), the following issues were observed:

### P0/P1 blockers (must fix)

1. **Cart entry breaks expected storefront flow**: `/cart` redirects to `/?signin=true` rather than allowing a guest cart (or a clear “sign in to checkout” path).
2. **Broken product images on product detail**: product gallery uses plain `<img>` and shows broken image placeholders.
3. **Tablet (768px) home experience feels “empty”** (hero/banner missing; home body sections appear absent/insufficient).

### High-impact quality issues (should fix)

4. **Mobile search product titles overflow/clamp incorrectly** (e.g., long names clip).
5. **Mock-mode indicator overlaps content on mobile footer**.
6. **Sign-in modal copy + behavior is confusing** (demo login has no fields; submit feedback is unclear).

### Conditional blocker (only if signup is part of demo)

7. **Signup wizard blocked**: “Personal Details” step renders without visible form fields, leaving only Back/Continue.

## Evidence (screenshots)

All screenshots live under:
`/path/to/components-marketplace/tmp/ui-review/2026-02-24/`

Key evidence files:

- Signup step 2 blank (desktop): `signup_step2_desktop_blank.png`
- Signup step 2 blank (mobile): `signup_step2_mobile_blank.png`
- Cart redirect to sign-in: `cart_desktop.png`
- Product gallery broken images: `product_detail_image_broken_desktop.png`
- Home tablet layout: `home_tablet.png`
- Search mobile title overflow: `search_mobile_card_overflow_title.png`
- Mock mode overlap near footer: `home_mobile_mockmode_overlap.png`

## Local Research Findings (repo-specific)

### Signup wizard structure

- Wizard orchestration is in `pages/signup.vue`.
- Step 2 “Personal Details” UI is `components/signup/PersonalDetails.vue` and _should_ render inputs using:
  - `components/global/FormInput.vue`
  - `FormSelect` (component auto-imported)
  - state from `composables/signup/useSignupState.ts`
- The observed blank UI suggests either:
  - runtime error inside PersonalDetails / child components preventing render,
  - CSS/layout causing the form grid to be invisible/collapsed,
  - or a hydration/timing issue where content appears after a long delay.

### Cart entry behavior

- `/cart` is intentionally redirecting in `pages/cart.vue`:
  - not authed → `/?signin=true`
  - authed → `/order-summary`
- This is a product decision embedded in code (not a routing accident).

### Product gallery image rendering

- Product detail page is `pages/product/[slug].vue`.
- Gallery uses `components/product/Gallery.vue`, which renders:
  - main image: `<img :src="...ProductImageLarge" alt="Image">`
  - thumbnails: `<img :src="...ProductImageSmall" alt="Image">`
- No fallback component is used here, so invalid/missing URLs show broken images.

### Mock mode badge overlap

- Badge is rendered in `layouts/default.vue` as a fixed element bottom-left (pointer-events-none) and can overlay footer content on smaller viewports.

### Responsive home “empty” feel on tablet

- The large hero/banner on desktop is part of the **desktop-only Products popover**:
  - `components/home/Hero.vue` includes `PopoverContainer` with `hidden lg:block`.
  - Banner content comes from `components/layout/header/main-menu/BannerNew.vue` inside `components/layout/header/main-menu/DektopPopoverContainer.vue`.
- On `md`/tablet, that popover/banner is hidden by design, so the home page can feel sparse unless other home sections carry the page.

## Related Internal Learnings / Docs

- Brainstorm context: `docs/brainstorms/2026-02-13-backend-to-portfolio-demo-brainstorm.md`
- Demo/mock-mode stability learnings:
  - `docs/solutions/runtime-errors/demo-route-crashes-mock-mode-system-20260218.md`
  - `docs/solutions/ui-bugs/desktop-category-selection-hides-banner-and-renders-detail-panel-system-20260218.md`

## Proposed Solution

Treat this as a **demo-readiness polish sprint** with two principles:

1. **Never dead-end**: Every major path should either complete or show a clear next action.
2. **Fail soft**: Missing mock data or media should fall back gracefully (no broken UI).

### Workstreams

1. **Storefront → Cart → Checkout clarity**

   - Decide and implement one of:
     - A) Guest cart allowed; auth required at checkout (recommended for e-commerce expectations).
     - B) Cart requires auth, but redirect must explain why and preserve intent (e.g., “Sign in to view your cart” with return URL).
   - Ensure “Add to cart” works for guests in mock mode (if you want the storefront demo to be fully clickable without auth).

2. **Product media resilience**

   - Replace plain `<img>` in `components/product/Gallery.vue` with an image fallback pattern (e.g., existing `ImageWithFallback`).
   - Add a consistent placeholder image for missing `ProductImageLarge/ProductImageSmall`.

3. **Responsive home content on tablet**

   - Ensure home has a dedicated hero/banner section visible at `md` (768px), independent of desktop popover.
   - Validate that lazy home sections render reliably at tablet sizes (watch console + network).

4. **Mobile text overflow and polish**

   - Fix search item title layout so long names truncate/wrap without clipping:
     - likely requires `min-w-0` and `flex-1` on the title link in `components/search/SearchItem.vue`.
   - Reposition mock-mode badge to avoid overlapping footer on small screens.
   - Improve sign-in modal wording and feedback so “demo login” is obvious.

5. **(Optional) Signup wizard reliability (de-scoped for demo)**
   - Only do this if you later want to include signup in the portfolio walkthrough.

## Implementation Plan (phased)

### Phase 0 — Lock demo scope (15 minutes)

1. **Apply decision: De-scope signup**
   - Remove/hide “Sign up now” entry points from the demo paths:
     - Sign-in modal (most visible entry point)
     - Header/account menus (if present)
   - Replace with one of:
     - “Signup coming soon” (best for transparency), or
     - Hide link entirely (best for clean demo).
   - Keep `/signup` route accessible for later, but do not route users into it during the demo.

### Phase 1 — Unblock demo flows (P0/P1)

1. **Fix cart entry experience**

   - Implement chosen behavior (guest cart vs auth-required cart).
   - If redirect remains, preserve intent (e.g., return-to path) and show explanation.

2. **Fix product gallery broken images**

   - Add image fallback in `components/product/Gallery.vue` for main + thumbnails.
   - Confirm no broken image icons appear for mock products.

3. **Tablet home “empty” experience**
   - Add/enable a hero/banner section for `md` sizes _or_ fix layout/CSS so home sections render and fill the page at 768px.
   - Ensure home sections render at tablet and don’t collapse to blank whitespace.

### Phase 2 — Responsive + content density

4. **Mobile search title overflow**
   - Adjust title row flex + truncation behavior in `components/search/SearchItem.vue`.

### Phase 3 — Polish and demo ergonomics

5. **Mock mode badge overlap**

   - Move badge to a safer location or add layout padding when present.

6. **Sign-in modal clarity**

   - Rename copy from “Sign in to your account” → “Choose demo role” (or similar).
   - Provide visible feedback on click (loading state + redirect).
   - Ensure empty-submit doesn’t look like a no-op.

7. **Demo capture mode**
   - For portfolio screenshots/video, run a production preview build (no dev overlays).

### Phase 4 — (Optional) Signup wizard (only if in scope)

8. **Investigate signup step 2 blank render**

   - Reproduce with devtools open (console + network):
     - `/signup` → Personal → Continue
   - Confirm whether the form appears after delay, or never renders.
   - Capture any runtime errors and trace to the failing child component.

9. **Fix signup step 2 render + validation**
   - Ensure form inputs are visible and interactive on:
     - mobile (375px), tablet (768px), desktop (1440px).
   - Add an explicit error state if required data (e.g., countries list) fails to load.

## Acceptance Criteria

### Functional

- [ ] User can follow a coherent storefront flow:
  - [ ] `/search` → product → add to cart → cart/checkout entry behaves as designed (no surprise modal dead-ends).
- [ ] Product detail gallery shows a real image or a styled placeholder (never broken image icons).
- [ ] Demo sign-in is self-explanatory and produces visible feedback (loading/toast + redirect).

### Functional (optional, if signup is in demo scope)

- [ ] `/signup` Personal step shows all expected form fields and allows completing steps 1–5.

### Responsive

- [ ] Home, Search, Signup, Product detail look intentional at 375 / 768 / 1440 widths (no “giant blank” sections).
- [ ] Search result titles never clip outside their container on mobile.
- [ ] Mock mode badge never overlaps actionable footer content on mobile.

### UX / Copy

- [ ] Demo auth UI is self-explanatory (role selection is clearly a demo affordance).
- [ ] Any auth gating explains “why” and preserves intent (return path).

## Dependencies & Risks

- **Mock-mode security constraints**: do not weaken mock-mode guards while making flows more accessible.
- **SSR vs client rendering**: ensure changes do not reintroduce SSR URL parsing issues documented in Feb 18 solution.
- **Time sinks**: signup blank state root-cause may be an upstream component bug (FormSelect / CSS / hydration). Treat diagnosis as the first milestone.

## References (code)

- `pages/signup.vue`
- `components/signup/PersonalDetails.vue`
- `composables/signup/useSignupState.ts`
- `pages/cart.vue`
- `pages/product/[slug].vue`
- `components/product/Gallery.vue`
- `components/search/SearchItem.vue`
- `layouts/default.vue`
