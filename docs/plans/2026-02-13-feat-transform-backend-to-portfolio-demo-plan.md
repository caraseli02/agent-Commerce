---
title: feat: Transform Backend to Portfolio Demo
type: feat
date: 2026-02-13
---

# feat: Transform Backend to Portfolio Demo

## Overview

Transform ECAS e-commerce frontend into a self-contained portfolio demo by replacing backend API calls with Nitro server mock endpoints. Enable via `NUXT_PUBLIC_MOCK_MODE=true` - then all API requests return local JSON data.

**Scope:** Core flows only - auth, products, cart, checkout, orders. Skip full admin parity. Timeline: 2 weeks.

## Problem Statement

Portfolio can't be showcased without running backend. Mock mode enables self-contained demo (`npm install && npm run dev`) without any infrastructure.

## Proposed Solution

Add mock toggle via environment variable. Modify `plugins/api.ts` to switch baseURL between real backend and local Nitro server mocks.

### Architecture

```
UI Components → Services → plugins/api.ts
                              ↓
                    MOCK_MODE=false → BASE_URL_API (backend)
                    MOCK_MODE=true  → /api (Nitro mocks)
```

**Single Change Point:** All 18 service modules automatically use mocks via `plugins/api.ts` modification.

## Key Decisions

1. **Mock toggle via env var**: `NUXT_PUBLIC_MOCK_MODE=true`
2. **Single interceptor point**: Modify `plugins/api.ts:44-76`
3. **Nitro server mocks**: Create 15-20 core endpoints in `server/api/`
4. **Auth simulation**: Mock user with all permissions
5. **Core flows only**: Skip full admin parity (P2 endpoints)

## P1 Blockers (Fix First)

1. **Env template mismatch**: `.env.template` uses `FIREBASE_API_KEY` but `nuxt.config.ts:70` expects `NUXT_PUBLIC_FIREBASE_API_KEY`

   - **Fix**: Update `.env.template` to use `NUXT_PUBLIC_*` prefix

2. **Hardcoded backend host**: `services/order-summary/cart.service.ts:7` uses `https://dev-backend.ecasmag.ro`

   - **Fix**: Use `this.baseURL` from `HttpFactory`

3. **URL building bug**: `services/user.service.ts:16` passes full URL to `useFetchAPI`

   - **Fix**: Pass relative path only

4. **Error swallowing**: `composables/HttpFactory.ts:23` catches and returns errors
   - **Fix**: Throw errors properly

## Acceptance Criteria

- [ ] **P1 blockers fixed**: Env template, hardcoded host, URL bug, error handling
- [ ] **Mock toggle works**: `NUXT_PUBLIC_MOCK_MODE=true` enables mock mode
- [ ] **Auth flow works**: Login → dashboard → logout
- [ ] **Storefront works**: Browse products, search, add to cart
- [ ] **Checkout works**: Cart → checkout → order success
- [ ] **Orders work**: View order history, view order details
- [ ] **All pages load**: Every route loads without console errors
- [ ] **Self-contained**: `npm install && npm run dev` works

## Implementation Phases

### Phase 1: Foundation (Week 1, 4 days)

**Tasks:**

- [ ] Update `.env.template` with `NUXT_PUBLIC_*` prefix
- [ ] Add `MOCK_MODE` to `nuxt.config.ts` runtime config
- [ ] Fix hardcoded host in `services/order-summary/cart.service.ts:7`
- [ ] Fix URL building bug in `services/user.service.ts:16`
- [ ] Fix error handling in `composables/HttpFactory.ts:23`
- [ ] Modify `plugins/api.ts:44-76` to switch baseURL based on `MOCK_MODE`
- [ ] Create `.env` file with `NUXT_PUBLIC_MOCK_MODE=true`
- [ ] Test: Verify mock mode toggle works

**Success criteria:** App runs in mock mode, all P1 blockers resolved

**Estimated effort:** 4 days

### Phase 2: Core Flows (Week 2, 6 days)

**Tasks:**

- [ ] Create API response types: `~/types/api/response.ts`
- [ ] Implement auth endpoints (login, signup, user, logout)
- [ ] Implement product endpoints (search, detail, categories)
- [ ] Implement cart endpoints (get, add, remove, clear)
- [ ] Implement checkout endpoints (validate, submit)
- [ ] Implement order endpoints (list, detail, cancel)
- [ ] Create mock user with admin permissions
- [ ] Create mock products (10-20 with Unsplash images)
- [ ] Test: Login → browse → cart → checkout → orders → dashboard

**Endpoints to mock (~15):**

```
POST   /api/auth/login
POST   /api/auth/signup
GET    /api/auth/user
POST   /api/auth/logout
POST   /api/products/search
GET    /api/products/[id]
GET    /api/categories
GET    /api/cart
POST   /api/cart/add
POST   /api/cart/remove
POST   /api/cart/clear
POST   /api/checkout/validate
POST   /api/checkout/submit
GET     /api/orders
GET     /api/orders/[id]
```

**Mock user example:**

