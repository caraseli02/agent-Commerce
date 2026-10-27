# agent-Commerce

GitHub Actions stay disabled. Husky and independent local review govern acceptance; follow [local verification](docs/agents/local-verification.md). The standalone CI migration is retired.

Components Marketplace is a Nuxt 4 e-commerce frontend prepared as a **self-contained portfolio demo** in the agent-Commerce repository.

The project includes a storefront, authenticated customer flows, and dashboard surfaces backed by local Nitro mock endpoints so the app can be reviewed without a live backend.

## Why this repo matters

- Full Nuxt 4 + Vue 3 + TypeScript application
- Storefront + account + dashboard flows in one codebase
- Local mock API built into the repo for portfolio demos
- Good fit for case study walkthroughs, screenshots, and reviewer smoke tests

## Stack

- Nuxt 4
- Vue 3 Composition API
- TypeScript
- Pinia
- Tailwind CSS
- Radix Vue / shadcn-nuxt
- Nitro server routes for mock data
- Stripe integration hooks for live mode

## Recommended mode

Use **mock mode** for local review and portfolio demos.

Mock mode keeps the app self-contained:

- no external backend required
- local Nitro endpoints answer API requests
- checkout state uses the configured PostgreSQL database after migration and explicit inventory bootstrap
- demo credentials work out of the box once `.env` is created

## Demo credentials

Choose either role in the sign-in panel. Passwords are filled internally when
the password field is left empty, or you can enter them manually:

- Customer: `customer@demo.com` / `customer123`
- Admin: `admin@demo.com` / `admin123`

## Quick start

### 1. Install dependencies

```bash
pnpm install
```

### 2. Create local env file

```bash
cp .env.example .env
```

### 3. Prepare the local checkout database

Set `DATABASE_URL` in `.env` or `.env.local`, then create the checkout schema and
explicitly initialize demo inventory:

```bash
pnpm db:migrate
pnpm inventory:bootstrap
pnpm inventory:bootstrap --apply
```

The default bootstrap command is a dry-run that reports missing catalog
inventory rows. `--apply` inserts only those missing canonical product rows.
Existing stock counts, reservations, and reservation history are preserved.
Runtime checkout requests never seed inventory. If bootstrap reports aliases,
unknown products, or corrupt stored inventory/reservation data, stop and arrange
a separately approved reconciliation before applying changes.

Shared Preview and Production databases require a separately authorized operator
bootstrap step. Deployments and runtime startup do not bootstrap inventory.

### 4. Start the app

```bash
pnpm dev
```

App runs at:

- `http://localhost:3000`

## Production build

```bash
pnpm build
pnpm preview
```

## Available scripts

```bash
pnpm dev
pnpm build
pnpm generate
pnpm preview
pnpm lint
pnpm pretty
pnpm test
pnpm test:e2e
pnpm verify
pnpm deps:outdated
pnpm deps:audit
```

`pnpm test:e2e` starts its own server at `http://localhost:3000` against an
isolated PostgreSQL schema. Do not start a separate server for that command.

`pnpm deps:outdated` and `pnpm deps:audit` force pnpm to inspect this repository
rather than a parent workspace. Both commands return a non-zero status when they
find updates or advisories; that result is the maintenance report, not a command
failure. Review and upgrade dependencies only through their scoped modernization
issues.

## Key review flows

If you are reviewing this repo for a case study or portfolio walkthrough, start here:

### Storefront

- Home page
- Search results
- Product detail page
- Cart
- Checkout entry flow

### Auth / account

- Sign-in modal
- Signup flow
- Redirect back into protected flows

### Dashboard

- Dashboard home
- Orders list
- Order detail view
- Customer control-panel account view

## Environment variables

### Required for mock mode

- `NUXT_PUBLIC_MOCK_MODE=true`
- `NUXT_PUBLIC_BASE_URL_API=/api`

