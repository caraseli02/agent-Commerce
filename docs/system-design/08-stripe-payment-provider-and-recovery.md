# System Design #8 — Stripe Payment Provider and Recovery Contract

Status: Accepted for implementation review  
Date: 2026-09-20  
Tracks: #121

## Purpose

System-design steps #6 and #7 established domain ownership, dependency direction,
durable checkout identity, commit-before-provider behavior, and provider-neutral
Payments seams. This document records the Stripe-specific decisions needed to
replace the current mock continuation without reopening those accepted
architecture decisions.

This is an ADR/design contract, not a live Stripe implementation.

The design intentionally stays proportional to agent-Commerce:

- one Nuxt/Nitro modular monolith;
- PostgreSQL as the durable checkout/payment store;
- Stripe as an external payment provider;
- no queues, brokers, microservices, distributed saga framework, or provider-attempt
  table until a demonstrated recovery requirement justifies them.

---

## 1. Context and current implementation seam

Current `server/domain/payments/index.ts` already provides:

- one durable local Payment per prepared Order;
- `preparePayment()` before provider continuation;
- `getPaymentPreparation()`;
- `continuePayment()` outside the retryable checkout transaction;
- local `PENDING / PAID / FAILED` state;
- a provider-neutral `PaymentNextAction` seam.

Current `placeOrder` persists the checkout claim, immutable Order, inventory
reservation, and local Payment before calling provider continuation.

That commit-before-provider boundary remains accepted.

The current gaps are provider-specific:

- `continuePayment()` still simulates success;
- `provider_reference` is ambiguous;
- real provider timeout/unknown-result reconciliation is absent;
- Stripe webhooks and signature verification are absent;
- recoverable card failure is not distinguished from terminal logical failure;
- refund persistence/reconciliation is absent;
- deployed Stripe sandbox behavior has not been validated.

---

## 2. Accepted provider choice

Use the Stripe **Payment Intents API + Payment Element** for the first real
provider integration.

Stripe recommends Checkout Sessions for most integrations because it manages more
checkout features for the application. agent-Commerce deliberately chooses the
lower-level Payment Intents API because this system already owns its checkout
state: Cart, pricing, Inventory, immutable Order creation, retry policy, and
recovery. Stripe's responsibility here is intentionally narrower: collect the
already-finalized Order amount safely.

This is a deliberate feature trade-off:

```text
agent-Commerce owns checkout/commercial state
            |
            v
one durable local Payment
            |
            v
one Stripe PaymentIntent
            |
            v
Payment Element / Stripe authentication
```

The design does not model Stripe Checkout Session expiry/replacement or provider
session generations in the first implementation.

agent-Commerce keeps control of:

- cart and checkout semantics;
- server-authoritative quote/order amount;
- inventory reservation and allocation;
- immutable Order history;
- local Payment identity and state;
- retry/recovery/finalization policy.

Stripe owns:

- secure payment-method collection;
- provider-side payment/authentication lifecycle;
- 3D Secure and other required customer authentication;
- provider-side payment/refund truth.

The browser must never authoritatively decide that an Order is paid.

The amount and currency sent to Stripe come from the immutable persisted Order
snapshot, never from browser totals and never from a fresh Catalog reprice of an
existing Order.

References:

- https://docs.stripe.com/payments/payment-element
- https://docs.stripe.com/api/payment_intents

---

## 3. Dependency and adapter boundary

Target dependency direction:

```text
Nitro API / application workflow
            |
            v
      Payments public API
            |
            v
   Payments internal Stripe adapter
            |
            v
         Stripe SDK
```

Application workflows may depend on provider-neutral Payments commands/results.
They must not import Stripe SDK objects or raw Stripe status strings.

Stripe SDK types stay inside the Payments implementation boundary.

Allowed:

```ts
const result = await payments.initiatePayment({ paymentId });
```

Forbidden:

```ts
// application workflow
const intent = await stripe.paymentIntents.create(...);
```

A provider-specific webhook transport route is allowed, but it enters Payments
through the public module firewall rather than importing `payments/internal/*`
from a Nitro route.

---

## 4. Target Payments public contract

Keep the application-facing contract small and provider-neutral.

