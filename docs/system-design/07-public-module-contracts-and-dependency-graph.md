# System Design #7 — Public Module Contracts and Dependency Graph

Status: Accepted for implementation  
Date: 2026-08-31

## Purpose

System-design step #6 established authoritative ownership and transaction/recovery invariants. Step #7 turns those decisions into implementation boundaries:

- which layer may coordinate multiple domains;
- which public capabilities each module exposes;
- which data may cross module boundaries;
- which dependencies are forbidden;
- which retry/concurrency semantics public contracts must preserve.

The goal is a pragmatic modular monolith, not a microservice simulation. ECAS should gain explicit business boundaries without adding brokers, distributed-saga infrastructure, or deep Clean Architecture folder hierarchies before the application needs them.

This design was adversarially checked against duplicate checkout submission, duplicate/out-of-order payment events, reservation expiry, changed carts, and cancellation racing a processing payment.

## Current implementation pressure

The current server is still organized mainly as `server/api` plus `server/utils`.

Important examples that #7 is intended to replace over time:

- `server/api/orders/new.post.ts` authenticates, finds the cart, creates an order, clears the cart, and returns simulated payment success in one transport handler.
- `server/utils/mockRuntimeOrders.ts` embeds payment details inside the runtime Order and cancels the Order and payment together.
- `server/utils/mockCart.ts` combines cart intent, product hydration, pricing, stock clamping, and persistence.
- current runtime order creation can accept request-provided totals instead of deriving the commercial snapshot only from authoritative server-side inputs.

The target architecture therefore changes dependency direction, not merely folder names.

---

## 1. Dependency rule

Target direction:

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

Domain modules do not coordinate each other directly.

```text
Catalog   -X-> Inventory
Cart      -X-> Catalog
Inventory -X-> Orders
Orders    -X-> Payments
Payments  -X-> Orders
```

The application layer owns cross-domain sequencing. Each module owns only its state transitions and invariants.

### Hard import rule

Allowed:

```ts
import { orders } from '~/server/modules/orders'
```

Forbidden outside the owning module:

```ts
import { ordersRepository } from '~/server/modules/orders/internal/repository'
```

`index.ts` is the public module firewall.

Application workflows and API routes may import a module's public entry point, never its `internal/` implementation.

A module may use its own `internal/` implementation. It must not import another module's `internal/` implementation.

---

## 2. Target physical structure

Keep the structure shallow until complexity requires more layers:

```text
server/
  api/

  application/
    checkout/
      place-order.ts
      retry-order-payment.ts
      finalize-payment.ts
      cancel-order.ts

  modules/
    catalog/
      index.ts
      internal/

    cart/
      index.ts
      internal/

    inventory/
      index.ts
      internal/

    orders/
      index.ts
      internal/

    payments/
      index.ts
      internal/

    accounts/
      index.ts
      internal/
```

Do not pre-create `domain/`, `ports/`, `adapters/`, `services/`, and `repositories/` in every module. Add internal structure only when a module becomes complex enough to justify it.

---

## 3. Cross-boundary data rule

Prefer narrow immutable command/result DTOs.

Allowed to cross boundaries:

- opaque IDs such as `ProductId`, `OrderId`, `PaymentId`, `ReservationId`, `CustomerId`;
- `CheckoutRequestId` and cart revision/version tokens;
- immutable money values;
- timestamps;
- small historical snapshots deliberately owned by the receiving module;
- explicit domain/application result unions;
- domain events/facts when asynchronous processing is used.

Do not expose across module boundaries:

- repositories;
- ORM/database records;
- mutable aggregates;
- Stripe/provider SDK objects;
- frontend Pinia state;
- full UI-oriented `UserInterface`, `ProductInterface`, `CartProductsInterface`, or order-summary DTOs;
- another module's internal entity merely for convenience.

### Money

Use integer minor units instead of floating-point major units:

```ts
type Money = Readonly<{
  minor: number
  currency: CurrencyCode
}>
```

Example:

```ts
{ minor: 800, currency: 'EUR' } // €8.00
```

---

## 4. Shared-kernel rule

Keep shared business types extremely small.

A generic `Money` primitive and infrastructure-level utilities can be shared. Do not create a global `shared/Product`, `shared/User`, `shared/Order`, or similar universal domain model.

