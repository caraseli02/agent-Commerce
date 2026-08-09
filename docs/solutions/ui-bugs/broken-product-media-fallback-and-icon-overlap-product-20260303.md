---
module: Product (Nuxt Storefront)
date: 2026-03-03
problem_type: ui_bug
component: rails_view
symptoms:
  - 'Product detail showed broken image UI (missing/invalid media URL)'
  - 'Gallery action icons (favorite/share/box) overlapped the product image'
root_cause: logic_error
resolution_type: code_fix
severity: medium
tags: [nuxt, vue, image-fallback, icon-overlap, tailwind, portfolio-demo]
---

# Troubleshooting: Broken product media fallback + overlapping gallery action icons

## Problem

On product detail pages, optional media could render as a broken image icon, and the gallery action icons overlapped the primary product image. This reduced “demo readiness” for the portfolio walkthrough.

## Environment

- App: Nuxt 3 + Vue 3 + Tailwind (shadcn-nuxt)
- Routes: `/product/*`
- Reproduced on: 375px / 768px / 1440px

## Symptoms

- A “broken image” icon appeared where the manufacturer/logo image should be when the URL was missing/invalid.
- The gallery action icon column (heart/share/box) sat on top of the product image area (visual overlap), especially noticeable on mobile.

Evidence screenshots:

- `/path/to/components-marketplace/tmp/ui-review-2026-03-02/nuxt3000-product-prod-19-mobile.png`
- `/path/to/components-marketplace/tmp/ui-review-2026-03-02/nuxt3000-product-prod-19-desktop.png`

## What Didn't Work

**Direct solution:** The problem was identified and fixed on the first attempt.

## Solution

### 1) Make the “logo”/side media resilient using `ImageWithFallback`

Replace the plain `<img>` in `components/product/Details.vue` with the project’s `ImageWithFallback` component and ensure optional chaining is safe.

```vue
<!-- components/product/Details.vue -->
<ImageWithFallback
  :src="product.details?.ProductImage?.ProductImageLarge"
  alt="Manufacturer logo"
  class-name="w-[82px] h-[50px] object-contain"
/>
```

### 2) Prevent action icons from overlapping the product image

Refactor the gallery card in `components/product/Gallery.vue` from an absolutely-positioned icon stack to a `grid` layout with a dedicated toolbar column.

```vue
<!-- components/product/Gallery.vue -->
<div class="grid h-full grid-cols-[1fr_auto] gap-3">
  <!-- media column -->
  <!-- toolbar column (icons) -->
</div>
```

Related small fixes applied during refactor:

- Swiper breakpoint key corrected to `slidesPerView`
- Thumbnail height class typo fixed (`h-[50x]` → `h-[50px]`)
- Added `aria-label`s for icon buttons

## Why This Works

- `ImageWithFallback` converts missing/invalid media URLs into a consistent placeholder UI instead of the browser’s broken image icon.
- Removing `position: absolute` from the icon stack eliminates z-index/layout collisions and guarantees the media and toolbar occupy separate layout columns across breakpoints.

## Prevention

- Prefer `ImageWithFallback` (or a single standardized wrapper) for any optional/mock media.
- Avoid absolutely positioned UI affordances inside media containers on mobile; keep actions in-flow via `grid`/`flex`.
- Add a quick “portfolio demo” visual QA checklist for 375/768/1440 on high-visibility pages (`/search`, `/product/*`, `/order-summary`).

## Related Issues

- See also: `docs/solutions/ui-bugs/portfolio-demo-demo-readiness-fixes-system-20260225.md`
- Plan reference: `docs/plans/2026-03-03-fix-product-media-fallback-action-icons-plan.md`
