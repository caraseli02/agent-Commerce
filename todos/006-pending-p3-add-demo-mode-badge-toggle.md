---
status: pending
priority: p3
issue_id: '006'
tags: [demo, polish, ui]
dependencies: []
---

# Add Demo Mode Badge and Toggle

## Problem Statement

The demo doesn't have a visible indicator that it's running in "Demo Mode." For a portfolio showcase, visitors should clearly understand this is a demo/mock application, not a production system. A badge or toggle would clarify this.

## Findings

**Current State:**

- No visual indicator of demo mode
- Users might think it's real production
- No toggle to enable/disable demo features
- Mock data presentation is unclear

**Missing Demo Elements:**

- "Demo Mode" badge/banner in header
- Clear explanation that data is mock
- Toggle to switch between demo/real mode (even if not functional)
- Visual distinction for demo vs production

**Demo Impact:**

- Medium: Visitors may be confused about nature of demo
- Medium: Less clear portfolio presentation
- Low: Missed opportunity to show thoughtful UX

## Proposed Solutions

### Option 1: Add Demo Mode Badge in Header

**Approach:**

- Add prominent "Demo Mode" badge in top-right header
- Use badge color (e.g., amber/orange) to distinguish
- Add tooltip explaining demo mode
- Add visual indicator throughout app (subtle badge on key pages)

**Pros:**

- Clear visual indicator
- Professional portfolio presentation
- Shows thoughtful UX
- Quick to implement

**Cons:**

- Persistent element on all pages
- May need to be dismissed
- Takes header space

**Effort:** 1-2 hours

**Risk:** Low

---

### Option 2: Add Demo Mode Banner on Homepage

**Approach:**

- Add prominent banner at top of homepage
- Include explanation and "Learn More" link
- Make dismissible (X button)
- Show only once per session

**Pros:**

- Clear, upfront explanation
- Dismissible (not intrusive)
- Shows portfolio thoughtfulness
- Can include more context in "Learn More"

**Cons:**

- Only on homepage (not throughout app)
- Dismissible (users might miss it)
- Requires additional page/content

**Effort:** 1-2 hours

**Risk:** Low

---

### Option 3: Add Demo Mode Toggle in Settings

**Approach:**

- Add toggle switch in settings page
- Allow enabling/disabling demo mode
- Show different states (demo enabled/disabled)
- Persist setting in localStorage

**Pros:**

- Interactive demo feature
- Shows control panel capabilities
- Clear visual feedback
- Users understand system state

**Cons:**

- Toggle may not function without real backend
- Could confuse visitors if it does nothing
- More complex implementation

**Effort:** 2-3 hours

**Risk:** Medium

---

## Recommended Action

**To be filled during triage.** Recommend Option 1 (Header Badge) + Option 2 (Banner) for clear communication.

## Technical Details

**Affected files:**

- Create: `components/global/DemoModeBadge.vue` - Reusable badge component
- Update: `components/layout/header/main-menu/*.vue` - Add badge to header
- Create: `components/home/DemoBanner.vue` - Dismissible banner
- Update: `pages/index.vue` - Add demo banner to homepage
- Create: `composables/useDemoMode.ts` - Manage demo mode state
- Update: `nuxt.config.ts` - Add demo mode public config

**Related components:**

- Header navigation
- Homepage hero section
- Settings page
- All main layouts

**No database changes**

## Resources

- **Badge Patterns:** https://ui.shadcn.com/docs/components/badge
- **Banner Patterns:** https://www.patterns.dev/posts/banner/

## Acceptance Criteria

- [ ] DemoModeBadge component created with icon and text
- [ ] Badge added to header (persistent across app)
- [ ] Demo banner added to homepage with dismiss functionality
- [ ] Banner includes explanation that data is mock for demo
- [ ] Badge/banner use distinct color (amber/orange) for visibility
- [ ] Visitors clearly understand this is a portfolio demo
- [ ] Badge/banner feel professional and non-intrusive
- [ ] Demo mode indicator is clear and helpful

## Work Log

### 2026-02-14 - Initial Assessment

**By:** Portfolio Demo Review

**Actions:**

- Identified missing demo mode indicator
- Evaluated 3 approaches (badge, banner, toggle)
- Designed badge/banner visual style
- Planned implementation across header and homepage

**Learnings:**

- Clear demo indicator is important for portfolio
- Header badge + homepage banner is comprehensive approach
- Amber/orange color distinguishes from normal UI
- Shows thoughtful UX design
- Related to issue #005 (hover effects) - both polish improvements

---

## Notes

- **Recommendation:** Option 1 (Header Badge) + Option 2 (Banner)
- **Priority:** Medium impact on demo clarity
- **Related:** Issue #005 (hover effects) - both polish improvements
