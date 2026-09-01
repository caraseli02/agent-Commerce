# Refactor Stabilization and Review Documentation PRD

GitHub issue: [#301](https://github.com/caraseli02/agent-Commerce/issues/301)

## Problem Statement

The Components Marketplace Portfolio Demo has gone through several major refactor waves: mock-mode conversion, API boundary cleanup, dependency and performance consolidation, B2B storefront polish, mobile audit remediation, harness skill updates, and the latest before/after UI audit pass. These changes improved the Scripted Buyer Path and Admin Preview, but the documentation is spread across commits, PRs, issues, progress notes, and screenshot artifacts.

The team needs one reviewable product document that explains what changed, why it matters for the Portfolio Demo, what still needs validation, and which follow-up slices should be handled by agents without reopening broad refactor scope.

## Solution

Create a consolidated refactor stabilization workstream that treats the recent refactors as one documented product capability: a self-contained, reliable Portfolio Demo with clear boundaries, repeatable evidence, and small follow-up tasks. The documentation should preserve the intent of the refactors while turning review risks into independently grabbable work.

The workstream should focus on the highest public seams:

- `pnpm verify` as the static and unit verification seam.
- Scripted Buyer Path browser smoke as the primary runtime seam.
- Admin Smoke Path browser smoke as the supporting dashboard seam.
- API-boundary invariants as the architecture seam.
- Screenshot comparison artifacts as visual review evidence, not as the only proof.

## User Stories

1. As a portfolio reviewer, I want the storefront to load without external setup, so that I can evaluate the product quickly.
2. As a portfolio reviewer, I want product search, product detail, cart, and order summary to stay reliable, so that the Buyer Review Story feels credible.
3. As a portfolio reviewer, I want demo sign-in to be clear, so that protected flows do not look broken.
4. As a portfolio reviewer, I want the Admin Preview to open representative dashboard surfaces, so that the project demonstrates back-office depth.
5. As a mobile reviewer, I want navigation, product cards, banners, and footer content to remain usable, so that mobile defects do not reduce trust.
6. As a developer, I want API calls to stay behind the shared API boundary, so that auth, token handling, and mock/live behavior are not scattered.
7. As a developer, I want dependency consolidation decisions documented, so that future agents do not reintroduce duplicate date, lodash, chart, font, or image approaches.
8. As a developer, I want runtime-only libraries loaded only where needed, so that the Portfolio Demo keeps startup and build behavior predictable.
9. As a developer, I want Firebase initialization to stay lazy in mock mode, so that the demo does not require live Firebase configuration.
10. As a developer, I want the Nuxt image migration intent documented, so that future image work uses shared fallbacks and stable sizing.
11. As an agent planner, I want refactor follow-ups split into narrow slices, so that WIP=1 remains enforceable.
12. As an agent generator, I want each slice to name the expected verification seam, so that implementation does not stop at compile success.
13. As an evaluator, I want exact evidence expectations, so that I can reject premature victory without reconstructing context.
14. As an evaluator, I want issue and PR overlap called out, so that duplicate or conflicting refactor work is caught before merge.
15. As a maintainer, I want screenshot comparison artifacts to be reproducible, so that visual audit evidence can be regenerated after changes.
16. As a maintainer, I want the PR body to reflect actual scope and risk, so that broad refactor branches are reviewable.
17. As a maintainer, I want external asset dependencies to be explicit, so that the self-contained Portfolio Demo standard remains honest.
18. As a maintainer, I want active issue claims and related PRs to stay aligned, so that one issue is not fixed in two branches.
19. As a future agent, I want the Matt Pocock skill-bundle update described separately from app UI changes, so that harness changes do not hide runtime behavior changes.
20. As a future agent, I want the latest UI audit fixes documented as a follow-upable product surface, so that remaining issues can be handled without another broad polish branch.
21. As a future agent, I want the major refactor timeline summarized, so that I can understand why current patterns exist before changing them.
22. As a future agent, I want out-of-scope boundaries recorded, so that this PRD does not become a mandate for broad production hardening.

## Implementation Decisions

- Treat Components Marketplace as a Portfolio Demo, not a production launch. The standard is credible walkthrough quality for the Buyer Review Story plus a stable Admin Preview.
- Keep mock mode as the default local and review path. Live Firebase, Stripe, and backend integration hardening stay outside this stabilization workstream unless they block the demo.
- Preserve the API access architecture: shared API client, SSR-friendly reads, and plain domain API functions for mutations and orchestration. Avoid returning to component-level HTTP calls or class-based service registries.
- Record the dependency consolidation refactors as durable direction: use the chosen date utility, chosen lodash auto-import surface, self-hosted fonts, lazy chart loading, lazy Firebase initialization, and Nuxt image/shared fallback approach.
- Separate harness skill-bundle updates from app behavior changes during review. They can live in the same historical branch, but future work should avoid mixing agent-instruction updates with runtime UI changes.
- Treat the latest UI audit pass as evidence-backed polish across search results, product detail, order summary, checkout disabled state, mobile home, and mobile order summary.
- Keep category count normalization owned by the dedicated category-count issue and PR. Do not merge duplicate fixes from a broader audit branch without reconciling ownership.
- Keep screenshot comparison generation deterministic. The capture command should accept the app base URL or document the required port instead of relying on an implicit local server.
- Make external image usage an explicit product choice. If remote demo imagery is acceptable, document it as a dependency; if the demo must be fully self-contained offline, move promo images into local assets or shared fallback components.
- Keep PR descriptions filled with actual scope, verification, known risks, and evaluator expectations. A broad branch with a template-only body is not review-ready even if CI passes.
- Convert any remaining broad refactor concerns into independent issues, each with one behavior, one expected seam, and one verification path.

## Testing Decisions

- Good tests should verify observable demo behavior through public seams, not private implementation details.
- The highest seam for ordinary stabilization is `pnpm verify`, because it covers build, lint, typecheck, unit tests, and feature-list validation.
- The highest runtime seam for storefront work is the Scripted Buyer Path browser smoke: home, search, product detail, cart or order summary, sign-in when needed, and protected continuation.
- The highest runtime seam for dashboard work is the Admin Smoke Path browser smoke: admin sign-in, orders, customers, and one customer account/control-panel surface.
- The highest architecture seam is the existing API-boundary invariant check, which should prevent authenticated request logic from leaking outside approved API modules.
- Visual polish should use browser evidence or screenshot comparison as supporting proof, but should not replace route-level smoke where behavior is affected.
- Screenshot capture utilities should be tested by running them against a known local dev server and confirming that the expected comparison output is regenerated.
- Follow-up tests should prefer existing Vitest and Playwright patterns already used for product card fallbacks, admin smoke, cart/order summary, mock-mode badge layout, and browse-product coverage.

## Refactor Timeline

Major refactor waves that shaped the current Portfolio Demo architecture:

| Period             | Theme                               | Representative work                                                                                                                            | Why it matters                                                                     |
| ------------------ | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 2026-02            | Mock backend migration              | Nitro `server/api/` mock endpoints, portfolio-demo mode                                                                                        | Self-contained reviewer experience without live backend                            |
| 2026-03–04         | API boundary cleanup                | `composables/api/*` adapters, service deletions (#52–#55)                                                                                      | Auth, token handling, and mutations stay behind one seam                           |
| 2026-05–06         | Dependency consolidation            | `nuxt-lodash`, self-hosted fonts, lazy Firebase/charts, Nuxt image fallbacks                                                                   | Predictable build/runtime; no duplicate utility stacks                             |
| 2026-06            | Harness engineering                 | `AGENTS.md`, verification ladder, evaluator loop, PR template (#73, #314)                                                                      | Observable agent workflow with machine-checkable done gates                        |
| 2026-07            | Mobile UX audit + storefront polish | Product cards, carousels, nav drawer, footer, dashboard tables (#233–#241, #359–#360)                                                          | Scripted Buyer Path and Admin Preview stay credible on mobile                      |
| 2026-07            | Cart/checkout hardening             | Stock clamp, volume tiers, guest checkout SSR gate, truthful checkout states (#357–#368)                                                       | Commerce path resists adversarial quantity and state bugs                          |
| 2026-07 (proposed) | Session persistence + performance   | Draft PRs for cart/pricing disk persistence (#348/#382, #350/#384), bundle splitting (#349/#383), optimistic cart (#385/#386) — not merged yet | Planned follow-ups only; do not treat as settled architecture until those PRs land |

Use this timeline before changing patterns: merged rows reflect deliberate portfolio-demo trade-offs; the proposed row is directional context only, not production launch scope.

## Out of Scope

- Full production payment integration.
- Real customer data persistence.
- Production security hardening beyond the current mock-demo boundary.
- Replacing all remote mock product images unless a self-contained-offline decision is made separately.
- Reworking the full visual system.
- Combining multiple open GitHub issues into a single broad refactor.
- Changing package manager, framework, or primary state-management choices.
- Rewriting the agent harness or skills beyond documenting the current refactor implications.

## Further Notes

- Recent refactor groups reviewed for this PRD include API adapter migrations, checkout/cart continuity fixes, dependency consolidation, image handling, lazy runtime initialization, B2B storefront polish, mobile UX audit remediation, admin smoke coverage, and the current Matt Pocock skill-bundle update plus UI audit branch.
- Review finding: PR #286 currently mixes harness skill updates with app UI/data/script changes and has an unfilled PR template body. That makes evaluator review harder than the passing CI status suggests.
- Review finding: PR #286 overlaps the category count normalization work that is already represented by issue #245 and PR #300. Reconcile before merge to avoid duplicate ownership.
- Review finding: the audit screenshot capture script assumes a local server on port 3005 while the documented dev server default is port 3000. Make this configurable or document the exact run command.
- Review finding: the latest UI audit pass replaces local promo imagery with direct remote image URLs. This may be acceptable because mock product data already uses remote demo imagery, but it should be documented as a dependency or moved behind a local/shared fallback if the self-contained standard means offline review.
- Review finding: no originating issue or PRD was referenced by the two commits on PR #286. Future broad refactor branches should link to a PRD, issue, or sprint contract before app behavior changes are added.
