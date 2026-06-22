---
status: pending
priority: p3
issue_id: '005'
tags: [demo, polish, visual]
dependencies: []
---

# Add Hover Effects and Micro-interactions

## Problem Statement

The demo has good component design but lacks polish through hover effects, transitions, and micro-interactions. For a portfolio showcase, adding these subtle animations makes the demo feel more refined and demonstrates attention to UI details.

## Findings

**Current State:**

- Buttons: Basic hover states (if any)
- Product cards: Limited hover effects
- Navigation: Minimal active/hover states
- Tables: No row hover or selection effects
- Links: Basic underline/color change only

**Missing Micro-interactions:**

- Button scale/shadow on hover
- Product card elevation/transform on hover
- Image zoom on product cards
- Smooth transitions for modals and dialogs
- Subtle animations for adding to cart/favorites
- Ripple or tap feedback for interactive elements

**Demo Impact:**

- Low: Demo feels static and "flat"
- Low: Less impressive portfolio presentation
- Low: Missed opportunity to show UI animation skills

## Proposed Solutions

### Option 1: Add Tailwind Hover Effects

**Approach:**

- Add hover scale to buttons: `hover:scale-105`
- Add elevation to product cards: `hover:shadow-lg hover:-translate-y-1`
- Add image zoom on hover: `hover:scale-110 transition-transform`
- Add smooth transitions: `transition-all duration-300`
- Apply to all interactive elements consistently

**Pros:**

- Easy with Tailwind utility classes
- Smooth, polished feel
- Demonstrates Tailwind skills
- Quick to implement

**Cons:**

- May need to customize existing component classes
- Consistency across components
- Subtle but requires attention to detail

**Effort:** 2-3 hours

**Risk:** Low

---

### Option 2: Add Vue Transitions

**Approach:**

- Use Vue's `<Transition>` component for modals/dialogs
- Add `<TransitionGroup>` for list items
- Add fade/slide animations for page routes
- Use `transition` prop from Nuxt for route transitions
- Add smooth enter/leave animations

**Pros:**

- Professional, framework-level animations
- Smooth and polished
- Shows Vue/Nuxt animation skills

**Cons:**

- More complex than CSS hovers
- Requires understanding of Vue transition modes
- May affect performance if overused

**Effort:** 3-4 hours

**Risk:** Medium

---

### Option 3: Keep Current Minimal State (Add Only Key Effects)

**Approach:**

- Add hover effects only to key interactive elements
- Keep subtle and minimal
- Focus on most impactful animations (buttons, product cards)
- Skip complex transitions

**Pros:**

- Minimal effort
- Low risk of over-animation
- Focus on most visible improvements

**Cons:**

- Less comprehensive polish
- Missed opportunity to show full skills
- Still feels somewhat static

**Effort:** 1-2 hours

**Risk:** Low

---

## Recommended Action

**To be filled during triage.** Recommend Option 1 (Tailwind Hover Effects) for best effort-to-impact ratio.

## Technical Details

**Affected files:**

- Update: `components/ui/button/Button.vue` - Add hover scale/shadow
- Update: `components/global/ProductCard.vue` - Add hover elevation/transform
- Update: `components/dashboard/orders/*` - Add row hover effects
- Update: `components/dataTable/*` - Add row selection/hover
- Update: `components/layout/header/*` - Add nav link hover effects
- Update: App.vue - Add route transition

**Related components:**

- All shadcn UI components (button, card, etc.)
- Product cards and grids
- Navigation and menu components
- Tables and lists

**No database changes**

## Resources

- **Tailwind Hover Effects:** https://tailwindcss.com/docs/hover-focus-and-other-states
- **Vue Transitions:** https://vuejs.org/guide/built-ins/transition.html
- **Nuxt Transitions:** https://nuxt.com/docs/getting-started/transitions

## Acceptance Criteria

- [ ] Buttons have hover scale/shadow effects
- [ ] Product cards have hover elevation and smooth transition
- [ ] Product images zoom slightly on hover
- [ ] Table rows have hover background/color change
- [ ] Navigation links have clear hover/active states
- [ ] Modals/dialogs have smooth fade/slide transitions
- [ ] "Add to cart/favorites" actions have tap feedback
- [ ] All animations are smooth (60fps)
- [ ] Transitions feel responsive and polished

## Work Log

### 2026-02-14 - Initial Assessment

**By:** Portfolio Demo Review

**Actions:**

- Reviewed current interaction states across demo
- Identified missing hover effects and transitions
- Evaluated 3 approaches to adding micro-interactions
- Researched Tailwind hover utilities and Vue transitions

**Learnings:**

- Hover effects add significant polish with minimal effort
- Tailwind makes hover states easy to implement
- Vue transitions add professional feel
- Micro-interactions demonstrate attention to detail
- Related to issue #006 (demo mode badge) - both polish improvements

---

## Notes

- **Recommendation:** Option 1 (Tailwind Hover Effects)
- **Priority:** Low/Medium polish improvement
- **Related:** Issue #006 - both demo polish enhancements
