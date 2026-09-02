# PlaceOrder Production Hardening Handoff

Status: **Partially completed by PR #523 (`fa532db2`)**

This is not a new numbered system-design phase. It is the hardening pass for
the `PlaceOrder` vertical slice introduced after System Design #7. PR #523
delivered the durable persistence foundation, but this document remains the
acceptance record for the remaining canonical-read and pricing-reconciliation
requirements.

## Why this exists

The System Design #6/#7 work established module boundaries, ownership, application workflows, retry-safety, and checkout idempotency contracts. The first `PlaceOrder` implementation was then merged and deployed to production.

A real production UI smoke test exposed that several guarantees were implemented with process-local mock state. Those guarantees hold inside one Node.js process, but not across Vercel/serverless invocations. Before designing/implementing `finalizePayment`, the current `PlaceOrder` slice must be hardened so orders, cart state, idempotency, inventory/payment state, and pricing survive real runtime boundaries.

## Related architecture docs

Read these first:

- `docs/system-design/06-domain-boundaries-and-ownership.md`
- `docs/system-design/07-public-module-contracts-and-dependency-graph.md`

Relevant commits:

- `97585deea611de2e137862ffe3787cd0269ba20a` — initial #6 domain boundaries
- `6547df8514623b9acf37195619eed4af6c736344` — checkout transaction/recovery hardening
- `4091a66b9ad13b3d8d88faebef053251de3fe3be` — System Design #7 public contracts/dependency graph
- `71db205c65a61a5b88bfec6e9c0a889afacc4229` — `feat: route place order through domain boundaries`

Related shared architecture discussion:

- Adversarial Review Chat: https://chatgpt.com/share/6a9559a8-29e4-83eb-a341-32505869e60c

## Current architectural direction — preserve this

Do **not** roll back the modular-monolith direction or bypass the public domain seams.

Dependency direction remains:

```text
Nitro API / external adapters
          |
          v
Application workflows
          |
          +--> Catalog public API
          +--> Cart public API
          +--> Inventory public API
          +--> Orders public API
          +--> Payments public API
          +--> Accounts public API
```

Domain modules do not directly coordinate with each other. Cross-domain sequencing belongs in `server/application/**`.

Do not introduce Kafka/RabbitMQ, a distributed saga framework, microservices, or deep Clean Architecture folder trees for this hardening pass.

## Production smoke result

Production smoke failed in the buyer order flow.

| Check                 | Result                                                   |
| --------------------- | -------------------------------------------------------- |
| Homepage              | Pass                                                     |
| Add STM32             | Fail — one click resulted in quantity `2`                |
| Cart counter/total    | Fail — counter `1`, quantity `2`, total `1999.98 Lei`    |
| Order summary         | Rendered, but pricing was inconsistent                   |
| Demo customer sign-in | Pass                                                     |
| Checkout UI           | Pass                                                     |
| Place order           | Intermittent — first `POST /api/orders/new` returned 404 |
| Retry/rapid submit    | Reached `/checkout/success?id=<order-id>`                |
| Success state         | Fail — `Order details unavailable`                       |
| Cart cleared          | Pass                                                     |
| Order history         | Fail — new reference absent                              |
| Console/network       | Fail — hydration mismatch warnings + checkout 404        |
| Duplicate protection  | Inconclusive/unsafe across runtime instances             |

Additional pricing regression after authenticated sign-in:

```text
line subtotal:     949.99 Lei
Payment Summary:   999.99 Lei
calculated total: 1209.89 Lei
```

## Root causes already identified

### 1. Fresh mock carts are pre-seeded with STM32 quantity 1

`server/utils/mockCart.ts` creates new carts with `prod-1` at stock `1`. The first visible Add-to-cart action therefore increments the existing line to quantity `2`.

This is a demo-data/UI bug, not an idempotency failure.

Expected hardening: a fresh buyer cart should start empty unless a test explicitly requests seeded data.

### 2. Cart persistence is not shared across Vercel instances

Current cart state combines:

- module-level `Map`
- local `.data/mock-sessions` filesystem persistence

That is not a shared durable store in a serverless deployment. `PlaceOrder` can therefore receive a cart ID that existed in another invocation and return `cart_not_found`/404.

### 3. Runtime orders are process-local

Newly-created runtime orders are stored in a module-level `Map`. The success page performs a separate HTTP request (`GET /api/orders/:id`), which may run in another instance and therefore cannot retrieve the just-created order.

This explains `Order details unavailable` after a seemingly successful checkout.

### 4. Order history reads a different source than checkout writes

The order-history endpoint reads static/demo order data and does not consume the same repository used by new runtime orders. Even in one process, a newly created order is therefore not guaranteed to appear in history.

There must be one canonical order persistence abstraction used for create/read/list.

### 5. Idempotency and workflow guarantees are process-local

The following currently use in-memory Maps or equivalent process-local state:

- PlaceOrder coordinator request/semantic-key claims
- Orders checkout-request idempotency
- Inventory rows/reservations
- Payments by order
- Cart revision tracking

The design contract requires duplicate requests to remain harmless across crashes/retries/instances. Process-local Maps cannot provide that guarantee.

### 6. Pricing has multiple authorities

The authenticated demo customer has a 5% account discount.

The checkout line mapper applies that customer discount:

```text
999.99 * 0.95 = 949.9905 -> 949.99
```

But Payment Summary prefers the Pinia/cart subtotal, which still contains `999.99`.

