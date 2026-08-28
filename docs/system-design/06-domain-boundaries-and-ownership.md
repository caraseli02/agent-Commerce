# System Design #6 — Domain Boundaries and Ownership

Status: Accepted for the current design phase  
Date: 2026-08-28

## Purpose

This document records the domain-boundary work completed in system-design step #6 for ECAS.

The goal is not to force the application into a textbook DDD structure. The goal is to identify where business state and invariants actually belong, keep cross-domain workflows explicit, and avoid coupling modules through shared implementation models.

The conclusions below were tested against the current Nuxt/Nitro repository rather than derived only from an idealized architecture.

## Current implementation observations

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
→ payment attempts + payment truth

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

| Concern | Authoritative owner |
| --- | --- |
| Product identity, SKU, sellability | Catalog |
| Current product pricing policy | Catalog |
| Requested product quantity | Cart |
| On-hand / available stock | Inventory |
| Reservations and reservation expiry | Inventory |
| Backorder fulfillment policy | Inventory |
| Purchased item snapshot | Orders |
| Purchased unit price | Orders |
| Order total | Orders |
| Order lifecycle/status | Orders |
| Current saved customer data | Accounts |
| Historical customer/address snapshot | Orders |
| Payment attempt status | Payments |
| External payment-provider result | Payments interprets provider truth |
| Order transition to `PAID` | Orders |
| Cross-module sequencing | Checkout/application workflow |

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
  id: CartId
  ownerId: CustomerId | GuestSessionId
  items: CartItem[]
  createdAt: Date
  updatedAt: Date
}

type CartItem = {
  productId: ProductId
  quantity: number
}
```

### Owns

- Which products the customer intends to buy.
- Requested quantity.
- Cart owner/session association.
- Cart lifecycle.

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
  id: ProductId
  sku: string
  name: string
  description: string
  manufacturer: string
  categoryId: CategoryId
  status: ProductStatus
  attributes: ProductAttribute[]
  pricingPolicy: ProductPricingPolicy
}
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
catalog.quote({ productId, quantity })
```

and return an authoritative current quote.

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
  productId: ProductId
  onHand: number
  reserved: number
  backorderPolicy: BackorderPolicy
}
```

Reservations have their own lifecycle:

```ts
type Reservation = {
  id: ReservationId
  orderId?: OrderId
  items: ReservationItem[]
  expiresAt: Date
  status: 'active' | 'committed' | 'released' | 'expired'
}
```

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
  immediateQuantity: number
  backorderQuantity: number
}
```

### Invariants

- The same inventory cannot be reserved twice for the same logical allocation.
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
  id: OrderId
  customer: OrderCustomerSnapshot
  items: OrderItem[]
  shippingAddress: AddressSnapshot
  billingAddress: AddressSnapshot
  money: OrderMoney
  status: OrderStatus
  paymentId?: PaymentId
  createdAt: Date
}
```

```ts
type OrderItem = {
  productId: ProductId
  sku: string
  name: string
  unitPrice: Money
  quantity: number
}
```

### Owns

- Order identity.
- Historical product snapshot.
- Purchased prices.
- Historical customer/address snapshot.
- Monetary snapshot and final order total.
- Order lifecycle/status transitions.
- Reference to payment, without owning provider payment truth.

### Invariants

Examples:

- Order must contain at least one item.
- Monetary totals must be derived from validated authoritative inputs.
- Invalid status transitions are rejected.
- `CANCELLED -> SHIPPED` is invalid.
- `SHIPPED -> PROCESSING` is invalid.
- `PENDING_PAYMENT` cannot normally be shipped.
- Only eligible orders can be cancelled.
- Later Catalog or Account updates must not mutate historical Order snapshots.

Orders should evolve toward behavioral transitions such as:

```ts
order.confirmPayment(paymentId)
order.startProcessing()
order.ship(tracking)
order.cancel()
```

rather than arbitrary external assignment of `order.status`.

### Pending-payment decision

An Order may remain `PENDING_PAYMENT` even after a payment attempt fails and its inventory reservation later expires.

Important invariant:

```text
PENDING_PAYMENT does not guarantee active inventory reservation.
```

A later payment retry must revalidate current Catalog/Inventory conditions and create a new reservation before a new charge attempt if no active reservation remains.

---

## Payments

Payments is an independent authority for payment attempts, but should remain a small module until complexity justifies richer layering.

### Authoritative state

```ts
type Payment = {
  id: PaymentId
  orderId: OrderId
  amount: Money
  provider: PaymentProvider
  providerReference?: string
  status: PaymentStatus
  idempotencyKey: string
}
```

Potential statuses:

```text
PENDING
SUCCEEDED
FAILED
REFUND_PENDING
REFUNDED
```

### Owns

- Payment attempts.
- Amount sent to payment provider.
- Provider reference.
- Local payment status.
- Refund lifecycle.
- Idempotency.

### Invariants

- One idempotency key must not create duplicate charges.
- A succeeded payment does not become failed because of a later retry attempt.
- Refund amount cannot exceed captured amount.
- Refunded payments must have had captured funds.
- External provider result is authoritative for card/provider-backed payment success.

One Order can have multiple attempts:

```text
Order: PENDING_PAYMENT