Opaque IDs can be exported from the owning module's public contract. Importing an opaque `OrderId` does not grant access to the Orders aggregate or persistence model.

---

## 5. Catalog public contract

Checkout needs an authoritative commercial quote, not an entire Product model.

```ts
type QuoteItemsInput = {
  items: readonly {
    productId: ProductId
    quantity: number
  }[]
}

type CatalogQuoteLine = {
  productId: ProductId
  sku: string
  name: string
  quantity: number
  unitPrice: Money
}

type CatalogQuote = {
  lines: readonly CatalogQuoteLine[]
  quotedAt: Date
}

interface CatalogService {
  quoteItems(input: QuoteItemsInput): Promise<CatalogQuote>
}
```

The quote is authoritative while constructing a new Order. Once an Order exists, its historical monetary snapshot is authoritative for retries of that Order.

Do not reprice an existing Order during payment retry.

---

## 6. Cart public contract

Checkout reads a stable intent snapshot with a revision token.

```ts
type CartSnapshot = {
  cartId: CartId
  ownerId: CustomerId | GuestSessionId
  revision: CartRevision
  items: readonly {
    productId: ProductId
    quantity: number
  }[]
}

interface CartService {
  getSnapshot(input: {
    cartId: CartId
    ownerId: CustomerId | GuestSessionId
  }): Promise<CartSnapshot>

  completeCheckout(
    input: CompleteCheckoutInput,
  ): Promise<CompleteCheckoutResult>
}
```

Initial reconciliation policy:

```ts
type CompleteCheckoutResult =
  | { kind: 'completed' }
  | { kind: 'cart-changed' }
```

`completeCheckout` mutates the cart only if the current cart revision still matches the revision used by the checkout.

```text
current revision == checkout revision
  -> checkout may clear/remove the purchased snapshot

current revision != checkout revision
  -> do not destroy later user edits
```

This intentionally chooses a potentially stale cart over silently deleting products the customer added after payment started. More precise line-level reconciliation can be introduced later if required.

---

## 7. Inventory public contract

Inventory exposes allocation capabilities rather than stock records/repositories.

```ts
type ReserveInventoryInput = {
  reservationKey: ReservationKey
  items: readonly RequestedInventoryItem[]
  expiresAt: Date
}

type IdempotentResult<T> =
  | { kind: 'created'; value: T }
  | { kind: 'existing'; value: T }

interface InventoryService {
  reserve(
    input: ReserveInventoryInput,
  ): Promise<IdempotentResult<InventoryReservation>>

  commit(
    reservationId: ReservationId,
  ): Promise<CommitReservationResult>

  release(
    reservationId: ReservationId,
  ): Promise<ReleaseReservationResult>

  allocatePaidOrder(
    input: AllocatePaidOrderInput,
  ): Promise<PaidOrderAllocationResult>
}
```

`reservationKey` exists before an Order ID necessarily exists and prevents a retried logical checkout from producing duplicate reservations.

### Conditional transition rule

Never implement:

```text
read ACTIVE
...
commit later assuming still ACTIVE
```

`commit()` must atomically/conditionally perform the transition and report the actual result:

```ts
type CommitReservationResult =
  | { kind: 'committed' }
  | { kind: 'already-committed' }
  | { kind: 'expired' }
  | { kind: 'released' }
```

An expired/released reservation cannot be resurrected by `commit()`.

If payment succeeds after reservation expiry, the application workflow asks Inventory for a new paid-order allocation:

```ts
type PaidOrderAllocationResult =
  | { kind: 'allocated' }
  | { kind: 'backordered' }
  | { kind: 'unavailable' }
```

Inventory decides whether/how goods can be allocated. The application workflow decides what cross-domain recovery follows.

---

## 8. Orders public contract

Orders exposes business transitions, not repository CRUD.

