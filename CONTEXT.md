# ECAS Context

ECAS is a Nuxt 3 + TypeScript e-commerce demo with Vue 3, Pinia, Tailwind, Firebase hooks, Stripe hooks, and local Nitro mock endpoints.

## Language

**Portfolio Demo**:
A self-contained reviewer experience that proves the e-commerce product flow and dashboard surfaces without requiring live production integrations. The standard is credible walkthrough quality, not production readiness.
_Avoid_: Production MVP, live launch, production demo

**Buyer Review Story**:
The core Portfolio Demo path where a reviewer lands on the storefront, finds a product, inspects details, adds it to cart, reaches checkout or order summary, signs in with demo credentials when needed, and sees account or order history evidence.
_Avoid_: Full customer lifecycle, production checkout, admin workflow

**Scripted Buyer Path**:
The minimum rehearsed path through the Buyer Review Story that must stay reliable and visually credible for portfolio review. It is the primary demo gate before broader page polish.
_Avoid_: Whole-app polish, all routes complete, exploratory QA

**Portfolio Demo Blocker**:
Anything that breaks or destabilizes the Scripted Buyer Path, visibly damages trust on that path, or makes the demo entry point hard for a reviewer to understand. Production hardening and off-path polish are not blockers unless they affect that reviewer experience.
_Avoid_: Nice-to-have, production readiness, full backlog

**Desktop-First Demo Standard**:
The Portfolio Demo should be polished for desktop review while remaining usable on mobile without obvious broken navigation, image, or call-to-action overlap problems. Tablet and edge breakpoints only need acceptable behavior unless they affect the Scripted Buyer Path.
_Avoid_: Desktop-only, mobile-perfect, all-breakpoint parity

**Demo Trust Risk**:
A visible problem that makes the Portfolio Demo feel unreliable or unfinished during the Scripted Buyer Path, even if the underlying feature still technically works. Broken product media, blocked mobile actions, confusing entry points, and obvious path-level layout defects are prioritized before off-path polish.
_Avoid_: Cosmetic backlog, general UX debt, issue order

**Admin Preview**:
An optional supporting Portfolio Demo chapter that shows the back-office and dashboard surfaces with sample data. It does not define the core MVP path, but it must open without crashes or obvious broken states when a reviewer chooses it.
_Avoid_: Core buyer path, production admin, full back-office workflow

**Admin Smoke Path**:
The minimum Admin Preview check: sign in as the admin demo role, load the dashboard, view orders, view customers or one customer control panel, and return without crashes, auth loops, or empty broken states.
_Avoid_: Full admin workflow, every dashboard tab, production permissions

**Admin Smoke Path Test**:
A repeatable browser check that protects the Admin Smoke Path from regressions before the Portfolio Demo is called working. It verifies access and representative dashboard surfaces rather than full admin behavior.
_Avoid_: Full admin test suite, mutation coverage, permission audit

**Portfolio Demo Readiness Gate**:
The final proof that the Portfolio Demo is working: local verification passes, the Buyer Review Story and Admin Smoke Path are covered by browser checks, desktop walkthrough surfaces are stable, mobile entry points are usable, and demo sign-in paths are clear.
_Avoid_: Production launch gate, full security audit, exhaustive route QA

**Mock Integration Boundary**:
The Portfolio Demo relies on local mock authentication, checkout, and API data to support a credible reviewer walkthrough. Live Stripe payments, production backend replacement, production auth hardening, and real customer data persistence are outside the Portfolio Demo MVP.
_Avoid_: Live integration scope, production backend, real payment flow

## Autonomous loop rules

- GitHub Issues are the task queue.
- Only issues labeled `ready-for-agent` are eligible for pickup.
- Claim work by assigning the issue and marking it `in-progress`.
- Use TDD for task implementation: failing test or regression check first, then the smallest fix, then verification.
- Keep WIP=1 so the loop works on one issue at a time.

## Source files

- `AGENTS.md` — harness/router
- `CLAUDE.md` — project-level Claude guidance
- `PROGRESS.md` — current focus and verification baseline
- `DECISIONS.md` — durable decisions
- `feature_list.json` — machine-readable harness state

## API access

- `plugins/api.ts` creates the authenticated `$fetch` client with `$fetch.create()` and provides it as `$apiClient`.
- `composables/useAPI.ts` is the SSR-friendly read helper for page/composable data loading.
- `composables/api/*` contains plain domain API functions for mutations and orchestration helpers that need the shared `$apiClient`.
- Domain composables such as `useCart`, `useOrder`, and `useCustomerDashboard` are the public interface for UI flows that need business rules or state coordination.
- Do not add a class-based service registry, `HttpFactory`, `useFetchAPI`, or component-level `$api.<domain>` calls.