```ts
type PaymentStatus = 'PENDING' | 'PROCESSING' | 'PAID' | 'CANCELED';

type PaymentNextAction =
  | Readonly<{ type: 'none' }>
  | Readonly<{ type: 'client-secret'; clientSecret: string }>
  | Readonly<{ type: 'redirect'; url: string }>;

type PaymentContinuationResult =
  | Readonly<{ kind: 'requires-action'; nextAction: PaymentNextAction }>
  | Readonly<{ kind: 'processing' }>
  | Readonly<{ kind: 'succeeded' }>
  | Readonly<{ kind: 'retryable-failure'; message?: string }>
  | Readonly<{ kind: 'terminal-failure'; message?: string }>;

interface PaymentsService {
  preparePayment(input: PreparePaymentInput): Promise<PreparePaymentResult>;

  getPayment(paymentId: PaymentId): Promise<PaymentView | null>;

  initiatePayment(input: { paymentId: PaymentId }): Promise<PaymentContinuationResult>;

  cancelPayment(input: {
    paymentId: PaymentId;
    reason: PaymentCancellationReason;
  }): Promise<PaymentView>;

  reconcilePayment(input: { paymentId: PaymentId }): Promise<PaymentReconciliationResult>;

  requestFullRefund(input: {
    paymentId: PaymentId;
    reason: RefundReason;
  }): Promise<RefundResult>;
}
```

The exact TypeScript names may change during implementation, but these
responsibilities and boundary rules are fixed.

### Public-operation ownership

- `preparePayment()` creates or recovers the durable provider-agnostic local Payment only. It does not know about cards, Link, Payment Element, or Stripe Sessions.
- `getPayment()` reads the provider-neutral local Payment view; Stripe IDs remain internal Payments persistence details.
- `initiatePayment()` establishes or recovers the current usable provider payment flow. It must be idempotent and must not blindly create replacement provider work after a timeout.
- `reconcilePayment()` explicitly checks provider truth when local state may be stale or uncertain. It owns resulting local Payment transitions.
- `cancelPayment()` is called when the application determines the Order is permanently no longer payable. Payments owns safely making the provider flow unusable/reconciling provider truth before committing a terminal local cancellation.
- `requestFullRefund()` is called when an application workflow determines compensation is required; Payments owns creating/recovering/reconciling the Stripe refund and its durable local Refund state.
- `completePayment()`, `failPayment()`, and the old vague `continuePayment()` do not remain public application-facing commands in the Stripe contract.

The application layer decides cross-domain consequences, not provider truth. For example:

```text
Inventory allocation impossible after confirmed payment
  -> application decides a refund is required
  -> Payments.requestFullRefund(...)
  -> Payments owns Stripe refund truth/state
```

### Provider-specific ingress

The Stripe webhook endpoint may expose one narrow Stripe-specific entry point
from the Payments module because the transport itself is provider-specific:

```ts
payments.handleStripeWebhook({
  rawBody,
  signature,
});
```

This does not permit Stripe SDK objects to leak into application workflows,
Orders, Inventory, Catalog, Cart, or Accounts.

---

## 5. Local Payment state model

Use only four persisted local states:

| State | Meaning |
| --- | --- |
| `PENDING` | The logical Payment is still payable/retryable. It may already have a reusable Stripe PaymentIntent. |
| `PROCESSING` | Stripe is actively processing the payment or the provider outcome is temporarily uncertain. |
| `PAID` | Provider success has been confirmed locally. |
| `CANCELED` | The logical Payment is terminal because the application no longer permits this Order to be paid and Payments has established that the provider can no longer collect money. |

Creating/recovering a Stripe PaymentIntent does **not** by itself move the local
Payment to `PROCESSING`. A PaymentIntent can exist while the customer has not
yet completed a payment attempt.

That gives `PENDING` a simple meaning:

```text
the Order can still be paid
```

A normal card decline, invalid payment method, or other recoverable
payment-method failure returns/remains `PENDING`; it does not terminally fail
the logical Payment.

Stripe-specific statuses such as `requires_payment_method`,
`requires_confirmation`, and `requires_action` remain internal provider
details. They are translated into provider-neutral results / `PaymentNextAction`
instead of becoming additional ECAS database states.

### Valid transition table

