# ECAS

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

- Email: `admin@ecas.com`
- Password: `admin123`

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
pnpm verify
```

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

## Project structure

```text
components/      UI and feature components
pages/           Nuxt routes
layouts/         app shells
services/        API service layer
server/api/      Nitro mock endpoints
store/           Pinia stores
types/           shared TypeScript types
docs/            supporting audit/media materials
```

## Notes for contributors

- Package manager for this repo is **pnpm**
- `.env` is ignored; use `.env.example` as the template
- `pnpm lint` currently reports legacy backlog outside this MVP cleanup pass
- For portfolio demos, validate the key review flows above before capturing screenshots or video