```ts
type CreatePendingOrderInput = {
  checkoutRequestId: CheckoutRequestId
  customer: OrderCustomerSnapshot
  items: readonly OrderItemSnapshot[]
  shippingAddress: AddressSnapshot
  billingAddress: AddressSnapshot
  reservationId: ReservationId
  sourceCart: {
    cartId: CartId
    revision: CartRevision
  }
  paymentDeadlineAt: Date
}

interface OrdersService {
  createPending(
    input: CreatePendingOrderInput,
  ): Promise<IdempotentResult<PendingOrder>>

  getPayable(orderId: OrderId): Promise<PayableOrder | null>

  markPaid(
    input: MarkOrderPaidInput,
  ): Promise<MarkOrderPaidResult>

  requestCancellation(
    orderId: OrderId,
  ): Promise<RequestCancellationResult>

  confirmCancellation(
    orderId: OrderId,
  ): Promise<ConfirmCancellationResult>
}
```

`getPayable()` returns only the facts payment orchestration needs, for example:

```ts
type PayableOrder = {
  orderId: OrderId
  amountDue: Money
  paymentDeadlineAt: Date
  reservationId: ReservationId | null
}
```

The application must not load an Order aggregate and assign `status = 'PAID'`. `markPaid()` enforces the Orders state transition.

Cancellation is deliberately split into request and confirmation because payment may already be unresolved/processing.

---

## 9. Payments public contract

Payments owns local payment state and interpretation of payment-provider facts.

The public model should not imply that every customer retry creates a new provider payment object.

For Stripe-like providers, the normal default is one provider payment intent/object for the logical Order/checkout payment and reuse/reconciliation across interrupted attempts where supported.

```ts
interface PaymentsService {
  ensurePayment(
    input: EnsurePaymentInput,
  ): Promise<EnsurePaymentResult>

  retryPayment(
    paymentId: PaymentId,
  ): Promise<RetryPaymentResult>

  ingestProviderEvent(
    event: ProviderPaymentEvent,
  ): Promise<PaymentEventResult>

  requestCancellation(
    paymentId: PaymentId,
  ): Promise<PaymentCancellationResult>

  refund(
    paymentId: PaymentId,
  ): Promise<RefundResult>
}
```

### Payment identity and attempts

Conceptually:

```text
Order
  -> ECAS Payment
       -> provider PaymentIntent/payment object
            -> one or more provider attempts/charges
```

ECAS may record attempt history, but `retryPayment()` must not automatically mean `create a brand-new provider payment object`.

### Provider-event rule

Do not expose a generic setter such as:

```ts
applyProviderStatus('processing')
```

Provider events are facts to interpret:

```ts
ingestProviderEvent(event)
```

Payments owns:

- provider-event deduplication;
- provider-object correlation;
- monotonic/valid local state transitions;
- reconciliation when network/provider outcome is unknown;
- ignoring stale events that would regress terminal state.

Webhook/event handling must tolerate duplicates and out-of-order delivery.

A duplicate event cannot re-run settlement. A late `processing` event cannot regress a local `SUCCEEDED` payment back to `PROCESSING`.

---

## 10. Accounts public contract

Checkout needs narrow current-customer facts and validated addresses, not the complete account/UI model.

```ts
type CheckoutCustomerSnapshot = {
  customerId: CustomerId
  name: string
  email: string
}

interface AccountsService {
  getCheckoutCustomer(
    customerId: CustomerId,
  ): Promise<CheckoutCustomerSnapshot>

  getCheckoutAddress(input: {
    customerId: CustomerId
    addressId: AddressId
  }): Promise<CheckoutAddress>
}
```

Accounts owns current profile/address truth. Orders copies the accepted historical snapshot.

Authenticated identity comes from trusted server context; the browser does not authoritatively choose `customerId` for checkout.

---

## 11. Application workflow contracts

Start with four workflows only:

```text
placeOrder
retryOrderPayment
finalizePayment
cancelOrder
```

### `placeOrder`

Transport becomes thin:

```ts
export default defineEventHandler(async (event) => {
  const command = await readBody<PlaceOrderCommand>(event)
  const actor = requireAuthenticatedActor(event)

  return placeOrder(actor, command)
})
```

Conceptual command:

```ts
type PlaceOrderCommand = {
  checkoutRequestId: CheckoutRequestId
  cartId: CartId
  expectedCartRevision: CartRevision
  shippingAddressId: AddressId
  billingAddressId: AddressId
}
```

Sequence:

