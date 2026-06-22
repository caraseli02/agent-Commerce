---
date: 2026-02-13
topic: backend-to-portfolio-demo
---

# Backend-to-Portfolio Demo Transformation

## What We're Building

Transform the existing ECAS e-commerce frontend into a portfolio-ready demo by replacing all backend dependencies with static mock data. The goal is a self-contained, interactive UI showcase that demonstrates full-stack frontend capabilities across customer-facing storefront, customer dashboard, and admin panels—without requiring any backend infrastructure.

Key requirement: All major UI surfaces must be accessible and interactive for portfolio demonstrations, but data realism is minimal. The demo should feel polished and complete to viewers, even though responses are static.

## Why This Approach

Three factors drove the choice of **Static JSON Interceptors**:

1. **Portfolio focus over realism**: Unlike a production MVP, a showcase doesn't need business logic validation, persistence, or realistic workflows. Static JSON is sufficient for demonstrating UI patterns, component architecture, and UX design.

2. **Full UI parity in 3-5 weeks**: The audit estimated 7-10 weeks for realistic mock coverage of all admin features. Static JSON intercepts dramatically reduce scope by eliminating state management, seed data modeling, and dynamic behavior.

3. **No external dependencies**: This approach keeps the app fully self-contained—no local API server, no MSW setup, no database seeding. This makes the portfolio demo portable (just `npm install && npm run dev`) and easier to host anywhere.

Alternative considered (rejected):

- **Mock Service Worker**: Would provide more realistic network simulation but adds significant setup complexity for minimal portfolio value.

## Key Decisions

- **Mock toggle via env flag**: Use `NUXT_PUBLIC_MOCK_MODE=true` to enable static responses. Keeps production code path intact.
- **Single interceptor point**: Extend `composables/useFetchAPI.ts` to check `mockMode` and return static JSON before any network request. This intercepts all 163+ UI call sites without touching individual services.
- **Minimal state persistence**: Use a simple session-based auth state (just enough to unlock dashboard routes). No localStorage, no cart persistence across reloads.
- **Page-by-page static responses**: Create organized JSON files (e.g., `mocks/products.json`, `mocks/orders.json`) that return sufficient data to populate each UI surface. Data doesn't need to be consistent across endpoints—it's for visual showcase only.
- **Fix P1 blockers first**: Address the env template mismatch, hardcoded host, and URL building bugs identified in the audit before implementing mocks. These will break even static responses.

## Open Questions

- Should auth be simulated (login works, unlocks routes) or bypassed (dashboard always accessible)? For portfolio showcase, simulated login feels more authentic but bypassed reduces complexity.
- Admin dashboards have complex data shapes (analytics widgets, audit logs). What's the minimum data needed to make them visually compelling? May need audit of admin pages to identify critical widgets.
- Should error states be showcased (404 pages, API errors) or focus only on happy paths? Portfolio value in showing error handling vs. time tradeoff.

## Next Steps

→ `/workflows:plan` for:

- Detailed mock endpoint list per page
- Static JSON structure and file organization
- Implementation checklist aligned to 3-5 week timeline
- P1 blocker fixes sequencing
