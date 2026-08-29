/**
 * Mock Integration Boundary decisions for the Portfolio Demo.
 *
 * These pure helpers replace ad-hoc `MOCK_MODE` checks that were scattered
 * across buyer-flow UI and the auth gate. Mock mode supplies demo
 * authentication, demo cards, and demo checkout defaults so a reviewer can
 * walk the Buyer Flow without live integrations; live mode keeps the real
 * authenticated / session-gated behavior. UI and middleware call these
 * functions instead of branching on `MOCK_MODE` directly, so the mock vs live
 * outcome is testable at a single application/adapter seam (mirroring
 * `helpers/checkout-outcome.ts` for post-order routing).
 */

/**
 * Whether payment-method management affordances (saved-card edit, change card,
 * settings cog) are visible. Hidden in mock mode because demo cards are not
 * managed through a live payment provider.
 */
export function isPaymentManagementVisible(mockMode: boolean): boolean {
  return !mockMode;
}

/**
 * Whether the buyer flow may proceed without a real authenticated user.
 * Mock mode supplies a guest/demo session; live mode requires a real user.
 */
export function canSkipAuthenticatedUser(mockMode: boolean, hasUser: boolean): boolean {
  return hasUser || mockMode;
}

/**
 * Whether the auth gate enforces a valid demo token.
 * Mock mode requires a demo token; live mode defers to real auth and skips
 * mock-token parsing.
 */
export function requiresDemoToken(mockMode: boolean): boolean {
  return mockMode;
}

/**
 * Whether demo checkout assist (auto-applied delivery/payment defaults) runs.
 * Demo-only convenience so the reviewer reaches checkout quickly.
 */
export function isDemoCheckoutAssistEnabled(mockMode: boolean): boolean {
  return mockMode;
}