| Current | Provider/local fact | Next | Notes |
| --- | --- | --- | --- |
| `PENDING` | PaymentIntent created/recovered; customer can still act | `PENDING` | return the client secret / Payment Element action; provider identity is durable but payment is not processing yet |
| `PENDING` | Stripe reports active processing or provider outcome is unknown after confirmation | `PROCESSING` | provider work is now in flight/uncertain |
| `PROCESSING` | recoverable payment-method failure | `PENDING` | customer may retry on the same logical Payment/PaymentIntent |
| `PENDING` / `PROCESSING` | definitive success | `PAID` | monotonic success |
| `PENDING` | application determines the Order is permanently no longer payable | `CANCELED` | cancel the PaymentIntent first when one exists |
| `PROCESSING` | application requests cancellation | reconcile/cancel provider state first | do not commit `CANCELED` until Payments has established that Stripe cannot still collect money |
| `PAID` | duplicate/stale failure/processing/cancellation signal | `PAID` | success must not regress |
| `CANCELED` | stale non-success event | `CANCELED` | terminal cancellation remains terminal |

The implementation must enforce transitions conditionally in PostgreSQL rather
than reading a state and later assuming it is unchanged.

### Cancellation race and compensating refund

`cancelPayment()` means "make this logical Payment permanently unable to
collect money", not merely "set a local status to canceled".

If no PaymentIntent exists yet, a `PENDING` Payment can become local
`CANCELED` directly.

If a PaymentIntent exists, Payments asks Stripe to cancel it when its Stripe
status is cancelable. Only after cancellation/reconciliation establishes that
the PaymentIntent cannot still collect money may the local Payment become
`CANCELED`.

There is an unavoidable race where the customer may complete payment while ECAS
is attempting to cancel:

```text
application decides Order is no longer payable
  -> Payments.cancelPayment()
  -> Stripe already succeeded concurrently
  -> reconcile provider truth
  -> Payment = PAID
  -> application performs paid-order recovery
       -> allocate/backorder if business policy allows
       -> otherwise requestFullRefund()
```

A successful provider payment always wins over a concurrent local cancellation
request. Never force `PAID -> CANCELED`.

The full refund is therefore a compensating recovery for late/concurrent success
when the Order can no longer be fulfilled. It is not the normal implementation
of cancellation.

---

## 6. Persistence decision

Keep provider persistence intentionally small:

```text
checkout_payments
-----------------
id
order_id
status
amount_minor
currency
stripe_payment_intent_id  TEXT NULL
...
```

The first implementation enforces:

```text
UNIQUE (order_id)
UNIQUE (stripe_payment_intent_id)   -- when non-NULL
```

The application may still perform lookup/recovery logic, but PostgreSQL is the
final concurrency-safe authority preventing two logical Payment rows from being
attached to the same Order.

Do not add Checkout Session identity, provider-session generations, or provider-
attempt rows.

Do not persist a generic `provider` discriminator in the first implementation.
Stripe is the only real runtime payment provider in scope. The mock provider is
a deterministic test adapter, not a business/domain provider identity stored in
PostgreSQL.

The existing generic `provider_reference` column is retired once the migration
and code change are complete.

The payment status constraint changes from the current implementation:

```text
PENDING | PAID | FAILED
```

to:

```text
PENDING | PROCESSING | PAID | CANCELED
```

The durable local Payment is committed before the external provider call, so
`stripe_payment_intent_id` starts as `NULL`.

Conceptual timeline:

```text
pay-123 PENDING
stripe_payment_intent_id = NULL
      |
      | local transaction commits
      v
Stripe PaymentIntent create/recover
      |
      v
persist pi_123
      |
      v
Payment stays PENDING until customer/provider activity is genuinely in flight
```

Persisting the PaymentIntent identity is independent from setting
`PROCESSING`; the existence of a PaymentIntent alone does not mean money is
being processed.

---

## 7. Stripe PaymentIntent identity and idempotency

Use one durable Stripe PaymentIntent for one logical local Payment / Order.

Stripe recommends one PaymentIntent per order or customer session and notes that
the same PaymentIntent records the history of payment attempts while producing
at most one successful charge.

The initial PaymentIntent create uses a deterministic Stripe idempotency key
derived from the durable local Payment identity:

```text
payment:pay-123:intent
```