Payment #1: FAILED
Payment #2: FAILED
Payment #3: SUCCEEDED
```

This is why Payment attempt state should not be collapsed into Order status.

---

## Accounts

### Authoritative state

Accounts owns current customer/account information.

```ts
type Customer = {
  id: CustomerId
  name: string
  email: string
  phone?: string
  shippingAddresses: Address[]
  billingAddresses: Address[]
}
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

It owns sequencing, not authoritative business state.

Conceptually:

```text
PlaceOrder workflow
  ├── Accounts: identify/resolve customer input
  ├── Cart: read customer intent
  ├── Catalog: revalidate sellability and current price
  ├── Inventory: plan/reserve fulfillment
  ├── Orders: create PENDING_PAYMENT historical snapshot
  └── Payments: start payment attempt
```

Checkout does not own:

- product price;
- stock;
- order lifecycle;
- payment truth;
- current customer profile.

If a future persistent `CheckoutSession` gains its own meaningful lifecycle — accepted price changes, reservation references, expiration, retry state, idempotency, etc. — the boundary should be reassessed rather than assumed today.

## Cross-domain use-case ownership

| Use case | Decision owner | Orchestrator / coordination |
| --- | --- | --- |
| AddToCart | Cart | Add-to-cart application use case; Catalog validation may participate |
| PlaceOrder | Multiple domains | Checkout workflow |
| CancelOrder | Orders decides cancel eligibility | Cancel-order workflow coordinates Orders, Payments, Inventory |
| Mark/confirm payment | Payments owns payment success | Payment confirmation flow; Orders owns resulting order transition |
| Change order lifecycle state | Orders | Orders application use case unless cross-domain consequences require a workflow |
| Update product | Catalog | Catalog use case |
| Adjust inventory | Inventory | Inventory use case |

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

### Event candidates

| Event | Producer | Typical use |
| --- | --- | --- |
| `ProductPriceChanged` | Catalog | projections/cache invalidation; not checkout authority |
| `InventoryReserved` | Inventory | audit/analytics after synchronous reserve |
| `OrderCreated` | Orders | reporting/audit after synchronous create |
| `PaymentSucceeded` | Payments | important cross-module signal to Orders |
| `PaymentFailed` | Payments | retry/recovery UX/process |
| `OrderPaid` | Orders | notifications/fulfillment/analytics |
| `OrderCancelled` | Orders | notifications/audit after critical cancellation workflow |
| `ReservationReleased` | Inventory | audit/monitoring |
| `OrderShipped` | Orders | notifications/tracking-related reactions |

