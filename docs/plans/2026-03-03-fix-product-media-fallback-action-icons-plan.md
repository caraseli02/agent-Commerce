---
title: 'fix: Product media fallback + action icon overlap (portfolio demo)'
type: fix
date: 2026-03-03
---

# fix: Product media fallback + action icon overlap (portfolio demo)

## Overview

Two issues reduce “demo readiness” on product pages:

1. **Broken/missing media** still shows as broken image UI (not the intended fallback).
2. **Action icons overlap the product image** (heart/share/box column sits on top of the media area), which looks unpolished in a portfolio walkthrough.

This plan focuses only on **visual/demo UX** (not deep business logic).

## Problem Statement / Motivation

- Product detail pages should never show browser “broken image” icons in a demo.
- Media toolbars (favorite/share/etc.) should not collide with the primary media content.

## Evidence

- Broken image icon visible on product page (mobile): `/Users/vladislavcaraseli/Documents/Ecas/tmp/ui-review-2026-03-02/nuxt3000-product-prod-19-mobile.png`
- Same page (desktop): `/Users/vladislavcaraseli/Documents/Ecas/tmp/ui-review-2026-03-02/nuxt3000-product-prod-19-desktop.png`

## Local Research Findings (repo-specific)

- Product media toolbar + gallery lives in `components/product/Gallery.vue` (icons are absolutely positioned on the right).
- Product “manufacturer logo”/side image currently uses a plain `<img>` in `components/product/Details.vue`:
  - `:src="product.details?.ProductImage.ProductImageLarge"` can be missing/invalid → broken image UI.
- The project already has `components/global/ImageWithFallback.vue` used across search and gallery.
- Data shape: `model/products/response/ProductDetailResponse.ts` → `product.details.ProductImage` is a `ProductImageInterface` (product imagery), not a guaranteed manufacturer logo.

Related prior work:

- Existing plan: `docs/plans/2026-02-25-fix-portfolio-demo-ui-flow-blockers-plan.md` (mentions product media resilience)
- Learnings: `docs/solutions/ui-bugs/portfolio-demo-demo-readiness-fixes-system-20260225.md`

## Proposed Solution

### A) Replace plain product “logo” `<img>` with resilient fallback

In `components/product/Details.vue`:

- Replace the plain `<img>` with `ImageWithFallback` so missing media never renders a broken image icon.
- If the intent is to show a **manufacturer logo** (not the product image), introduce a safe mapping:
  - Option 1 (fast, demo-friendly): map known manufacturers → local assets (or a single neutral “brand” placeholder).
  - Option 2 (data-driven): extend mock/product data to include `manufacturerLogoUrl` and use that field.

### B) Fix action icons overlapping product image in the gallery card

In `components/product/Gallery.vue`:

- Move the icon column into a dedicated “toolbar” area that does not overlap media:
  - Prefer a small right-side column (`grid grid-cols-[1fr_auto]`) or a top-right toolbar row.
- Ensure the media area has enough padding / layout separation so the image never sits under the icons.
- Keep interactions intact and ensure tap targets are at least 44×44px (especially on mobile).

## Technical Considerations

- Responsive behavior: icons must not overlap at `375px`, `768px`, `1440px`.
- Fallback consistency: all optional media should use `ImageWithFallback` (or a standardized wrapper) to avoid broken image UI.
- Accessibility: icon buttons need clear `aria-label`s and focus styles (if not already present).

## Acceptance Criteria

- [x] No broken image UI on `/product/*` when product media URLs are missing/invalid (desktop + mobile).
- [x] Gallery action icons do not overlap the main product image at `375px`, `768px`, and `1440px`.
- [x] Toolbar icons remain visible, tappable, and visually consistent (no clipping, no stacking collisions).
- [x] “Manufacturer logo” area renders a sensible fallback when unavailable (no empty/broken area).

## Success Metrics (demo-focused)

- Product detail pages look “finished” in screenshots/video capture (no broken image icons, no icon overlap).
- Users can still favorite/share (even if stubbed) without confusing UI placement.

## Dependencies & Risks

- If the “logo” is meant to be manufacturer branding, the current data model may not support it; avoid implying accuracy and use a neutral placeholder until mock data includes it.
- Changes to gallery layout can affect Swiper sizing; validate thumbnails and zoom behavior remain functional.

## Implementation Checklist (MVP)

- [x] Update `components/product/Details.vue` to use `ImageWithFallback` (or equivalent) for the right-side image.
- [x] Refactor `components/product/Gallery.vue` layout to separate icons from media (no overlap).
- [x] Quick manual QA:
  - [x] `/product/prod-19` at `375px`, `768px`, `1440px`
  - [x] A product with valid images (if available) and one with missing images

## References

- `components/product/Gallery.vue`
- `components/product/Details.vue`
- `components/global/ImageWithFallback.vue`
- `model/products/response/ProductDetailResponse.ts`
