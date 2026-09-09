# System Design #6 — Domain Boundaries and Ownership

Status: Accepted — boundaries and transaction/recovery invariants validated  
Date: 2026-08-29

## Purpose

This document records the domain-boundary work completed in system-design step #6 for agent-Commerce.

The goal is not to force the application into a textbook DDD structure. The goal is to identify where business state and invariants actually belong, keep cross-domain workflows explicit, and avoid coupling modules through shared implementation models.

The conclusions below were tested against the current Nuxt/Nitro repository rather than derived only from an idealized architecture.

The original boundary decisions were followed by an adversarial transaction/recovery review. That review did not change the accepted capability map, but it tightened the contracts around idempotency, payment retries, order expiry, reservation races, cart reconciliation, and reliable event delivery.

## Pre-PlaceOrder implementation observations

The observations in this section describe the baseline used to derive the
boundaries. PR #523 subsequently implemented and production-hardened the
`PlaceOrder` slice: the order route is now a thin adapter, orchestration lives
in `server/application/checkout`, and checkout state is durable. They remain
useful migration context for the unimplemented payment-finalization and
cancellation workflows.

The current server is primarily organized as transport and utility code:

```text
server/
  api/
  utils/
```

Important business responsibilities are currently mixed across routes, helpers, types, and mock utilities.

Examples:

- `server/api/orders/new.post.ts` currently authenticates the user, loads the cart, creates an order, clears the cart, and simulates payment completion.
- `server/utils/mockCart.ts` currently resolves products, reads product stock, computes quantity-tier pricing, clamps cart quantity, persists cart state, and hydrates product entities.
- `helpers/cart-pricing.ts` currently mixes pricing logic with stock clamping.
- `server/utils/mockRuntimeOrders.ts` currently owns order creation, totals, shipping snapshots, payment state, cancellation, and runtime persistence.
- `types/cart/response.ts` combines cart state, price projections, product entities, inventory-like fields, and UI fields.
- `types/order-summary/item.ts` combines order, payment, customer, shipping, cart-product, and checkout DTO concepts.

These are useful implementation seams, but they are not reliable domain boundaries by themselves.

## Boundary discovery rule

A module boundary is justified when a capability has its own authoritative state, invariants, and business decisions.

For each candidate module we ask:

1. What data is authoritative here?
2. What rules must always be true?
3. Which operations are allowed to change that state?
4. Which external facts may be referenced without being owned?

Frontend stores, route names, database tables, and shared TypeScript interfaces do not define the domain boundary.

## Accepted capability map

```text
Catalog
→ product definition + current pricing policy

Cart
→ customer's purchase intent

Inventory
→ stock, availability, reservations, backorders

Orders
→ historical commercial transaction + order lifecycle

Payments
→ one logical local Payment per Order/checkout + payment truth

Accounts
→ current customer/account information

Checkout / application workflows
→ cross-domain orchestration
```

### Not extracted yet

The following are intentionally not separate bounded contexts at this stage:

- Pricing — runtime pricing currently remains part of Catalog until independent pricing behavior becomes complex enough to justify extraction.
- Shipping/Fulfillment — the current implementation does not yet provide enough independent lifecycle/invariant evidence.
- Notifications — primarily a consequence/reaction capability for now.
- Authentication — may later separate from customer/account profile concerns, but there is no need to force that split yet.

## Authoritative ownership matrix

| Concern                              | Authoritative owner                                    |
| ------------------------------------ | ------------------------------------------------------ |
| Product identity, SKU, sellability   | Catalog                                                |
| Current product pricing policy       | Catalog                                                |
| Requested product quantity           | Cart                                                   |
| On-hand / available stock            | Inventory                                              |
| Reservations and reservation expiry  | Inventory                                              |
| Backorder fulfillment policy         | Inventory                                              |
| Purchased item snapshot              | Orders                                                 |
| Purchased unit price                 | Orders                                                 |
| Order total                          | Orders                                                 |
| Order lifecycle/status               | Orders                                                 |
| Order payment deadline               | Orders                                                 |
| Current saved customer data          | Accounts                                               |
| Historical customer/address snapshot | Orders                                                 |
| Logical Payment status               | Payments                                               |
| External payment-provider result     | Payments interprets provider truth                     |
| Order transition to `PAID`           | Orders                                                 |
| Cross-module sequencing              | Checkout/application workflow                          |
| Place-order request idempotency      | Checkout/application workflow with durable persistence |

A key distinction is:

```text
Payment success != Order paid state
```

Payment success is a Payments fact. `PENDING_PAYMENT -> PAID` is an Orders transition caused by that fact.

---

