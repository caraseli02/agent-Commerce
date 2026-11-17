-- Operator permissions (#844). A registered account gains a permission only through a row here,
-- written by the local grant CLI (server/infrastructure/operator-grant.mjs), never by an HTTP
-- endpoint. Every operator request reads this table, so a revoke applies to the next request.
CREATE TABLE operator_grants (
  account_id TEXT NOT NULL REFERENCES customer_accounts (id) ON DELETE CASCADE,
  permission TEXT NOT NULL CHECK (permission IN ('inventory:read', 'inventory:write', 'orders:fulfil', 'orders:cancel')),
  granted_by TEXT NOT NULL CHECK (length(granted_by) BETWEEN 1 AND 120),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (account_id, permission)
);