Retries of that same create operation reuse the same key.

A network timeout or lost response is an unknown outcome, not permission to
create another PaymentIntent. The retry uses the same idempotency key, recovers
the same Stripe object, and persists its `pi_*` identity.

Attach non-sensitive ECAS correlation metadata where useful:

```text
paymentId = pay-123
orderId   = ord-456
```

Do not store card data, customer secrets, addresses, or other sensitive values
in Stripe metadata merely for convenience.

Because customer retries can reuse the same PaymentIntent, the first
implementation does not need a provider-attempt/session-generation table.

---

## 8. Normal payment sequence

```mermaid
sequenceDiagram
    participant B as Browser
    participant A as Nitro/Application
    participant P as Payments
    participant DB as PostgreSQL
    participant S as Stripe

    B->>A: Place order
    A->>DB: Validate/prepare Cart, Order, Reservation, Payment
    DB-->>A: Commit pay-123 PENDING
    A->>P: initiatePayment(pay-123)
    P->>S: Create/recover PaymentIntent (stable idempotency key)
    S-->>P: pi_* + client secret
    P->>DB: Persist pi_*
    P-->>A: requires-action + client secret
    A-->>B: Render Payment Element
    B->>S: Confirm payment / 3DS if required
    B->>A: Ask ECAS for current payment state
    A->>P: reconcilePayment(pay-123)
    P->>DB: Read local state
    P->>S: Retrieve PaymentIntent if local state is uncertain
    P->>DB: Apply valid provider-neutral transition
    P-->>A: PAID / PROCESSING / PENDING
```

Browser completion/return is not authoritative payment truth.

### Client-side payment confirmation

The first implementation uses Stripe's Payment Element in the browser to confirm
the PaymentIntent.

```text
Nitro / Payments
  -> create or recover PaymentIntent
  -> return client secret

Browser
  -> render Payment Element
  -> user submits payment
  -> Stripe.js confirms the PaymentIntent
  -> Stripe handles card data and required authentication
```

Card/payment-method details do not pass through the Nitro API.

The browser may display immediate provider UI results, but it must not mark the
Order or local Payment as paid. After confirmation/return, the browser asks ECAS
for current state; Payments reconciliation and/or the Stripe webhook establish
provider truth, and the application workflow performs cross-domain finalization.

Do not add a server-side PaymentIntent confirmation endpoint in the first slice
unless a demonstrated payment method or provider requirement needs one.

---

## 9. Timeout / lost-response recovery sequence

```mermaid
sequenceDiagram
    participant A as Application
    participant P as Payments
    participant DB as PostgreSQL
    participant S as Stripe

    A->>P: initiatePayment(pay-123)
    P->>S: Create PaymentIntent, key payment:pay-123:intent
    S--xP: Response lost / timeout
    Note over DB: pay-123 remains durable; pi_* may still be NULL locally
    A->>P: retry initiatePayment(pay-123)
    P->>S: Retry same create operation with same idempotency key
    S-->>P: Same PaymentIntent result
    P->>DB: Persist pi_*
```

Provider timeout is never converted directly to local `CANCELED` or to a new
logical Payment.

---

## 10. Browser refresh, 3DS, and reconciliation

The browser asks ECAS for payment/checkout status after refresh, return from
authentication, or uncertain UI state.

Recovery order:

```text
Browser
  -> ECAS backend
       -> PostgreSQL first
       -> Stripe only when local provider state is uncertain
       -> apply valid local Payment transition inside Payments
       -> application workflow retries local finalization if PAID
```

`reconcilePayment()` performs one bounded provider reconciliation request. It
waits a reasonable amount of time for the Stripe API call itself to answer, but
it does not loop internally waiting for Stripe's payment state to stop being
`processing`.

If Stripe still reports processing:

```text
Payments.reconcilePayment()
  -> return PROCESSING
  -> browser may retry ECAS reconciliation for a limited period
  -> Stripe webhook remains an independent completion path
```

The UI may poll ECAS briefly for a smoother experience, but must stop aggressive
polling after a bounded period and continue showing a safe processing/finalizing
state. A long-running provider payment must not hold a Vercel request open.

The frontend must not treat a Stripe redirect, Payment Element callback, or URL
parameter as authoritative settlement.

