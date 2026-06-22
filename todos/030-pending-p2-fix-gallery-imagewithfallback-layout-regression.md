---
status: pending
priority: p2
issue_id: '030'
tags: [code-review, frontend, ui, images, vue]
dependencies: []
---

# Fix product gallery ImageWithFallback layout regression

Ensure gallery image sizing/styling is still applied after replacing native `<img>` tags with `ImageWithFallback`.

## Problem Statement

`components/product/Gallery.vue` now uses `ImageWithFallback`, but it passes sizing classes via the component `class` attribute. `ImageWithFallback` applies image sizing only from its `className` prop, so the inner `<img>` may render without the previous width/height/object-fit classes.

This can change gallery image and thumbnail sizing/layout compared with the previous implementation.

## Findings

- `components/product/Gallery.vue:4` and `components/product/Gallery.vue:34` replaced native `<img>` elements with `ImageWithFallback`.
- `components/product/Gallery.vue:7` and `components/product/Gallery.vue:37` pass sizing classes using `class=...`.
- `components/global/ImageWithFallback.vue:27` defines a `className` prop for styling the inner image.
- `components/global/ImageWithFallback.vue:2` and `components/global/ImageWithFallback.vue:3` apply `className` to wrapper and inner `<img>`, but not the component's inherited `class` attrs.
- Result: the wrapper receives the utility classes, but the inner `<img>` can lose `w-*`, `h-*`, and `object-contain`.

## Proposed Solutions

### Option 1: Update gallery usage to pass `className`

**Approach:** Replace `class="..."` with `:class-name="'...'"` (or `className="..."`) on `ImageWithFallback` instances in the gallery.

**Pros:**

- Smallest patch
- Restores previous sizing behavior quickly

**Cons:**

- Repeats a non-standard API (`className`) across call sites
- Easy to regress in future usages

**Effort:** 15-30 minutes

**Risk:** Low

---

### Option 2: Refactor `ImageWithFallback` to forward classes to inner image

**Approach:** Accept standard `class` attrs and explicitly forward them to both wrapper and inner image (or split wrapper/image classes).

**Pros:**

- Fixes the root ergonomics issue
- Prevents future misuse

**Cons:**

- Larger component API change
- Requires checking existing usages for side effects

**Effort:** 1-3 hours

**Risk:** Medium

## Recommended Action

**To be filled during triage.**

## Technical Details

**Affected files:**

- `components/product/Gallery.vue:4`
- `components/product/Gallery.vue:34`
- `components/global/ImageWithFallback.vue:27`

**Related components:**

- Any component using `ImageWithFallback` with `class` instead of `className`

**Database changes (if any):**

- Migration needed? No

## Resources

- **Review target:** local uncommitted changes on `main` (2026-02-25)

## Acceptance Criteria

- [ ] Main gallery image keeps the previous width/height/object-fit layout
- [ ] Thumbnail images retain expected dimensions and active/inactive styling
- [ ] Broken image fallback still renders correctly within the same size box
- [ ] No visual overflow/regression on mobile and desktop breakpoints

## Work Log

### 2026-02-25 - Review finding capture

**By:** Codex

**Actions:**

- Compared gallery image element changes from native `<img>` to `ImageWithFallback`
- Cross-checked component API in `ImageWithFallback.vue`
- Identified class forwarding mismatch as likely layout regression source

**Learnings:**

- `ImageWithFallback` currently requires `className` for inner image styling, which is easy to miss at call sites.