## Cart

### Authoritative state

A minimal Cart model should represent customer intent rather than a full product/inventory projection.

```ts
type Cart = {
  id: CartId;
  ownerId: CustomerId | GuestSessionId;
  version: number;
  items: CartItem[];
  createdAt: Date;
  updatedAt: Date;
};

type CartItem = {
  productId: ProductId;
  quantity: number;
};
```

`version` represents the logical cart revision used by checkout/reconciliation. It can be implemented using another concurrency token if preferred; the design requirement is that checkout can distinguish the cart snapshot that was ordered from later customer edits.

### Owns

- Which products the customer intends to buy.
- Requested quantity.
- Cart owner/session association.
- Cart lifecycle.
- Cart revision/version.

### Does not own

- Product description.
- Current price.
- Current available inventory.
- Reservation state.
- Backorder allocation.
- Payment state.
- Order status.

### Invariants

- Quantity must be greater than zero.
- A logical product/variant should not appear as duplicate independent lines unless the business explicitly supports that.
- The cart belongs to one owner/session.
- Removed items are not part of the cart.
- A checkout must be able to identify the cart revision from which the Order was produced.

An empty cart is valid Cart state. "An empty cart cannot be checked out" is a PlaceOrder/Checkout precondition, not a Cart invariant.

### Vocabulary correction

Current cart code uses `stock` to mean "customer requested quantity", while product code uses `stock` to mean inventory quantity.

Target vocabulary:

```text
Cart: quantity / backorderQuantity when explicitly needed
Inventory: onHand / available / reserved / stock
```

### Important decision

Adding an item to Cart does not reserve inventory.

Cart owns intent. Inventory is revalidated/reserved during checkout.

---

## Catalog

### Authoritative state

Catalog owns the definition of the sellable product and, for now, its current pricing policy.

```ts
type Product = {
  id: ProductId;
  sku: string;
  name: string;
  description: string;
  manufacturer: string;
  categoryId: CategoryId;
  status: ProductStatus;
  attributes: ProductAttribute[];
  pricingPolicy: ProductPricingPolicy;
};
```

### Owns

- Product identity.
- SKU.
- Name and descriptions.
- Manufacturer/category/attributes.
- Active/inactive state.
- Sellability.
- Current pricing policy, including current quantity-tier pricing while it remains cohesive with Catalog.

### Does not own

- On-hand stock.
- Reservations.
- Order snapshots.
- Cart contents.
- Payment state.

### Invariants

- SKU is unique.
- Product identity is valid.
- Inactive products cannot be newly sold.
- Prices cannot be negative.
- Pricing configuration is internally valid.
- Quantity tiers are valid and deterministic.

A useful public query later may look like:

```ts
catalog.quote({ productId, quantity });
```

and return an authoritative current quote.

### Price authority before and after Order creation

Catalog is authoritative for the current price while checkout is constructing a new commercial transaction.

If the cart/UI showed €7 but the authoritative quote is now €8, checkout uses the authoritative €8 and informs the customer about the change before the Order is finalized according to the chosen UX policy.

Once the Order exists, the price captured in the Order becomes authoritative for that Order:

```text
Before Order creation:
Catalog quote is price authority.

After Order creation:
Order snapshot is price authority for payment/retry of that Order.
```

A retry of an existing Order must not silently reprice it using the current Catalog price.

If future business policy gives an accepted quote a limited lifetime, expiry must be explicit. The old Order is expired/cancelled according to policy and a new quote/new Order is created after customer acceptance; the historical Order is not silently mutated.

### Pricing extraction rule

Do not extract Pricing merely because files or APIs use the word "pricing".

Reconsider a separate Pricing module if pricing becomes independently complex, for example:

- customer-specific prices;
- contract price books;
- promotions/coupons;
- currency-specific pricing;
- dynamic margin policy;
- volume rules independent from Catalog lifecycle.

---

## Inventory

Inventory has stronger evidence for an independent module because reservations and concurrency create their own lifecycle and invariants.

### Authoritative state

```ts
type InventoryItem = {
  productId: ProductId;
  onHand: number;
  reserved: number;
  backorderPolicy: BackorderPolicy;
};
```

Reservations have their own lifecycle:

```ts
type Reservation = {
  id: ReservationId;
  checkoutRequestId: CheckoutRequestId;
  orderId?: OrderId;
  items: ReservationItem[];
  expiresAt: Date;
  status: 'active' | 'committed' | 'released' | 'expired';
};
```

The checkout-level correlation key exists before an Order ID necessarily exists. Inventory therefore must not depend exclusively on `orderId` to deduplicate the first reservation attempt.