A useful intermediate customer state is:

```text
Payment received — finishing your order
```

3D Secure and other additional authentication remain Stripe UI/provider
concerns. They do not create an ECAS `REQUIRES_3DS` persistence state.

Payments owns interpreting Stripe truth and moving the local Payment to
`PAID`; Payments does **not** finalize Inventory, Orders, or Cart. Once the
application workflow observes `PAID`, it owns retry-safe cross-domain
finalization.

---

## 11. Webhook contract

Provider route:

```text
POST /api/payments/stripe/webhook
```

Required behavior:

1. Read the raw request body required for Stripe signature verification.
2. Verify the Stripe signature before trusting the event.
3. Correlate the event to the local Payment using persisted Stripe IDs and/or
   non-sensitive ECAS metadata.
4. If the provider event is ambiguous or stale, reconcile current Stripe state
   instead of trusting arrival order.
5. Record the Stripe event ID and its corresponding local Payment transition in
   the same PostgreSQL transaction.
6. Return `2xx` after the small durable local transition commits.
7. A duplicate committed event becomes a no-op.

### Atomic dedup invariant

For a handled event:

```text
Stripe event ID recorded
        <=>
corresponding local Payment transition committed
```

The first implementation does not need separate `RECEIVED / PROCESSED` event
states.

Conceptual transaction:

```sql
BEGIN;

INSERT INTO stripe_webhook_events (event_id, event_type, payment_id, created_at)
VALUES (...);

UPDATE checkout_payments
SET status = ...
WHERE id = ...
  AND status IN (...);

COMMIT;
```

If the transaction rolls back, the event is not considered handled and a Stripe
retry may safely process it.

Do not hold this transaction open while waiting on slow Stripe API calls.
Provider reconciliation, when needed, happens before the short local transaction.

### Initial event scope

Keep subscriptions narrow. The first implementation only needs events that can
change owned payment/refund truth.

| Stripe event | Initial ECAS behavior |
| --- | --- |
| `payment_intent.succeeded` | Reconcile and transition the local Payment to `PAID` if valid; trigger/retry application finalization. |
| `payment_intent.processing` | Reconcile and keep/move the local Payment to `PROCESSING` when provider work is genuinely in flight. |
| `payment_intent.payment_failed` | Reconcile; return the logical Payment to retryable `PENDING` when appropriate. A provider attempt failure does not mean the logical Payment is `CANCELED`. |
| `payment_intent.canceled` | Reconcile a deliberate cancellation and move to local `CANCELED` only when success cannot have won the race. |
| `refund.created` | Correlate the local Refund and reconcile its current Stripe status. |
| `refund.updated` | Reconcile the local Refund; update to `SUCCEEDED` or remain `PENDING` as provider truth requires. |
| `refund.failed` | Reconcile and mark the local Refund `FAILED` when definitive. |

Broader Stripe event coverage is deferred unless implementation proves it is
required for a correctness gap.

Webhook arrival order is never used as the source of truth.

---

## 12. Paid finalization and late-success recovery

Payment truth and fulfillment truth remain separate.

Normal success:

```text
Payment PAID
  -> Inventory.commit(existing reservation)
  -> Orders.confirmPayment / markPaid
  -> checkout claim finalized
  -> revision-aware Cart cleanup (best effort)
```

All local finalization transitions must remain retry-safe.

### Paid after reservation expiry

An expired reservation cannot be resurrected.

When Stripe establishes a late successful payment:

```text
Payment PAID
  -> Inventory.allocatePaidOrder()
       -> allocated
            -> finalize Order
       -> backordered
            -> keep payment
            -> mark appropriate delayed/backorder fulfillment state
            -> notify customer
       -> unavailable
            -> request full refund
            -> notify customer
```

A successful Payment must never be rewritten to `CANCELED` because fulfillment
later became impossible.

---

## 13. Payment retry after reservation expiry

Retry is user initiated; ECAS does not automatically re-charge.

Before reopening/continuing provider payment:

1. load the immutable Order and existing logical Payment;
2. verify the Order is still payable;
3. verify/re-establish Inventory reservation/allocation eligibility;
4. if commercial facts remain unchanged, continue the same Order and logical
   Payment;
