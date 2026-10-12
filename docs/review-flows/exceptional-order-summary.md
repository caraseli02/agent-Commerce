# Exceptional order-summary review in mock mode

Use `NUXT_PUBLIC_MOCK_MODE=true`, the configured local PostgreSQL database after
`pnpm db:migrate`, and `pnpm dev` (or a built preview). Provider activation stays
off. These flows use existing public sample products and the real cart/quote
endpoints. No new environment variable, production integration or price override
is needed.

Open a fresh private browser window on the local storefront for each scenario.
In its developer console, run one of these fixture setups, then visit
`/order-summary`. The request affects only that window's guest cart.

## Backorder

```js
await fetch('/api/cart', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    products: [{ id: 'prod-1', stock: 0, backorder_stock: 1, isFolder: false }],
  }),
});
location.assign('/order-summary');
```

The warning and **Backorder Items: 1** must appear. Choose **Checkout as Guest**,
expand **Shipping Preferences**, and select **Backorder Standard**. Reload and
expand the section again: the option remains selected by its ID. This is a
shipping preference for sample backorder items; it does not promise real stock
availability or change the delivery quote.

## Small order

```js
await fetch('/api/cart', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    products: [{ id: 'prod-11', stock: 1, backorder_stock: 0, isFolder: false }],
  }),
});
location.assign('/order-summary');
```

One USB-C Charging Cable has a guest merchandise subtotal of **19.99 Lei**.
Payment Summary shows **4.99 Lei** handling, **19.90 Lei** delivery, **3.80 Lei**
VAT and **48.68 Lei** total. Activate **Explain small order handling charge**
with Enter or click. The dialog explains the actual quoted **0.00 to below
50.00 Lei** tier, in Lei, and states that delivery is separate. Escape closes
it and returns focus to the trigger. No backorder warning appears.

## Durable evidence and regression

Run:

```sh
pnpm test:e2e tests/e2e/exceptional-order-summary.spec.ts tests/e2e/guest-checkout.spec.ts
```

The wrapper creates an isolated PostgreSQL schema and Playwright builds/starts
its own mock server. Do not run a separate server on port 3000. Each exceptional
flow runs at 1440×900 and 390×844 with real API responses. Attachments under
`test-results/` include full-page screenshots, handling-dialog screenshots and
`runtime.json` listing console errors, hydration warnings, failed requests and
HTTP errors. The ordinary guest stock-product test completes checkout to
Payment Confirmed. Exact retained evidence paths belong in the PR.
