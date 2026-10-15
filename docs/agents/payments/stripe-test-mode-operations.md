# Ongoing Stripe test-mode operation

On 2026-10-15 the owner explicitly selected Stripe test mode for local
development, all normal Previews, and the main portfolio site. This replaces
the earlier temporary acceptance-window decision. Do not turn it off merely
because a work session ends. Live-money activation remains outside scope.

## Configuration

Keep sample catalog/login mode enabled independently from payments:

```dotenv
NUXT_PUBLIC_MOCK_MODE=true
NUXT_PUBLIC_BASE_URL_API=/api
PAYMENTS_PROVIDER=stripe
STRIPE_GATE_A_APPROVED=true
```

Store the existing test publishable key, test secret key and environment's
webhook signing secret only in ignored `.env.local` or Vercel environment
settings. Never commit their values. Fresh clone templates stay default-off;
the Stripe provider rejects live keys. Public checkout explicitly identifies
test mode; use Stripe test cards, never real card details.

Normal Preview uses Neon `vercel-dev`; the main site uses `production`.
Local development uses its own local PostgreSQL database. The earlier isolated
acceptance child is retained as evidence, not the normal Preview binding.

New PaymentIntents and Refunds carry `agentCommerceEnvironment`, derived from
Vercel's `VERCEL_ENV` or `development` locally. Each signed webhook verifies its
signature first, then acknowledges recognized foreign-environment objects
without accessing its local financial authority. Unknown environment tags stay
retryable. Untagged historical/manual objects retain conservative legacy
processing; metadata never substitutes for local identity and provider truth.
Production and Preview use separate webhook destinations/signing secrets.

## Local development

`pnpm dev` loads `.env` then private `.env.local`. Start the Stripe CLI listener
in another terminal using the same test account:

```sh
set -a
source .env.local
set +a
STRIPE_API_KEY="$STRIPE_SECRET_KEY" stripe listen \
  --device-name agent-commerce-local \
  --forward-to http://127.0.0.1:3000/api/payments/stripe/webhook
```

Use that listener's signing secret as local `STRIPE_WEBHOOK_SECRET`. Restart
the development server after changing environment values. The listener must
run for asynchronous webhook recovery; browser refresh/reconciliation alone
does not replace it.

`pnpm test`, browser-test wrappers, and coverage use isolated schemas and force
mock/off provider settings with empty Stripe secrets. Their individual provider
boundary tests supply doubles; ordinary verification never creates Stripe
objects from a developer's real test credentials.

## Delivery and rollback

Environment changes require a new deployment. A same-commit redeployment must
build; skipping because source did not change would retain old configuration.
Verify the database binding and environment tag on a real test PaymentIntent,
signed HTTPS delivery, and durable local completion on each environment.
Protected Preview webhook destinations need authenticated provider access;
do not remove protection from every Preview to make one webhook reachable.

For an incident, set provider/gate to mock/false and redeploy. Retire or isolate
immutable Stripe-enabled runtimes as appropriate; editing project variables
does not turn off an existing deployment. Preserve financial records and any
pending recovery. Do not delete databases or reset payment history.

Gate A's old-writer invariant still applies. The refreshed deployment inventory
and controlled replay evidence are attached to #559. Both controlled pre-guard
fixture deployments were retired before ongoing shared activation. Existing
guarded deployments cannot fabricate PAID for Stripe-marked payments.
Gate B schema contraction remains a separate future task.