### Owns

- On-hand stock.
- Reserved quantity.
- Available quantity.
- Reservations.
- Reservation expiry/release/commit.
- Stock adjustments.
- Backorder fulfillment policy.

### Core relationship

```text
available = onHand - reserved
```

For strict-stock products, reservations must not exceed valid stock. For backorder-enabled products, requested quantity can exceed immediate availability and Inventory produces a fulfillment plan.

Example:

```ts
type FulfillmentPlan = {
  immediateQuantity: number;
  backorderQuantity: number;
};
```

### Invariants

- The same inventory cannot be reserved twice for the same logical allocation.
- Repeating the same logical checkout request must not create duplicate independent reservations.
- Released reservations no longer contribute to `reserved`.
- Expired reservations cannot be committed.
- Reservation state transitions are valid.
- Stock adjustments are auditable.
- Committing/releasing reservations changes inventory consistently.

---

## Orders

Orders is currently the strongest rich domain candidate.

### Authoritative state

Order owns an immutable/historical commercial snapshot, not live Catalog or Account objects.

```ts
type Order = {
  id: OrderId;
  checkoutRequestId: CheckoutRequestId;
  sourceCartId: CartId;
  sourceCartVersion: number;
  customer: OrderCustomerSnapshot;
  items: OrderItem[];
  shippingAddress: AddressSnapshot;
  billingAddress: AddressSnapshot;
  money: OrderMoney;
  status: OrderStatus;
  paidByPaymentId?: PaymentId;
  paymentDeadlineAt: Date;
  createdAt: Date;
};
```

```ts
type OrderItem = {
  productId: ProductId;
  sku: string;
  name: string;
  unitPrice: Money;
  quantity: number;
};
```

`paidByPaymentId` means the successful/captured logical Payment that settled the Order. It remains distinct from the Order's preparation correlation; provider attempts, if introduced later, remain subordinate to that Payment.

### Owns

- Order identity.
- Historical product snapshot.
- Purchased prices.
- Historical customer/address snapshot.
- Monetary snapshot and final order total.
- Order lifecycle/status transitions.
- Payment deadline/expiry policy.
- Reference to the successful settlement, without owning provider payment truth.
- Source checkout/cart correlation needed for safe reconciliation.

### Invariants

Examples:

- Order must contain at least one item.
- Monetary totals must be derived from validated authoritative inputs.
- Order monetary values do not silently change because Catalog prices change later.
- Invalid status transitions are rejected.
- `CANCELLED -> SHIPPED` is invalid.
- `SHIPPED -> PROCESSING` is invalid.
- `PENDING_PAYMENT` cannot normally be shipped.
- `EXPIRED` cannot later become `PAID` through a normal customer retry.
- Only eligible orders can be cancelled.
- Later Catalog or Account updates must not mutate historical Order snapshots.
- A payment retry for an existing Order charges the amount due from the Order snapshot, not today's Catalog price.

Orders should evolve toward behavioral transitions such as:

```ts
order.confirmPayment(paymentId);
order.expirePaymentWindow();
order.startProcessing();
order.ship(tracking);
order.cancel();
```

rather than arbitrary external assignment of `order.status`.

### Pending-payment and expiry decision

An Order may remain `PENDING_PAYMENT` after its logical Payment becomes `FAILED` and even after the corresponding short-lived inventory reservation expires.

Important invariant:

```text
PENDING_PAYMENT does not guarantee active inventory reservation.
```

However, `PENDING_PAYMENT` is not an indefinite terminal parking state. Orders have a separate payment deadline:

```text
reservation.expiresAt
!=
order.paymentDeadlineAt
```

The reservation TTL protects inventory availability and is normally shorter. The Order payment deadline defines how long that historical Order remains eligible for another payment attempt.

Conceptually:

```text
PENDING_PAYMENT
  ├── valid successful settlement → PAID
  ├── explicit eligible cancellation → CANCELLED
  └── paymentDeadlineAt reached → EXPIRED
```

A later payment retry must first verify that the Order is still `PENDING_PAYMENT` and before `paymentDeadlineAt`. If no active reservation remains, Inventory availability/backorder policy must be revalidated and a new reservation established before starting a new charge attempt.

---

## Payments

Payments owns one logical local Payment for each prepared Order/checkout. Provider-side attempts, charges, and provider-specific lifecycle details remain behind the Payments boundary and are deferred from this preparation slice.

### Authoritative state

```ts
type Payment = {
  id: PaymentId;
  orderId: OrderId;
  amount: Money;
  provider?: PaymentProvider;
  providerReference?: string;
  status: 'PENDING' | 'PAID' | 'FAILED';
  idempotencyKey: string;
};
```

