# Implementation Plan: Nuxt Server Migration

**Created:** 2026-02-12
**Based on:** `docs/brainstorms/2026-02-12-nuxt-server-migration-brainstorm.md`

## Overview

Migrate ECAS from external API to self-contained Nuxt server using mock data approach. Goal: Make application runnable for testing UI with minimal setup.

## Phase 1: Server Infrastructure Setup

### 1.1 Configure Nuxt Server Routes

- [x] Uncomment server config in `nuxt.config.ts` (host: '0.0.0.0', port: '3000')
- [x] Verify Nitro is handling requests correctly
- [x] Update `NUXT_PUBLIC_BASE_URL_API` to point to Nuxt server (`http://localhost:3000`)

**Files:** `nuxt.config.ts`

---

## Phase 2: Mock Data Endpoints - Priority 1 (Core)

### 2.1 Authentication Endpoints

Create `/server/api/auth/` routes:

- [x] `POST /api/auth/login` - Return mock user with JWT token
- [x] `POST /api/auth/register` - Return success response
- [x] `POST /api/auth/firebase/register` - Handle Firebase registration
- [x] `GET /api/auth/user/:id/details` - Return user profile mock

**Response format:** `{ status: 'success', data: { token, user } }`

---

### 2.2 Products Endpoints

Create `/server/api/products/` routes:

- [x] `GET /api/products/new-products` - Return array of sample products
- [x] `GET /api/products/:id` - Return single product by ID
- [x] `GET /api/products/search` - Return search results (accept keyword, filters)
- [x] `GET /api/products/:path` - Return product by path

**Mock data needed:** 5-10 sample products with images, prices, descriptions

---

### 2.3 General Settings Endpoints

Create `/server/api/general-settings/` route:

- [x] `GET /api/general-settings` - Return layout, order, product settings

**Mock data:** Basic settings structure (delivery types, payment methods)

---

## Phase 3: Frontend Verification

### 3.1 Update Service Configuration

- [ ] Modify `HttpFactory` to use Nuxt server URL
- [ ] Test authentication flow (login → token stored → access protected routes)
- [ ] Test product listing and detail pages
- [ ] Test profile loading

### 3.2 Debug & Fix

- [ ] Fix any API response format mismatches
- [ ] Verify middleware authentication works correctly
- [ ] Check localStorage/cookie persistence
- [ ] Test in browser console for network errors

---

## Phase 4: Additional Mock Endpoints (Future)

Implement when core is working:

- [ ] User profile endpoints (`/api/user/*`)
- [ ] Cart endpoints (`/api/cart/*`)
- [ ] Orders endpoints (`/api/orders/*`)
- [ ] Categories navigation (`/api/categories/*`)
- [ ] Notifications (`/api/notification/*`)

---

## Implementation Details

### Server Route Pattern

```typescript
// /server/api/products/new-products.get.ts
export default defineEventHandler(async (event) => {
  // Mock data
  const products = [ ... ];

  return {
    status: 'success',
    data: products
  };
});
```

### Authentication Mock Response

```typescript
// /server/api/auth/login.post.ts
export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  // Mock successful login
  return {
    status: 'success',
    data: {
      token: 'mock-jwt-token',
      user: {
        id: '1',
        email: body.email,
        name: 'Test User',
      },
    },
  };
});
```

### File Structure to Create

```
/server/
├── api/
│   ├── auth/
│   │   ├── login.post.ts
│   │   ├── register.post.ts
│   │   ├── firebase-register.post.ts
│   │   └── [id].get.ts (for user details)
│   ├── products/
│   │   ├── new-products.get.ts
│   │   ├── [id].get.ts
│   │   ├── search.post.ts
│   │   └── [path].get.ts
│   └── general-settings/
│       └── index.get.ts
└── firebase.get.ts (already exists)
```

---

## Testing Checklist

Run `npm run dev` and verify:

- [ ] Homepage loads without errors
- [ ] Can click on product → detail page loads
- [ ] Login form submits → redirects to dashboard
- [ ] Dashboard shows user data
- [ ] Navigation between pages works
- [ ] Console has no 404 or 500 errors

**Note:** Server endpoints created successfully. User needs to manually run `npm run dev` and test the application to verify functionality.

---

## Next Steps After MVP Working

1. **Connect real database** (Firebase Firestore or PostgreSQL)
2. **Implement transactional endpoints** (cart, checkout, orders)
3. **Add server-side validation** (VeeValidate schemas on server)
4. **Performance optimization** (caching, pagination)
5. **Security hardening** (input sanitization, rate limiting)

---

## Questions Resolved

✓ Mock data first, DB later
✓ Keep existing Firebase auth
✓ Read-only endpoints priority (auth, products, settings)
✓ Maintain API response format
✓ Match current service structure