5. if commercial facts changed, require explicit review and a new checkout
   rather than mutating the historical Order.

Same commercial intent recovers the same checkout/payment identity. Changed
commercial intent creates a new checkout after explicit review.

### Returning to an unfinished payment

There is no requirement to create a new provider session merely because the
customer returns later.

Keep the payment view/modal visible while ECAS revalidates business state.
Temporarily disable payment submission and show:

```text
We're checking that your order is still available…
```

Recovery flow:

```text
buyer returns to payment
  -> application revalidates Order + Inventory
       -> still payable / reservation valid or safely re-established
            -> Payments retrieves/reuses the same PaymentIntent
            -> re-enable/re-render Payment Element in place
       -> no longer payable / inventory unavailable
            -> Payments safely cancels the PaymentIntent when one exists
            -> keep checkout context visible
            -> explain why payment cannot continue
            -> offer a path back to order/cart review
```

Do not redirect the customer away merely because time passed. Only leave the
payment step when revalidated business state makes payment impossible or
requires explicit commercial review.

This cross-domain recovery belongs in an application workflow such as
`resumeOrderPayment`:

```text
resumeOrderPayment
  -> Orders: is the existing Order still payable?
  -> Inventory: is reservation valid or can it be re-established?
  -> Payments.initiatePayment(existing paymentId)
```

`Payments.initiatePayment()` creates or recovers the existing PaymentIntent. It
must not decide inventory availability or Order payability.

---

## 14. Refund contract

Refund is a separate durable financial fact.

A successfully collected Payment remains:

```text
Payment = PAID
```

even if a refund later succeeds.

Initial durable Refund model:

```ts
type RefundStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED';

type PaymentRefund = Readonly<{
  refundId: string;
  paymentId: PaymentId;
  amountMinor: number;
  currency: string;
  status: RefundStatus;
  stripeRefundId: string | null;
  reason: RefundReason;
  createdAt: string;
  updatedAt: string;
}>;
```

First implementation supports full refunds only.

For that scope, PostgreSQL enforces one logical Refund per Payment:

```text
UNIQUE (payment_id)
UNIQUE (stripe_refund_id)   -- when non-NULL
```

This keeps retry/recovery on the same durable Refund row if the Stripe request
times out or its response is lost, instead of creating duplicate local refund
intents. A failed or uncertain provider operation is reconciled against that same
logical Refund.

Partial refunds, arbitrary customer-service refund UI, and multi-refund allocation
are out of scope. If multiple or partial refunds become a real requirement later,
the one-Refund-per-Payment constraint and model must be deliberately redesigned.

Refund creation/retry must be idempotent and reconciled with Stripe after
unknown outcomes.

---

## 15. Failure-oriented validation matrix

| Failure | Required behavior |
| --- | --- |
| Browser retries PlaceOrder | Existing checkout claim / Payment is recovered; no new Order/Payment. |
| Stripe create request times out | Reuse the same Payment-derived idempotency key; do not blindly create another session. |
| Stripe succeeds but local response is lost | Refresh/retry reconciles the existing local Payment and provider object. |
| Browser refreshes during 3DS | Browser asks ECAS; ECAS reads PostgreSQL then reconciles Stripe if required. |
| Duplicate webhook | Unique event ID + same-transaction transition makes the duplicate a no-op. |
| Out-of-order failure after success | Local `PAID` does not regress. |
| Webhook DB transaction crashes | Event ID and Payment transition both roll back; retry remains safe. |
| Payment succeeds after reservation expiry | Allocate, backorder, or full-refund according to Inventory result; Payment remains `PAID`. |
| Refund request outcome is unknown | Reconcile the same logical Refund/provider refund rather than inventing another refund. |
| Newer Cart revision exists after payment | Finalized purchase remains true; cleanup must not destroy the newer Cart. |

---

## 16. Testing and deployment evidence

Use three practical validation levels.

### Level 1 — CI / deterministic integration

Use the mock provider with real PostgreSQL semantics to test:

- local Payment state transitions;
- checkout/payment idempotency;
- timeout/unknown-result recovery logic;
- duplicate/out-of-order event handling;
- same-transaction webhook deduplication;
- PostgreSQL concurrency/conditional transitions;
- late-success allocation/backorder/refund branches.