```typescript
// server/api/auth/login.post.ts
export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) as { email: string; password: string };

  if (body.email === 'admin@ecas.com' && body.password === 'admin123') {
    return {
      status: 'success',
      data: {
        token: 'mock-jwt-token-portfolio-demo',
        user: {
          id: 'mock-user-1',
          email: 'admin@ecas.com',
          name: 'Portfolio Demo User',
          permissions: ['*'],
          roles: ['admin', 'customer'],
        },
      },
    };
  }

  throw createError({ status: 401, statusText: 'Invalid credentials' });
});
```

**Product endpoint example:**

```typescript
// server/api/products/search.post.ts
const mockProducts = [
  {
    id: 'prod-1',
    name: 'Premium Wireless Headphones',
    priceHistory: [{ price: 299.99, active: true, createdAt: '2024-01-15T10:30:00Z' }],
    details: {
      description: 'High-quality wireless headphones',
      images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500'],
    },
  },
  // ... more products
];

export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) as { query?: string };

  let products = mockProducts;

  if (body.query) {
    products = products.filter((p) => p.name.toLowerCase().includes(body.query!.toLowerCase()));
  }

  return { status: 'success', data: products };
});
```

**Success criteria:** All core flows work end-to-end

**Estimated effort:** 6 days

### Phase 3: Polish (Week 2, 2 days)

**Tasks:**

- [ ] Manual smoke test of all flows
- [ ] Fix console errors
- [ ] Update README with mock mode instructions
- [ ] Create `.env.example` file
- [ ] Verify all pages load without errors

**README update:**

````markdown
## Mock Mode

For portfolio demos, enable mock mode:

```bash
# .env
NUXT_PUBLIC_MOCK_MODE=true
```
````

Demo credentials: admin@ecas.com / admin123

All API endpoints mocked via Nitro server. No backend required.

### Running Demo

```bash
npm install
npm run dev
```

````

**Success criteria:** Portfolio demo ready, README complete

**Estimated effort:** 2 days

## Type Definitions

**`~/types/api/response.ts`:**
```typescript
export interface ApiSuccessResponse<T> {
    status: 'success';
    data: T;
}

export interface ApiErrorResponse {
    status: 'error';
    error: { message: string; code: number };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export function isSuccessResponse<T>(response: ApiResponse<T>): response is ApiSuccessResponse<T> {
    return response.status === 'success';
}
````

## Mock Data Guidelines

**Use TypeScript files for type safety, not JSON**

```typescript
// server/data/mock-products.ts
import type { ProductInterface } from '~/types/product/product-interface';

export default [
  {
    id: 'prod-1',
    name: 'Premium Wireless Headphones',
    // Match ProductInterface structure
  },
] as ProductInterface[];
```

**Keep it simple:**

- Inline data in endpoints (don't create separate data files)
- Use Unsplash for images
- No caching, no latency, no validation (frontend does that)
- Return data directly, no utility functions

## Testing Strategy

**Manual smoke test:**

1. Start dev server
2. Login with admin@ecas.com / admin123
3. Browse products
4. Add to cart
5. Complete checkout
6. View orders
7. Logout
8. Check browser console for errors

**That's it.** No need for extensive testing strategy for portfolio demo.

## Success Metrics

- All P1 blockers fixed
- Mock toggle functional
- Core flows work (auth, products, cart, checkout, orders)
- All pages load without console errors
- Self-contained: `npm install && npm run dev`

## Timeline: 2 Weeks

- Week 1: Foundation + P1 fixes (4 days)
- Week 2: Core flows + polish (8 days)

**Total:** 12 working days

## References

**Internal:**

- Audit document: `ECAS_BACKEND_TO_MOCK_MVP_AUDIT.md`
- API plugin: `plugins/api.ts:44-76`
- Environment config: `nuxt.config.ts:68-81`

**External:**

- Nuxt 3 Server Routes: https://nuxt.com/docs/guide/directory-structure/server
- Nuxt 3 Runtime Config: https://nuxt.com/docs/guide/going-further/runtime-config

## Appendix: P1 Blocker Fixes

**1. `.env.template` - Update all lines:**

```bash
# Before
FIREBASE_API_KEY=
BASE_URL_API=

# After
NUXT_PUBLIC_FIREBASE_API_KEY=
NUXT_PUBLIC_BASE_URL_API=
```

**2. `services/order-summary/cart.service.ts:7` - Fix hardcoded host:**

```typescript
// Before
const response = await fetch('https://dev-backend.ecasmag.ro/...');

// After
const response = await fetch(`${this.baseURL}/...`);
```

**3. `services/user.service.ts:16` - Fix URL building:**

```typescript
// Before
return await useFetchAPI('https://backend.com/users', params);

// After
return await useFetchAPI('/users', params);
```

**4. `composables/HttpFactory.ts:23` - Fix error handling:**

```typescript
// Before
catch (err) {
    return err as T;  // ❌
}

// After
catch (err) {
    console.error('API error:', err);
    throw err;  // ✅
}
```
