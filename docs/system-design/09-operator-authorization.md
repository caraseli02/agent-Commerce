# System Design #9 — Operator Authorization Boundary and Read-Only Stock View

Status: Accepted for implementation (#844)  
Date: 2026-11-15

## Purpose

Establish a durable, server-owned operator authorization boundary (`requireOperator`) and the read-only operator inventory surface (`GET /api/operator/me`, `GET /api/operator/inventory`, `/dashboard/operator/inventory`) as prerequisites for operator stock adjustments (#845) and order fulfilment workflows.

---

## 1. Principal and Authentication Reuse

Operator authentication reuses the signed customer-account session token introduced in #635 (`server/utils/accountSession.ts`) rather than introducing a second authentication stack:

- **Trusted principal:** `verifyCustomerAccountToken(authorization)` verifies the `HS256` signature against `AUTH_SESSION_SECRET` (or the development-only fallback when `NODE_ENV` is `development` or `test`), checks `typ === 'customer-account'`, confirms `sub === user_id` matches `^cus_[0-9a-f]{32}$`, and enforces `iat`/`exp` bounds.
- **Customer-only registration:** `POST /api/auth/register` creates rows in `customer_accounts` with zero rows in `operator_grants`. Newly registered accounts have customer privileges only.
- **No demo-token acceptance:** `requireOperator` never calls `requireRequester` or `getMockUserFromAuthHeader`. Unsigned demo tokens (such as `demo-token::mock-admin-1::*` or `demo-token::mock-customer-1::*`) are rejected with `401 Unauthorized` even when `NUXT_PUBLIC_MOCK_MODE=true`.
- **No client-supplied role claims:** JWT payloads modified to claim `role: 'operator'` or `role: 'admin'` fail signature or claim verification (`401`). Role or permission claims in request headers (`X-Role`, `X-Operator-Permission`) or request bodies are ignored (`403`).

---

## 2. Database Grant Schema and Per-Request Enforcement

### Schema (`server/infrastructure/migrations/013_operator_grants.sql`)

```sql
CREATE TABLE IF NOT EXISTS operator_grants (
  account_id TEXT NOT NULL REFERENCES customer_accounts(id) ON DELETE CASCADE,
  permission TEXT NOT NULL CHECK (permission IN ('inventory:read', 'inventory:write', 'orders:fulfil', 'orders:cancel')),
  granted_by TEXT NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (account_id, permission)
);
```

The migration is expand-only so shared Preview databases (`vercel-dev`) and isolated test schemas can apply it safely via `pnpm db:migrate`.

### Guard Contract (`server/utils/requireOperator.ts`)

```ts
export const requireOperator = async (event: H3Event, permission?: OperatorPermission): Promise<Operator>
```

On every request to an operator endpoint:

1. Extract `getHeaders(event).authorization` and verify it with `verifyCustomerAccountToken`. If missing, malformed, expired, tampered, or a demo token, throw `401 Unauthorized`.
2. Query `SELECT permission FROM operator_grants WHERE account_id = $1 ORDER BY permission`. If the database query fails, throw `503 Service Unavailable` (`Operator access is temporarily unavailable.`).
3. If the account holds no grants, or if a specific `permission` was requested and is not in the returned set, throw `403 Forbidden`.
4. Return `{ accountId: claims.sub, permissions }`.

### Multi-Instance Consistency and Revocation

Because session verification is stateless (`HS256` signature check) and permission lookup hits PostgreSQL (`operator_grants`) on every call:

- Two independent Nitro instances make identical allow/deny decisions for the same token.
- Revoking a permission takes effect on the very next request across all instances without waiting for the 12-hour session token to expire.

---

## 3. Provisioning Contract (`server/infrastructure/operator-grant.mjs`)

There is no public HTTP endpoint to bootstrap or mutate operator permissions. Provisioning requires direct database credentials (`DATABASE_URL`):

- **Grant:** `pnpm operator:grant -- --email <email> --permission <permission> [--apply]`
- **Revoke:** `pnpm operator:revoke -- --email <email> --permission <permission> [--apply]`

Rules:

- **Dry-run by default:** Without `--apply`, the CLI checks `customer_accounts` and `operator_grants`, logs the planned change, and exits without writing.
- **No account creation:** The target email must already exist in `customer_accounts`; the CLI never creates accounts or sets passwords.
- **Constrained permissions:** `--permission` must be one of `inventory:read`, `inventory:write`, `orders:fulfil`, or `orders:cancel`.
- **Production boundary:** Production provisioning and secret management remain owner operations.

---

## 4. Transport Security, CSRF, and Known XSS Limitation

- **Explicit Bearer header (no ambient cookie auth):** `app/plugins/api.ts` reads the `token` cookie in client JavaScript and attaches `Authorization: Bearer <token>` via `withSessionAuthorization`. `requireOperator` inspects only the `Authorization` header and ignores `Cookie` headers.
- **CSRF posture for #844 and #845:** Because browsers never attach custom `Authorization: Bearer` headers automatically on cross-site requests, operator endpoints guarded by `requireOperator` (including the upcoming stock-write endpoint in #845) are not vulnerable to ambient cookie CSRF.
- **Known XSS limitation:** Because the `token` cookie is readable by JavaScript (`httpOnly: false`) so `$apiClient` can construct the `Authorization` header, any cross-site scripting (XSS) vulnerability on the origin could read the bearer token. Migrating session storage to `HttpOnly` cookies with explicit CSRF tokens is out of scope for #844 and tracked as a known architectural limitation.

---

## 5. Read-Only Stock View Contract

### Domain Projection (`server/domain/inventory/index.ts`)

`inventory.readStockLevels(productIds)` shares the single `readBalances` SQL statement with `inventory.readAvailability(productIds)` (#842):

- Reads `on_hand`, `reserved`, and expired active holds (`status = 'active' AND expires_at <= now()`) from one snapshot query.
- Computes `effectiveHeld = Math.max(0, on_hand_reserved - expiredHeld)` and `available = Math.max(0, onHand - effectiveHeld)`.
- Never writes to `checkout_inventory` or `checkout_reservations`, and never bootstraps missing product rows from static fixture stock. Products with a `checkout_inventory` row return `{ productId, state: 'tracked', onHand, effectiveHeld, available }`; products without a row return `{ productId, state: 'untracked' }`.

### Endpoints and UI

- `GET /api/operator/me`: Calls `requireOperator(event)` and returns `{ status: 'success', data: { accountId, permissions } }`.
- `GET /api/operator/inventory`: Calls `requireOperator(event, 'inventory:read')`, reads `inventory.readStockLevels` across `mockProducts` in batches of `MAX_AVAILABILITY_BATCH` (50), and returns `{ status: 'success', data: OperatorInventoryRow[] }`.
- Both `/api/operator/*` routes inherit `Cache-Control: private, no-store, no-cache, must-revalidate` from `server/middleware/api-cache-policy.ts`.
- UI navigation (`app/components/dashboard/Aside.vue`) and client route middleware (`app/middleware/router.global.ts`) consult `GET /api/operator/me` only when a customer-account JWT is present, hiding operator links from anonymous users, demo accounts, and non-operator customers. Client checks are for UX only; `requireOperator` remains the sole authority on the server.