```text
trusted actor identity
  -> Accounts customer/address validation
  -> Cart stable snapshot
  -> Catalog authoritative quote
  -> Inventory idempotent reservation
  -> Orders idempotent PENDING_PAYMENT creation
  -> Payments ensure logical payment
```

The actual persistence implementation must honor #6 transaction/recovery invariants; this sequence is a responsibility graph, not permission to perform unsafe dual writes.

### `retryOrderPayment`

```text
Orders.getPayable()
  -> verify before paymentDeadlineAt
  -> ensure/reacquire Inventory reservation if required
  -> Payments.retryPayment(existing logical payment)
```

No Catalog repricing occurs for an existing Order.

### `finalizePayment`

Triggered/retried after Payments establishes definitive success:

```text
Payment SUCCEEDED
  -> attempt Inventory.commit(existing reservation)
       -> committed/already committed
            -> Orders.markPaid()
       -> expired/released
            -> Inventory.allocatePaidOrder()
                 -> allocated/backordered
                      -> Orders.markPaid()/appropriate order handling
                 -> unavailable
                      -> compensating refund/manual recovery policy
  -> Cart.completeCheckout(expected revision)
```

Each transition must be retry-safe. A previous read must not be assumed valid when a later write happens.

### `cancelOrder`

Do not finalize Order cancellation and release inventory before unresolved payment truth is handled.

Conceptual flow:

```text
Orders.requestCancellation()
  -> Payments.requestCancellation()
       -> definitively cancelled/failed
            -> Inventory.release()
            -> Orders.confirmCancellation()

       -> still processing/unknown
            -> keep cancellation process pending
            -> wait/reconcile terminal payment result

       -> already succeeded
            -> refund/compensation
            -> Inventory.release() when policy permits
            -> Orders.confirmCancellation()
```

Cross-domain cancellation process state belongs to the application workflow/recovery mechanism rather than being disguised as direct Orders-to-Payments coupling.

---

## 12. PlaceOrder idempotency contract

Provider idempotency is not enough. The entire PlaceOrder command must be idempotent.

Persist a durable application-level record equivalent to:

```ts
type CheckoutIdempotencyRecord = {
  customerId: CustomerId
  checkoutRequestId: CheckoutRequestId
  fingerprint: string
  orderId: OrderId
}
```

Required behavior:

```text
same customer + same request key + same logical input
  -> same logical Order/result

same customer + same request key + different logical input
  -> idempotency conflict; do not silently reuse or create another Order
```

Also protect against two different request IDs checking out the same unchanged cart concurrently.

For the initial design, enforce at most one active logical checkout/order creation for the same:

```text
customer + cartId + cartRevision
```

using an atomic database constraint/claim or equivalent semantic lock.

The application workflow owns this request-level identity. Inventory/Orders/Payments still enforce their own idempotent transitions independently.

---

## 13. Retry/concurrency principle

Cross-domain workflows must obey this rule:

> Every cross-domain operation must be safe to retry, and no workflow may rely on a previous read still being true when it performs a later write.

Examples:

- `getReservation() == active` does not authorize a later unconditional commit; `commit()` must conditionally transition it.
- `getPayable()` does not authorize payment after the deadline unless the later payment operation/Order transition still validates eligibility.
- receiving `PaymentSucceeded` twice must not settle/fulfill twice.
- reading a cart revision before payment does not authorize clearing a later revision.

Use atomic constraints, conditional updates, optimistic version checks, and idempotent state transitions before considering distributed locking.

---

## 14. Event/recovery reliability

When a payment-provider webhook changes durable Payment state and the application must later finalize Order/Inventory/Cart state, process failure between those steps must be recoverable.

Target rule:

```text
Payment can be SUCCEEDED while Order is temporarily PENDING_PAYMENT,
but recovery must reliably converge the workflow.
```

At ECAS scale, do not introduce Kafka/RabbitMQ or a distributed saga framework merely to satisfy the diagram.

Prefer initially:

- one relational database where practical;
- local ACID transactions for state that can be committed together safely;
- durable workflow/recovery records;
- idempotent finalization;
- retry/reconciliation jobs for externally uncertain operations.

If/when internal integration events become asynchronous durable messages, use a transactional-outbox pattern so the state change and event intent are committed atomically and consumers remain idempotent.

---

## 15. Architecture enforcement