Separately, the new server Catalog quote currently resolves tier pricing but does not yet incorporate the authenticated customer's pricing/discount policy.

The browser must not independently decide the final payable price. The persisted order snapshot must be produced from one server-authoritative quote/pricing policy.

## Hardening scope

This is a **focused PlaceOrder hardening pass**, not a general application refactor.

### P0 — durable/shared state

Replace process-local checkout guarantees with persistence that works across Vercel invocations.

At minimum, the implementation must provide shared durable state for the guarantees needed by `PlaceOrder`:

- order create/read/list
- checkout request idempotency
- semantic one-checkout-per-cart-revision claim
- cart state/revision needed by checkout
- inventory reservation state
- payment state required by the currently implemented synchronous demo flow

Use the repository's existing infrastructure where possible. Inspect the repo before choosing a persistence adapter. Prefer the smallest production-correct solution; do not introduce distributed infrastructure that the current scale does not require.

For order idempotency, prefer a database-enforced uniqueness guarantee (for example `UNIQUE(customer_id, checkout_request_id)`) rather than relying solely on application-memory checks.

### P0 — canonical Orders repository

All of these must use the same persisted source of truth:

```text
Orders.createPending(...)
GET /api/orders/:id
GET /api/orders?... / client order history
```

A checkout that returns `orderId` successfully must make that exact order retrievable immediately and visible in the authenticated customer's history.

### P0 — authoritative pricing

Make one server-side pricing/quote policy authoritative for checkout.

It must account for the pricing rules already represented by the demo/application, including relevant tier price and customer/product discount policy.

The resulting immutable commercial snapshot must be what Orders persists.

The following must agree:

```text
checkout line unit price
checkout line subtotal
Payment Summary subtotal/discount/total
server PlaceOrder quote
persisted Order snapshot
success/order-history display
```

Do not trust `subtotal`/`total` sent by the browser as authoritative money.

### P1 — fresh cart starts empty

Remove implicit STM32 quantity `1` from normal fresh-cart creation. If fixture/test scenarios need seeded carts, make seeding explicit.

### P2 — hydration warnings

Investigate only after the P0/P1 order-flow problems are fixed, unless a hydration issue directly blocks the buyer smoke path.

## Preserve these PlaceOrder semantics

Do not weaken the contracts established in #6/#7:

1. Same customer + same checkout request ID + same logical input -> same order/result.
2. Same checkout request ID + different input -> idempotency conflict.
3. Same unchanged cart revision with different request IDs -> at most one active logical checkout.
4. Catalog/pricing authority is server-side.
5. Inventory reservation is idempotent.
6. Order creation is idempotent.
7. Payment creation/ensure is idempotent.
8. Cart completion is revision-aware; later cart edits must not be silently deleted.
9. Cross-domain coordination remains in the application layer.
10. API/application code imports domain public APIs, not another domain's internals.

## Tests required before calling PlaceOrder complete

Keep existing tests and add coverage that specifically breaks process-local assumptions.

At minimum:

### Persistence/read-after-write

```text
PlaceOrder returns orderId
-> independent order read retrieves it
-> independent order list/history includes it
```

Tests should not rely on reading the same in-memory object used during creation.

### Duplicate PlaceOrder

```text
request A: checkoutRequestId=X
request B: checkoutRequestId=X
```

Across independent repository/service instances, there must still be one logical order/payment/reservation.

Also test two different request IDs racing on the same `customer + cart + revision`.

### Pricing

Authenticated demo customer with 5% discount:

```text
catalog/base tier price = 999.99
final customer unit price = 949.99
```

The server quote, UI summary and persisted order snapshot must reconcile to the same money values.

### Cart

A new normal cart is empty. One Add STM32 action produces quantity `1`, not `2`.

### Buyer-flow acceptance

Run the full production/preview smoke after deployment:

```text
1. Homepage renders
2. Add STM32 once -> quantity 1
3. Cart counter/total correct
4. Open order summary
5. Sign in as demo customer
6. Checkout line + Payment Summary prices agree
7. Choose/confirm shipping + payment
8. Place order
9. Success page loads the created order
10. Cart is cleared/reconciled correctly
11. New order appears in order history
12. Repeat/rapid submit does not create duplicate logical order/payment
13. Check console/network for order-flow errors
```

## Definition of done

`PlaceOrder` is complete only when the deployed runtime demonstrates these properties:

```text
✓ order state survives independent requests/instances
✓ same checkout request cannot create a second logical order
✓ same cart revision cannot start two logical checkouts
✓ returned orderId is retrievable
✓ returned order appears in history
✓ cart completion is revision-safe and durable
✓ checkout prices reconcile everywhere
✓ fresh cart + one Add action = quantity 1
✓ production/preview buyer smoke passes
```

After this hardening passes, return to the existing system-design sequence and continue with the next workflow: **`finalizePayment`** and its durable recovery semantics.

## Codex execution instruction

Start by reading this document plus System Design #6 and #7, then inspect the current repository implementation rather than assuming the findings above are still exact. Reproduce/confirm each root cause against the latest `main` before editing.

Implement the smallest coherent hardening slice that satisfies the P0 acceptance criteria. Preserve current domain boundaries and public APIs unless a contract must change for correctness; if so, explain why in the PR/commit.

Run the repository verification suite after changes and add focused tests for cross-instance/durable idempotency, canonical order reads, pricing reconciliation, and the empty-cart invariant. Do not continue into `finalizePayment` until the PlaceOrder acceptance criteria above pass.