Checkout persistence requires PostgreSQL in every environment. Set
`DATABASE_URL`, run `pnpm db:migrate`, review `pnpm inventory:bootstrap`, then
run `pnpm inventory:bootstrap --apply` before starting the app or its built preview. Tests create an
isolated PostgreSQL schema for each run, so they exercise the same transaction
and constraint semantics as deployments. Vercel deployments use the same
`DATABASE_URL` contract and run migrations during the build; do not provide a
SQLite path or an alternative connection-variable fallback.

Repository commands load `.env` first and then `.env.local`, so the standard
`cp .env.example .env` setup continues to work while local credentials can stay
in ignored `.env.local`. `DATABASE_URL_UNPOOLED` is optional and is used only by
the isolated-test-schema runner for Neon administration; the application itself
uses `DATABASE_URL` only.

For Vercel, this portfolio demo uses the shared `vercel-dev` Neon branch for
all Preview deployments; do not enable Neon Preview Branching for individual
pull requests. Configure the Vercel Preview-scoped `DATABASE_URL` with the
connection string for `vercel-dev`. Production continues to use the default
`production` branch. No credentials belong in this repository.

The Vercel/Neon setup is a one-time dashboard action: open **Storage** → the
`ecas` Neon resource → **Connect Project**, enable Development and Production,
and leave **Create a database branch for deployment** off for Preview. Then add
the `vercel-dev` connection string as `DATABASE_URL`, scoped to the Preview
environment in **Project Settings** → **Environment Variables**. Require the
resource to be active before deployments. The repository's Vercel build command
runs `pnpm db:migrate` before Nuxt builds; it never creates checkout tables on
a runtime request.

`pnpm test:e2e` starts its own built Nitro server inside that isolated schema.
Set `PLAYWRIGHT_BASE_URL` only when intentionally targeting an externally
managed deployment; in that case the caller owns the database/environment
alignment.

### Stripe test-mode payments

The owner selected ongoing Stripe test mode for local development, Vercel
Preview, and the main portfolio demo on 2026-10-15. Card checkout, authentication,
webhooks, reconciliation, and refunds use Stripe's real test APIs. Demo catalog
and login data remain local samples (`NUXT_PUBLIC_MOCK_MODE=true`); that setting
is independent of `PAYMENTS_PROVIDER=stripe`. No live-money keys are supported.
See [Stripe test-mode operations](docs/agents/payments/stripe-test-mode-operations.md)
for setup, environment separation, and rollback. Automated tests retain mock
provider defaults and clear real Stripe secrets inside their isolated schemas.

Private `.env.local` values are loaded by `pnpm dev`, `pnpm build`, and
`pnpm preview`. A fresh checkout still defaults off until its database and
sandbox credentials are configured. The runtime config reads:

- `NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

The server-side PaymentIntent adapter introduced for #555 also reads
`STRIPE_SECRET_KEY` (Stripe sandbox key only), `PAYMENTS_PROVIDER`, and
`STRIPE_GATE_A_APPROVED`. Its production composition requires both
`PAYMENTS_PROVIDER=stripe` and `STRIPE_GATE_A_APPROVED=true`; the checked-in
defaults leave it off. Do not enable that gate until #559 proves every older
mock-completion writer sharing the database is upgraded, retired, or isolated.
Fresh unconfigured checkouts continue to use the mock flow. When the existing
Stripe gate is explicitly approved and enabled, card checkout prepares an unpaid
Order/Payment and opens `/checkout/session?id=<order-id>` without running the mock
completion writer. That page uses Stripe's card-only Payment Element, including
bank authentication, and asks the owner-scoped resume endpoint to revalidate
Order/Inventory before mounting or confirming payment. Stripe.js results never
mark an Order paid: refresh/return reconciliation supplies the displayed state.
Client secrets stay in the page's memory and are removed from return URLs. A
canceled intent requires the explicit restart endpoint and a fresh order review.
The app does not require saved cards for this path. Other payment methods keep
the existing demo behavior. No activation setting is changed by the UI.

`tests/e2e/payment-element.spec.ts` substitutes Stripe.js at the browser boundary
with a deterministic SDK double and a synthetic publishable key from the E2E
server configuration. Those checks prove revalidation, retry/authentication
sequencing, return handling, and conservative UI states; they do not prove a real
Stripe sandbox card charge or bank 3DS challenge. Real sandbox evidence and
shared-database writer isolation remain prerequisites for activation in #559.
The #557 Stripe webhook endpoint additionally requires `STRIPE_WEBHOOK_SECRET`
from its Stripe endpoint or CLI listener. Signed paid events with a valid
reservation acknowledge after normal checkout finalization; canceled events
acknowledge after checkout terminalization. Late-paid success delivery retries the application recovery decision and the
same full Refund operation. It returns a retry response until the exact Stripe
Refund identity or successful settlement is durable; known pending refunds
continue independently through signed Refund events/reconciliation. A local
Refund row without a provider identity never authorizes acknowledgment.
After provider cancellation, `POST /api/orders/:id/restart` advances an unchanged
Cart to a new revision for the same owner and returns `reviewRequired`. A buyer
must request a fresh `/api/orders/price` review and use a new checkout request
key; the canceled Order, Payment, and PaymentIntent are never resumed.
For an existing unpaid checkout, `POST /api/orders/:id/resume-payment` enters the
owner-scoped backend resume workflow only when the Stripe gate is enabled. It
returns a safe payment action or processing state after server revalidation;
otherwise it returns a stable error without a client secret. The gate remains
off until #559's shared-database writer proof is complete.
`POST /api/orders/:id/refresh-payment` is the owner-scoped refresh/return path
for an existing checkout. It reconciles the known PaymentIntent with at most
one provider read and no client-supplied payment authority. A fully validated,
unpaid `recovery_required` claim may reconcile using its known provider
identity. The endpoint returns HTTP 200 with `recovery-required` when recovery
is still needed; the separate resume action uses a conflict response. If a
retry observes provider success but local finalization remains unavailable, it
also returns `recovery-required`. Completed replays preserve revision-aware cart
cleanup. Responses contain no provider credentials or client secret. Local
payment reads alone are informational and never confirm payment; the endpoint
is unavailable while the default-off gate is disabled.

The internal `stripeRefunds.requestFullRefund` adapter is a recovery capability,
not a customer-facing refund flow. Additive migration `007_full_refunds` stores
one full-refund record per Payment. It runs only behind the same default-off
Stripe Gate A (`PAYMENTS_PROVIDER=stripe` and `STRIPE_GATE_A_APPROVED=true`),
and new creation requires a durable `REFUND` compensation decision with its Order held and
all claim, Payment, and Order identities and amounts matching. The first valid
request persists the full Payment amount and its reason; persisted parameters
remain authoritative on retries. The Stripe create-start timestamp is committed
before provider I/O. A create retry without a known Stripe Refund ID is allowed
only strictly within 24 hours of create-start; otherwise recovery is unsafe and
must not create again. When the exact provider ID is known, recovery retrieves
that Refund and validates its identity and amount, even if Checkout has since advanced. Confirmed provider financial truth is saved independently of Checkout authorization. A Stripe in-flight same-key conflict returns pending without marking compensation recovery.

Refund state (`PENDING`, `SUCCEEDED`, or `FAILED`) is a separate financial fact
and never rewrites the Payment's `PAID` status. Reasons are Stripe API enum
values (`requested_by_customer`, `duplicate`, `fraudulent`); choosing a reason
or deciding when a commercial refund is appropriate remains an explicit policy
outside this adapter. Signed `refund.created`, `refund.updated`, and `refund.failed`
events now enter through the shared raw-body signature firewall. Migration
`009_stripe_refund_events` stores event deduplication atomically with financial
transitions. Each unseen event reads its exact Refund once from Stripe; snapshots
route identity but never select financial truth. Duplicate delivery retries
unfinished application settlement without another provider read. The internal
`stripeRefunds.reconcileRefund({ paymentId })` similarly reads only a known
Refund identity and never creates a replacement.

Signature-verified Refund events with no local Refund candidate (including
Dashboard-created refunds or missing/foreign metadata) are acknowledged only
after a durable receipt. They never update Payment, Refund, Order, or checkout
claims and never retrieve/create a Refund automatically. Migration
`010_unrecognized_refund_events` preserves existing receipts and exposes these
cases to database operators through this manual-handling view:

```sql
SELECT event_id, event_type, stripe_refund_id, stripe_payment_intent_id, observed_at
FROM checkout_stripe_refund_manual_handling
ORDER BY observed_at, event_id;
```

Review each case against Stripe/Dashboard truth and the local records before
choosing a manual action. A receipt records the signed event's references and
first server observation time, not authorization to change financial state.
Duplicate deliveries keep the same receipt; subsequent metadata or local
correlation never auto-applies that event. Known local candidates with unsafe
identity, amount, currency, or metadata still require recovery and retry.

Refund success atomically cancels the paid held Order and finalizes its REFUND
claim. Payment remains PAID. Stale pending snapshots cannot regress successful
truth. A current authoritative bank-return failure can change SUCCEEDED to FAILED;
FAILED then remains absorbing against stale success reads. Its application
consequence sets compensation_recovery_required for manual handling: an Order still
held stays ON_HOLD, and an Order already CANCELED stays CANCELED with its Payment
PAID. Neither reopens fulfillment. Unsafe identity/status reads
remain retryable and held. See [Stripe's failed refund contract](https://docs.stripe.com/refunds#failed-refunds).
Migration `008_refund_constraints` preserves migration007 and constrains provider
identity, terminal state, and non-null create-start. Missing legacy starts become
epoch anchors, refusing automatic replay. Stripe activation remains default-off.

## Mock architecture

When `NUXT_PUBLIC_MOCK_MODE=true`:

- the app routes API traffic to local Nitro endpoints under `server/api/`
- dashboard and storefront demo data come from the repository itself
- carts, checkout claims, inventory reservations, payments, and newly-created
  orders share one relational checkout store
- reviewers can inspect the product without a separate backend deploy
- the same self-contained data contract is used by `pnpm dev` and intentional
  `pnpm build && pnpm preview` demo deployments

Mock mode contains sample data and is public by design. Do not use it as a
substitute for a secured production API or connect it to real customer data.

## Project structure

```text
app/                 Nuxt source directory (~ / @ resolve here)
  components/        UI and feature components
  pages/             Nuxt routes
  layouts/           app shells
  composables/api/   Plain domain API adapters around the Nuxt $fetch client
  store/             Pinia stores
server/api/          Nitro mock endpoints
types/ helpers/      shared TypeScript types and helpers (~~ / @@ = repo root)
docs/                supporting audit/media materials
```

Planning docs:

- [Refactor stabilization PRD](docs/prds/2026-07-09-refactor-stabilization-prd.md) — verification seams, refactor timeline, and out-of-scope boundaries
- [Feature prioritization audit](docs/plans/2026-07-09-feature-prioritization-audit.md) — demo feature scoring and removal backlog

Component review:

- [Demo component contract](docs/demo-component-contract.md) — retained SVG preview routes, retired review components, and focused browser evidence

## Notes for contributors

- Package manager for this repo is **pnpm**
- `.env` is ignored; use `.env.example` as the template
- Local gates are documented in `docs/agents/verification.md`; pre-commit formats staged files. Run one strongest delivery gate (`pnpm verify:handoff` for final handoff); pre-push reuses matching successful local base-gate evidence for up to four hours and selects macOS visuals from pushed impact. Independent review runs fresh full checks for executable/unknown changes. Verified documentation-only ranges use formatting/state checks. Use `--fresh` when earlier evidence is insufficient.
- For portfolio demos, validate the key review flows above before capturing screenshots or video
