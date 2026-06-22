# Demo Route Smoke Checklist

Use this quick list before recording or sharing portfolio demo links in mock mode.

## Preconditions

- `NUXT_PUBLIC_MOCK_MODE=true`
- App is running on `http://localhost:3000`

## Critical Routes

- [ ] `/`
- [ ] `/search`
- [ ] `/product/prod-1`
- [ ] `/order-summary`
- [ ] `/order-summary/ord-1`
- [ ] `/dashboard`
- [ ] `/dashboard/client`
- [ ] `/dashboard/orders`
- [ ] `/dashboard/orders/ord-1`
- [ ] `/dashboard/customers`
- [ ] `/dashboard/customers/mock-user-1`
- [ ] `/dashboard/customers/mock-user-1/control-panel`
- [ ] `/dashboard/customers/mock-user-1/control-panel/account`
- [ ] `/dashboard/customers/mock-user-1/control-panel/shipping`
- [ ] `/dashboard/customers/mock-user-1/control-panel/settings`

## UX Spot Checks

- [ ] Home page at `375px`: desktop popover is hidden and content is readable.
- [ ] Sign-in modal: invalid email/client code and empty password both show clear field errors.
- [ ] Sign-in button prevents duplicate submit while loading.
- [ ] Order details (`/dashboard/orders/ord-1`, `/order-summary/ord-1`) show non-empty header metadata.

## Regression Rule

- [ ] No Nuxt `500` or `404` error pages across all routes above.