The preparation slice deliberately keeps the local status model small:

```text
PENDING → PAID | FAILED
```

Checkout preparation separately tracks workflow progress on the durable claim:

```text
prepared → payment_pending → finalized
                         └→ recovery_required
```

`payment_pending` preserves the prepared Order, reservation, and Payment IDs
when continuation crashes before local `PAID`. After local `PAID`, a failed
inventory, Order, or cart finalization moves the claim to `recovery_required`
while preserving the same tuple. A replay resumes those identities; it does
not create replacements. The portfolio mock may mark the local Payment `PAID`
after the preparation commit, but that is demo continuation and does not
implement provider reconciliation or production finalization.

Provider-specific statuses do not leak into this local model. Later provider continuation/reconciliation may distinguish:

```text
definitive failure
!=
customer action required
!=
provider still processing / outcome not yet known
!=
definitive success
```

A network timeout while contacting the provider is not evidence that the payment failed.

### Owns

- The durable logical Payment and its Order correlation.
- Amount sent to payment provider.
- Provider reference.
- Local interpretation of provider payment state.
- Provider-operation idempotency.

Refund lifecycle, captured-amount accounting, unresolved provider outcomes, and concurrency between provider attempts are deferred invariants for the later finalization/reconciliation slice.

### Invariants

- One logical Order/checkout preparation creates at most one local Payment.
- The local Payment ID is durable before any provider continuation and is reused on replay.
- The Payment amount comes from the immutable Order amount due, not a fresh Catalog quote.
- `PENDING`, `PAID`, and `FAILED` are the only local statuses in this slice.

Future provider/recovery invariants remain accepted but deferred:

- one provider idempotency key must not create duplicate charges;
- provider/network timeout is unresolved until provider evidence or reconciliation;
- refund amount cannot exceed captured amount and refunds require captured funds;
- successful captured amount cannot exceed the Order amount due;
- conflicting provider attempts must not overcharge an Order.

Provider-side attempts belong under the one logical Payment:

```text
Order: PENDING_PAYMENT
  -> Payment: PENDING
       -> provider attempts/charges (future)
```

Provider retries do not create additional local Payments for the same logical checkout.

### Provider idempotency is not checkout idempotency

Payment provider idempotency prevents duplicate execution of the same provider operation. It does not, by itself, prevent a retried checkout request from creating a second Order, second Reservation, and a second local Payment.

PlaceOrder idempotency therefore belongs at the application-workflow boundary in addition to provider-level Payment idempotency.

---

## Accounts

### Authoritative state

Accounts owns current customer/account information.

```ts
type Customer = {
  id: CustomerId;
  name: string;
  email: string;
  phone?: string;
  shippingAddresses: Address[];
  billingAddresses: Address[];
};
```

### Owns

- Current identity/profile data.
- Current email/phone.
- Saved addresses.
- Customer/account settings.
- Customer credit settings while they remain part of account policy.

### Does not own

- Historical Order address snapshots.
- Historical order email/name snapshots.
- Payment-provider state.
- Inventory.

### Invariants

- Customer identity is stable.
- Saved addresses belong to the customer.
- Only authorized actors may mutate account data.
- Credit/settings changes obey account policy.

Authentication may later become a separate capability if its behavior becomes independently complex.

---

## Checkout and cross-domain workflows

Checkout is currently an application workflow rather than a bounded context.

It owns sequencing and cross-domain request correlation, not authoritative product/order/payment/inventory business state.

Conceptually:

```text
PlaceOrder workflow
  ├── Accounts: identify/resolve customer input
  ├── Cart: read intent + cart revision
  ├── Catalog: revalidate sellability and authoritative current price
  ├── Inventory: plan/reserve fulfillment using checkoutRequestId
  ├── Orders: create immutable PENDING_PAYMENT historical snapshot
  └── Payments: prepare one local Payment
```

A PlaceOrder command should carry a client-generated or server-issued stable logical request key plus the cart revision being ordered:

```ts
type PlaceOrderCommand = {
  checkoutRequestId: CheckoutRequestId;
  cartId: CartId;
  cartVersion: number;
  // customer/address/payment-method input omitted here
};
```

The durable invariant is:

```text
same checkout identity + same checkoutRequestId
→ same logical PlaceOrder result
```

A retry caused by a lost HTTP response must return/recover the already-created logical checkout result rather than create a new Order/Reservation/charge chain.

The exact persistence mechanism is deferred to later database/reliability design, but idempotency cannot exist only in browser memory.

Checkout does not own:

- product price;
- stock;
- order lifecycle;
- payment truth;
- current customer profile.

If a future persistent `CheckoutSession` gains its own meaningful lifecycle — accepted price changes, reservation references, expiration, retry state, idempotency, etc. — the boundary should be reassessed rather than assumed today.

## Cross-domain use-case ownership

| Use case                     | Decision owner                                                   | Orchestrator / coordination                                                     |
| ---------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| AddToCart                    | Cart                                                             | Add-to-cart application use case; Catalog validation may participate            |
| PlaceOrder                   | Multiple domains                                                 | Checkout workflow; owns logical request idempotency                             |
| RetryPayment                 | Orders/Payments/Inventory each own their decision                | Payment-recovery workflow                                                       |
| Finalize successful payment  | Payments owns provider success; Orders/Inventory own transitions | Payment-finalization workflow                                                   |
| CancelOrder                  | Orders decides cancel eligibility                                | Cancel-order workflow coordinates Orders, Payments, Inventory                   |
| Mark/confirm payment         | Payments owns payment success                                    | Payment confirmation flow; Orders owns resulting order transition               |
| Change order lifecycle state | Orders                                                           | Orders application use case unless cross-domain consequences require a workflow |
| Update product               | Catalog                                                          | Catalog use case                                                                |
| Adjust inventory             | Inventory                                                        | Inventory use case                                                              |

## Synchronous calls vs events

### Rule

Use a synchronous module call when the current use case requires the result before it can continue.

Publish an event after the producing module has successfully changed its own authoritative state, primarily for independent consequences or cross-module propagation where immediate orchestration is not required.

```text
Command = please do something
Query   = tell me something
Event   = something already happened
```

### Synchronous examples

Checkout normally needs immediate answers for:

```ts
catalog.quote(...)
inventory.reserve(...)
orders.create(...)
payments.start(...)
```

Do not replace these with request/reply events merely to appear event-driven.

For the current modular-monolith target, operations that can safely participate in the same database transaction should prefer normal ACID transaction boundaries rather than introducing distributed-saga machinery for architectural symmetry.

The external payment provider remains a real asynchronous/external consistency boundary and must be handled accordingly.

### Event candidates

| Event                 | Producer  | Typical use                                                    |
| --------------------- | --------- | -------------------------------------------------------------- |
| `ProductPriceChanged` | Catalog   | projections/cache invalidation; not checkout authority         |
| `InventoryReserved`   | Inventory | audit/analytics after synchronous reserve                      |
| `OrderCreated`        | Orders    | reporting/audit after synchronous create                       |
| `PaymentSucceeded`    | Payments  | important cross-module signal to payment-finalization workflow |
| `PaymentFailed`       | Payments  | retry/recovery UX/process                                      |
| `OrderPaid`           | Orders    | notifications/fulfillment/analytics                            |
| `OrderCancelled`      | Orders    | notifications/audit after critical cancellation workflow       |
| `ReservationReleased` | Inventory | audit/monitoring                                               |
| `OrderShipped`        | Orders    | notifications/tracking-related reactions                       |

### Important payment flow

Conceptually:

```text
Provider webhook / reconciliation
        ↓
Payments
PENDING → PAID
        ↓
PaymentSucceeded
        ↓
Payment-finalization workflow
        ├── Inventory: ensure/commit valid allocation
        └── Orders: PENDING_PAYMENT → PAID
                ↓
             OrderPaid
                ↓
notifications / analytics / future fulfillment reactions
```

Payments must not directly mutate Orders through repository internals. Orders must not depend on Stripe/provider implementation.

### Reliable publication rule

A durable state change and the integration event representing that state change must not rely on two unrelated best-effort writes.

Bad failure mode:

```text
Payment row → PAID
process crashes
PaymentSucceeded event never recorded/published
Order remains PENDING_PAYMENT
```

If `PaymentSucceeded`/similar events become asynchronous durable contracts, the target design must use a reliability mechanism such as a transactional outbox or equivalent:

```text
single DB transaction
  ├── payment status = PAID
  └── durable outbox record = PaymentSucceeded
COMMIT
```

The relay/consumer side must be idempotent because external providers and durable event delivery may produce duplicates or retries.

This requirement does not imply introducing Kafka/RabbitMQ. An in-process/DB-backed outbox is sufficient until scale or deployment boundaries justify more infrastructure.

## Deferred provider failure/recovery design

The following behavior is an accepted future contract, not implemented by the
preparation slice. It preserves the timeout, refund, captured-amount,
reservation-race, and recovery invariants for the later provider/finalization
work.

## Failure/recovery decision: failed payment

For the reviewed scenario:

1. Catalog confirms the current price.
2. Inventory reserves items.
3. Order is created as `PENDING_PAYMENT` with an immutable monetary snapshot and `paymentDeadlineAt`.
4. Payment starts.
5. Provider definitively reports payment failure.
6. Customer does nothing for the retry/reservation window.

Accepted ownership/result:

### Payment

The local Payment becomes `FAILED` only after a definitive provider result is available. Provider continuation and reconciliation are not implemented by the preparation slice.

If the provider result is not definitive — for example a timeout, required customer action, or asynchronous processing — the local Payment remains `PENDING`; reconciliation is deferred.

### Order

Order remains `PENDING_PAYMENT` while it is before `paymentDeadlineAt`, so the existing logical Payment may be continued according to future provider policy.

When the payment deadline is reached without successful settlement:

```text
PENDING_PAYMENT → EXPIRED
```

Order expiry is separate from reservation expiry.

### Inventory

Reservation may remain active for a short retry window. When its TTL expires, Inventory transitions the reservation to expired/released according to its own reservation policy.

### Cart

Cart remains unchanged on payment failure.

This differs from the current mock order endpoint, which clears the cart immediately after creating the runtime order.

### Cleanup orchestration

Individual modules own their state transitions, but they do not collectively own the cross-domain cleanup process.

A checkout/payment-recovery application process coordinates actions that cross boundaries. Modules must not create chains such as Payments directly calling Inventory internals, Inventory calling Orders internals, etc.

### Retry after reservation expiry

A `PENDING_PAYMENT` Order whose previous reservation has expired cannot simply be charged later.

Before another charge attempt:

1. Confirm the Order is still `PENDING_PAYMENT` and before `paymentDeadlineAt`.
2. Revalidate any sellability constraints that still matter for fulfillment; do not replace the existing Order price with a fresh Catalog price.
3. Revalidate Inventory/backorder availability.
4. Create a new active reservation correlated with the existing checkout/order.
5. Verify that no successful settlement or conflicting unresolved provider operation already exists.
6. Continue the existing logical Payment using the existing Order amount due.

Possible lifecycle:

```text
Order ord_123: PENDING_PAYMENT

Reservation res_1: EXPIRED
Reservation res_2: ACTIVE

Payment pay_1: PENDING
  -> provider attempts/charges (future)
```

The amount for every provider continuation comes from `ord_123.money`, not a new Catalog quote.

If business policy later says the old quoted Order may no longer be honored, `ord_123` must be explicitly expired/cancelled and a fresh Order created from a fresh accepted quote. The existing Order is not repriced in place.

## #6.1 — Transaction and recovery invariants

The adversarial review identified seven reliability contracts required before step #6 can be considered implementation-ready.

### 1. PlaceOrder is idempotent as a workflow

Provider Payment idempotency is insufficient.

Failure scenario:

```text
POST /checkout
  reserve inventory ✓
  create Order ✓
  response lost ✗

client retries POST /checkout
```

The retry must not create a second logical Order/Reservation/payment chain.

Required contract:

```text
(checkout identity, checkoutRequestId)
→ at most one logical PlaceOrder result
```

The same request may safely be replayed and should resolve to the existing result or its current recoverable state.

### 2. Pending Orders have an explicit payment lifetime

`PENDING_PAYMENT` is retryable but not permanent.

```text
reservation TTL       = inventory hold lifetime
paymentDeadlineAt     = Order payment/retry lifetime
```

These clocks serve different purposes and must not be conflated.

### 3. Order price is locked for retries

Initial checkout:

```text
Cart projection
  ↓
Catalog authoritative quote
  ↓
customer is informed/accepts relevant price change
  ↓
Order immutable monetary snapshot
```

Existing Order retry:

```text
Order amount due
→ Payment amount
```

not:

```text
current Catalog price
→ silently mutate/reprice existing Order
```

### 4. Future provider attempts cannot overcharge one logical Payment

Different provider attempts may later have different provider idempotency keys. Therefore provider-level idempotency alone does not prevent:

```text
Tab A retry → provider attempt A → PAID
Tab B retry → provider attempt B → PAID
```

Required deferred policy for the current single-payment model:

- before starting a new attempt, verify the Order is still payable;
- prevent conflicting active charge attempts for the same Order;
- a successful settlement atomically/consistently closes normal retry eligibility;
- total captured amount must not exceed amount due;
- duplicate/late provider success signals must be safely idempotent;
- unexpected double capture is an exceptional compensation/refund case, not a valid steady state.

Implementation may use database uniqueness/locking/compare-and-set semantics later; step #6 fixes the invariant, not the storage primitive.