### Important payment flow

```text
Stripe/provider webhook
        ↓
Payments
PENDING → SUCCEEDED
        ↓
PaymentSucceeded
        ↓
Orders
PENDING_PAYMENT → PAID
        ↓
OrderPaid
        ↓
notifications / analytics / future fulfillment reactions
```

Payments must not directly mutate Orders through repository internals. Orders must not depend on Stripe/provider implementation.

## Failure/recovery decision: failed payment

For the reviewed scenario:

1. Catalog confirms the current price.
2. Inventory reserves items.
3. Order is created as `PENDING_PAYMENT`.
4. Payment starts.
5. Provider reports payment failure.
6. Customer does nothing for the retry/reservation window.

Accepted ownership/result:

### Payment

The failed attempt becomes `FAILED`; it does not remain `PENDING` after the provider has definitively reported failure.

### Order

Order remains `PENDING_PAYMENT` so another payment attempt may be made.

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

1. Revalidate product sellability/current price as required.
2. Revalidate Inventory/backorder availability.
3. Create a new active reservation.
4. Start a new idempotent Payment attempt.

Possible lifecycle:

```text
Order ord_123: PENDING_PAYMENT

Reservation res_1: EXPIRED
Reservation res_2: ACTIVE

Payment pay_1: FAILED
Payment pay_2: FAILED
Payment pay_3: SUCCEEDED
```

After successful payment:

```text
Order: PENDING_PAYMENT → PAID
Reservation: ACTIVE → COMMITTED
```

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
- Current cart code clamps requested quantity using Product stock even though Cart should primarily preserve customer intent and ECAS supports backordering.
- Current runtime Order creation accepts client-provided `total`/`subtotal` when present; production checkout must derive authoritative monetary values server-side.
- Current Orders runtime utility directly mutates Payment status during order cancellation.
- Current cancellation route reports success even if the runtime order does not exist.
- Current Order model embeds broad `UserInterface`/Cart-derived models rather than narrow historical snapshots.
- Current `/orders/new` route is simultaneously transport, checkout orchestration, order creation, cart cleanup, and payment simulation.
- Current frontend store names (`checkoutStore`, `paymentStore`, etc.) do not represent server bounded contexts and should not be used to derive backend architecture.

These are not all immediate refactor tasks. They are evidence used to define the target boundaries.

## Deliberately rejected / deferred architecture

Do not introduce the following merely for architectural symmetry:

- one full `domain/application/infrastructure/ports/adapters` hierarchy inside every simple module;
- separate Pricing bounded context before pricing behavior proves independent complexity;
- Kafka/RabbitMQ or distributed event infrastructure for an in-process modular monolith;
- Saga/compensation machinery for operations that can remain inside normal database transactions;
- event-based request/reply for immediate Catalog/Inventory/Order queries;
- a shared global `Product`, `Customer`, or `Order` model across modules;
- fake microservice-style isolation that makes ordinary modular-monolith use cases harder to understand.

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
Stripe/provider → Payments → payment facts/events → Orders
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
- [x] Order state separated from Payment attempt state.
- [x] Reservation lifecycle separated from Order lifecycle.
- [x] Synchronous calls vs event-driven reactions defined.
- [x] Payment-failure/retry/reservation-expiry scenario validated.
- [x] Deferred/uncertain boundaries explicitly recorded.

## Next: #7 — Public module contracts and dependency graph

Step #7 should turn these ownership decisions into explicit interfaces without implementing the full refactor yet.

Questions to answer:

- What is each module's public API?
- Which types are allowed to cross a module boundary?
- Which module internals are private?
- Which workflows may depend on which module contracts?
- Where are synchronous calls appropriate?
- Which integration events are public contracts?
- How will forbidden imports and dependency cycles eventually be enforced?

The expected output is a small public-contract/dependency specification that can later guide database design, checkout sequencing, API design, reliability work, and incremental migration of the current Nitro code.