### Level 2 — local Stripe sandbox

Use a Stripe sandbox with the real Stripe SDK, Payment Element, and Stripe CLI
webhook forwarding to exercise:

- successful payment;
- recoverable decline;
- 3D Secure/additional authentication;
- provider timeout/retry behavior where practical;
- webhook signature verification;
- duplicate event replay;
- full refund and refund reconciliation.

### Level 3 — Vercel Preview + Stripe sandbox

Validate the deployed browser/server/runtime boundary:

- real PaymentIntent creation/recovery from a Preview deployment;
- Payment Element rendering and return flow;
- HTTPS webhook delivery/signature verification;
- payment success -> local finalization;
- refresh/recovery;
- independent serverless invocation behavior;
- full-refund recovery path where practical.

Production real-money rollout is explicitly out of scope for this ADR.

---

## 17. Explicit non-goals

Do not add in the first Stripe implementation:

- app-owned saved-card/customer wallet;
- separate provider-attempt persistence;
- manual authorization/capture;
- partial refunds;
- background queues/brokers;
- microservices;
- distributed saga framework;
- direct Stripe SDK usage in application workflows or other domains;
- repricing an existing Order during payment retry.

Stripe Link/provider-managed saved methods can be evaluated later without making
the application own card credentials.

---

## 18. Implementation slices after ADR acceptance

Implementation should be split so each slice proves one failure-oriented
guarantee.

### Slice A — Payment persistence/state migration

- add `PROCESSING`;
- add one unique nullable Stripe PaymentIntent ID;
- remove `provider_reference`;
- keep current local Payment identity/Order correlation.

### Slice B — Stripe adapter + PaymentIntent creation

- Stripe SDK isolated inside Payments;
- one PaymentIntent per logical local Payment / Order;
- Payment Element client-secret contract;
- deterministic Payment-derived Stripe idempotency key;
- metadata correlation;
- retry/timeout recovery of the same PaymentIntent.

### Slice C — payment UI / customer-action flow

- Payment Element in the ECAS checkout modal/page;
- provider-neutral `requires-action` handling;
- processing/finalizing state;
- no app-owned saved-card implementation.

### Slice D — webhook + payment reconciliation

- Stripe signature verification;
- durable event-ID deduplication;
- same-transaction event record + local transition;
- duplicate/out-of-order safety;
- browser refresh/reconciliation path;
- retry-safe paid finalization.

### Slice E — late success + full refund recovery

- expired-reservation paid allocation;
- allocated/backordered/unavailable handling;
- durable full Refund entity;
- refund idempotency/reconciliation.

### Slice F — sandbox deployment validation

- deterministic CI/mock + PostgreSQL coverage;
- local Stripe sandbox/CLI evidence;
- Vercel Preview + Stripe sandbox smoke;
- document remaining production-only risks.

Create implementation issues for these slices only after this ADR is reviewed
and accepted.

---

## 19. Consequences and trade-offs

### Benefits

- preserves the accepted modular-monolith dependency direction;
- keeps Stripe replaceable at the Payments boundary without prematurely building
  a generic multi-provider framework;
- preserves durable local identity before provider I/O;
- handles the highest-risk failure cases: timeout, duplicate events, stale events,
  browser refresh, and late success;
- keeps the first implementation understandable and reviewable.

### Accepted limitations

- no provider-attempt history means intentionally replacing one Stripe Checkout
  Session for the same local Payment is not yet modeled;
- only full refunds are supported;
- no application-owned saved-card wallet;
- no proactive/background recovery if the customer never returns and no webhook
  arrives; add recovery infrastructure only if real evidence requires it.

These limitations are deliberate scope choices, not accidental omissions.

---

## 20. Relationship to earlier design documents

This ADR refines, but does not replace:

- `06-domain-boundaries-and-ownership.md`;
- `07-public-module-contracts-and-dependency-graph.md`.

Where those documents describe the earlier preparation-only
`PENDING / PROCESSING / PAID / CANCELED` model or neutral `providerReference`, this ADR is the
accepted provider-specific refinement for the Stripe implementation slice.

The invariant that remains unchanged is:

```text
durable local Payment first
        ->
provider I/O second
        ->
retry/reconcile using the same logical identities
```
