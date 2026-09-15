# agent-Commerce

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
- checkout state uses the configured PostgreSQL database after `pnpm db:migrate`
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

### 3. Start the app

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
`DATABASE_URL`, run `pnpm db:migrate`, then start the app. Tests create an
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

### Optional for live integrations

These are not required for the bundled mock demo, but the runtime config supports them:

- `NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

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
components/      UI and feature components
pages/           Nuxt routes
layouts/         app shells
composables/api/ Plain domain API adapters around the Nuxt $fetch client
server/api/      Nitro mock endpoints
store/           Pinia stores
types/           shared TypeScript types
docs/            supporting audit/media materials
```

Planning docs:

- [Refactor stabilization PRD](docs/prds/2026-07-09-refactor-stabilization-prd.md) — verification seams, refactor timeline, and out-of-scope boundaries
- [Feature prioritization audit](docs/plans/2026-07-09-feature-prioritization-audit.md) — demo feature scoring and removal backlog

## Notes for contributors

- Package manager for this repo is **pnpm**
- `.env` is ignored; use `.env.example` as the template
- Local gates are documented in `docs/agents/verification.md`; pre-commit formats staged files, pre-push runs `pnpm verify` plus the reviewed macOS visual suite when supported, and CI runs `pnpm verify`
- For portfolio demos, validate the key review flows above before capturing screenshots or video