### 5. Provider outcome can be unresolved (deferred)

The system distinguishes:

```text
FAILED
```

from:

```text
provider requires action / processing / outcome not yet known
```

A timeout after sending a request to the provider cannot trigger a fresh independent charge merely because the local HTTP request failed. The existing provider operation is reconciled using its provider reference/idempotency key/webhook state first.

### 6. Payment success racing reservation expiry has an explicit recovery path

Race:

```text
reservation ACTIVE
        ↓
reservation expires/releases
        ↓
late PaymentSucceeded arrives
```

Payment success must not blindly assume the Reservation is still commit-able.

Finalization workflow:

```text
PaymentSucceeded
  ↓
Order still eligible for settlement?
  ↓
valid active reservation/allocation?
  ├── yes → commit allocation + mark Order PAID
  └── no  → attempt fresh allocation according to Inventory/backorder policy
               ├── possible → allocate/commit + mark Order PAID
               └── impossible → compensation path
```

The compensation path may require refund/void/manual recovery depending on provider semantics and later business policy. The important invariant is that a successfully captured Payment must never disappear while the Order silently remains an ordinary unpaid Order.

If authorization-before-capture is later adopted, this flow may instead reserve/revalidate before capture; that is an implementation refinement, not a boundary change.

### 7. Successful checkout reconciles the ordered Cart revision, not blindly the live Cart

Race:

```text
Cart v10: A × 2, B × 1
checkout starts from v10

customer edits another tab
Cart v11: A × 2, B × 1, C × 5

payment for v10 succeeds
```

A blind `cart.clear()` would incorrectly remove `C × 5`.

The Order therefore records enough source-cart correlation to reconcile only the purchased intent from the checkout snapshot.

Conceptually:

```text
payment success for Order built from Cart v10
→ remove/reconcile quantities represented by that Order
→ preserve unrelated changes introduced in later Cart revisions
```

Exact merge semantics are deferred to the Cart/public-contract design, but clearing the current Cart unconditionally is rejected.

## Payment-success consistency boundary

The ideal logical outcome after successful payment is:

```text
Payment: PAID
Order: PAID
Reservation/allocation: COMMITTED
```

Because the external provider cannot participate in the application's database transaction, this is an eventually consistent cross-boundary process with explicit recovery.

Within the agent-Commerce modular monolith, local state changes that can share one database transaction should do so where that materially reduces impossible intermediate states. Domain boundaries do not require separate databases or prevent an application service from coordinating a transaction across module repositories through controlled infrastructure.

The design therefore rejects both extremes:

```text
bad: pretend provider + DB are one atomic transaction
```

and:

```text
bad: introduce distributed microservice/saga infrastructure for every local module transition
```

The target is a modular monolith with strong local transactions and explicit recovery around true external boundaries.

## Module dependency rules

The current accepted rules are:

1. Each authoritative business fact has one owning module.
2. Module internals are private.
3. A domain module should not depend on another module merely to enforce its own invariant.
4. Cross-domain business processes belong in application workflows/use cases.
5. Workflows use small public module APIs, not repositories/internal models from other modules.
6. Synchronous module calls are allowed when an immediate result is required.
7. Events are used selectively after successful state changes, especially for independent consequences.
8. IDs and explicit immutable facts may cross module boundaries.
9. Read models may intentionally combine data from several modules.
10. Frontend DTOs/Pinia stores are not backend domain models.
11. Shared kernel/types must stay small; do not create giant shared `Product`, `Order`, or `User` models used by every capability.
12. The dependency graph should remain acyclic.
13. Domain-to-domain implementation imports are avoided; any cross-module contract dependency must be deliberate, public, and minimal rather than treated as an absolute industry prohibition.
14. Application workflows may coordinate a shared local database transaction without collapsing the logical domain boundaries.

## Read-model rule

A UI response may combine multiple authoritative sources without transferring ownership to Cart or another domain.

For example, the cart UI may show:

```text
STM32F407
€8 each
2 requested
1 immediately available
1 backorder
€16 subtotal
```

That response can be assembled from Cart + Catalog + Inventory + pricing policy as a read model.

The authoritative Cart itself still only needs customer intent.

## Current-code risks exposed by this review

The step #6 review identified several concrete target improvements in the existing codebase:

- `CartProductsInterface` is currently a mixed domain/read/UI model.
- Client cart requests are much larger and more authoritative-looking than necessary.
- Current cart code clamps requested quantity using Product stock even though Cart should primarily preserve customer intent and agent-Commerce supports backordering.
- Current runtime Order creation accepts client-provided `total`/`subtotal` when present; production checkout must derive authoritative monetary values server-side.
- Current Orders runtime utility directly mutates Payment status during order cancellation.
- Current cancellation route reports success even if the runtime order does not exist.
- Current Order model embeds broad `UserInterface`/Cart-derived models rather than narrow historical snapshots.
- Current `/orders/new` route is simultaneously transport, checkout orchestration, order creation, cart cleanup, and payment simulation.
- Current checkout does not yet expose a durable logical PlaceOrder idempotency key.
- Current immediate cart clearing cannot safely represent asynchronous payment plus later cart edits.
- Current simplified Payment states do not represent action-required/processing/unknown outcomes.
- Current frontend store names (`checkoutStore`, `paymentStore`, etc.) do not represent server bounded contexts and should not be used to derive backend architecture.

These are not all immediate refactor tasks. They are evidence used to define the target boundaries and future contracts.

## Deliberately rejected / deferred architecture

Do not introduce the following merely for architectural symmetry:

- one full `domain/application/infrastructure/ports/adapters` hierarchy inside every simple module;
- separate Pricing bounded context before pricing behavior proves independent complexity;
- Kafka/RabbitMQ or distributed event infrastructure for an in-process modular monolith;
- Saga/compensation machinery for operations that can remain inside normal database transactions;
- event-based request/reply for immediate Catalog/Inventory/Order queries;
- a shared global `Product`, `Customer`, or `Order` model across modules;
- fake microservice-style isolation that makes ordinary modular-monolith use cases harder to understand.

Reliability mechanisms such as durable idempotency records, transactional outbox, database constraints, locking, or compare-and-set are not rejected; they should be introduced only where the concrete invariant requires them.

The architecture should become more sophisticated only when a concrete business or reliability requirement demands it.

## Working target shape

This is conceptual only; step #6 does not freeze directory layout.

```text
Nitro API
   │
   ▼
Application workflows/use cases
   │
   ├── Catalog
   ├── Cart
   ├── Inventory
   ├── Orders
   ├── Payments
   └── Accounts
```

External payment provider is a boundary behind Payments:

```text
Stripe/provider
      ↓
Payments
      ↓
durable payment facts/events
      ↓
application finalization/recovery workflow
      ├── Orders
      └── Inventory
```

## Step #6 exit criteria

Completed:

- [x] Candidate modules challenged against current code.
- [x] Over-engineering/adversarial review performed.
- [x] Authoritative state owner defined for each accepted capability.
- [x] Major invariants identified.
- [x] Cross-domain workflows identified.
- [x] Checkout classified as orchestration rather than a bounded context for now.
- [x] Cart intent separated from Inventory truth.
- [x] Order state separated from logical Payment state.
- [x] Reservation lifecycle separated from Order lifecycle.
- [x] Synchronous calls vs event-driven reactions defined.
- [x] Payment-failure/retry/reservation-expiry scenario validated.
- [x] Deferred/uncertain boundaries explicitly recorded.
- [x] PlaceOrder workflow idempotency defined separately from provider Payment idempotency.
- [x] `PENDING_PAYMENT` Order expiry/payment deadline defined.
- [x] Existing-Order payment retry uses the immutable Order price rather than current Catalog price.
- [x] Concurrent Payment-attempt/overcharge invariant defined.
- [x] Unresolved/processing Payment outcome distinguished from definitive failure.
- [x] Reservation-expiry vs late-payment-success race has an explicit recovery/compensation path.
- [x] Successful checkout reconciles the ordered Cart revision rather than blindly clearing the live Cart.
- [x] Reliable publication requirement defined for durable cross-module payment events.
- [x] Local ACID transaction use distinguished from true external/distributed consistency boundaries.

Step #6 is now considered complete at the design/invariant level. Storage schemas, lock/constraint primitives, concrete outbox implementation, and public TypeScript contracts belong to subsequent design/implementation steps.

## Next: #7 — Public module contracts and dependency graph

Step #7 should turn these ownership and reliability decisions into explicit interfaces without implementing the full refactor yet.

Questions to answer:

- What is each module's public API?
- Which types are allowed to cross a module boundary?
- Which module internals are private?
- Which workflows may depend on which module contracts?
- Where are synchronous calls appropriate?
- Which integration events are public contracts?
- What explicit contracts represent `checkoutRequestId`, cart revision, order amount due, reservation correlation, and payment-finalization results?
- Which operations need transaction boundaries or concurrency guards at the application layer?
- How will forbidden imports and dependency cycles eventually be enforced?

The expected output is a small public-contract/dependency specification that can later guide database design, checkout sequencing, API design, reliability work, and incremental migration of the current Nitro code.
