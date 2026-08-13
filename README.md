# Components Marketplace

Nuxt 3 e-commerce frontend prepared as a **self-contained portfolio demo**.

The project includes a storefront, authenticated customer flows, and dashboard surfaces backed by local Nitro mock endpoints so the app can be reviewed without a live backend.

## Why this repo matters

- Full Nuxt 3 + Vue 3 + TypeScript application
- Storefront + account + dashboard flows in one codebase
- Local mock API built into the repo for portfolio demos
- Good fit for case study walkthroughs, screenshots, and reviewer smoke tests

## Stack

- Nuxt 3
- Vue 3 Composition API
- TypeScript
- Pinia
- Tailwind CSS
- Radix Vue / shadcn-nuxt
- Nitro server routes for mock data
- Firebase and Stripe integration hooks for live mode

## Recommended mode

Use **mock mode** for local review and portfolio demos.

Mock mode keeps the app self-contained:

- no external backend required
- local Nitro endpoints answer API requests
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

Run `pnpm dev` before `pnpm test:e2e`; the Playwright specs target `http://localhost:3000`.

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

### Optional for live integrations

These are not required for the bundled mock demo, but the runtime config supports them:

- `NUXT_PUBLIC_FIREBASE_API_KEY`
- `NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NUXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NUXT_PUBLIC_FIREBASE_MESSAGE_SENDER_ID`
- `NUXT_PUBLIC_FIREBASE_APP_ID`
- `NUXT_PUBLIC_FIREBASE_MEASUREMENT_ID`
- `NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

## Mock architecture

When `NUXT_PUBLIC_MOCK_MODE=true`:

- the app routes API traffic to local Nitro endpoints under `server/api/`
- dashboard and storefront demo data come from the repository itself
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
- Local gates are documented in `docs/agents/verification.md`; pre-commit formats staged files, pre-push runs the full verification set, and CI mirrors pre-push
- For portfolio demos, validate the key review flows above before capturing screenshots or video