Start with existing project tools:

```text
Vitest architecture/source-boundary tests
+
ESLint restricted imports when module paths stabilize
```

Do not add dependency-cruiser or another architecture dependency yet.

Initial executable rules:

1. `server/api/**` and `server/application/**` cannot import `server/modules/*/internal/**`.
2. one module cannot import another module's `internal/**` files.
3. behavioral contract specs for the three critical races are recorded before implementation and activated as the corresponding workflows are introduced.

---

## 16. Adversarial acceptance scenarios

### A. Duplicate PlaceOrder

```text
request X executes
  -> reservation created
  -> Order created
  -> response is lost

request X retries with same input
  -> same logical reservation
  -> same logical Order
  -> same logical payment
  -> no duplicate charge
```

Same request key with a different fingerprint is rejected.

Two different keys racing on the same unchanged cart revision cannot both create independent active Orders.

### B. Duplicate / late PaymentSucceeded

```text
provider succeeded event
  -> Payment becomes SUCCEEDED
  -> finalization executes

same event delivered again
  -> no second inventory commit
  -> no second Order settlement
  -> no second cart mutation
```

Out-of-order stale events cannot regress terminal state:

```text
SUCCEEDED
  -X-> PROCESSING
```

### C. Cancellation while payment is processing

```text
Order PENDING_PAYMENT
Payment PROCESSING
user requests cancel
```

Expected:

- cancellation intent is recorded;
- Inventory is not blindly released as though payment were definitely cancelled;
- final Order cancellation waits for payment cancellation/terminal reconciliation;
- if payment succeeds despite cancellation request, compensation/refund is performed before cancellation is finalized according to policy.

---

## 17. Best-practice alignment

The design is consistent with the following established guidance used during the adversarial review:

- bounded contexts keep their own models and explicit contracts; application services coordinate cross-context use cases rather than sharing one universal domain model;
- idempotency keys identify one logical mutation and retries must reuse the same key/input;
- payment-provider webhooks must tolerate duplicate and out-of-order delivery;
- a logical payment object should normally be reused across interrupted/retried checkout where the provider supports it rather than creating unrelated payment objects for every retry;
- transactional outbox/idempotent-consumer patterns address durable state-change plus event-delivery failure windows;
- optimistic/conditional concurrency control prevents stale reads from authorizing later invalid writes.

Reference material reviewed:

- Stripe PaymentIntents: https://docs.stripe.com/payments/payment-intents
- Stripe idempotent requests: https://docs.stripe.com/api/idempotent_requests
- Stripe webhooks: https://docs.stripe.com/webhooks
- Stripe PaymentIntent lifecycle: https://docs.stripe.com/payments/paymentintents/lifecycle
- AWS transactional outbox: https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html
- AWS saga orchestration: https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/saga-orchestration.html
- Microsoft tactical DDD: https://learn.microsoft.com/azure/architecture/microservices/model/tactical-ddd
- Microsoft DDD domain-model guidance: https://learn.microsoft.com/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/microservice-domain-model

---

## 18. Exit criteria for #7

Step #7 is complete at design level when all of the following are accepted:

- application workflows are the only cross-domain coordinators;
- module `index.ts` files define public firewalls;
- cross-module DTOs are narrow and immutable;
- repositories/ORM/provider objects do not leak through public contracts;
- Cart exposes revision-aware checkout completion;
- Inventory exposes idempotent reservation and conditional state transitions;
- Orders exposes behavior-oriented payment/cancellation transitions;
- Payments reuses/reconciles the logical provider payment where appropriate and interprets provider events rather than accepting arbitrary status assignment;
- PlaceOrder has application-level idempotency plus protection against concurrent checkout of the same cart revision;
- duplicate/out-of-order payment events are harmless;
- cancellation does not finalize before unresolved payment truth is reconciled;
- architecture tests prevent bypassing module internals;
- the three critical behavioral scenarios are captured as contract specs before implementation.

## Final decision

Accepted target:

```text
Thin API
  -> explicit application workflow
       -> narrow public module contracts
            -> private module internals
```

This is the architecture to implement incrementally from the current ECAS server. The next implementation work should activate the contract tests one workflow at a time rather than performing a repository-wide rewrite.