import { describe, expect, it } from 'vitest';
import {
  canSkipAuthenticatedUser,
  isDemoCheckoutAssistEnabled,
  isPaymentManagementVisible,
  requiresDemoToken,
} from '~~/helpers/mock-integration';

describe('Mock Integration Boundary seam', () => {
  describe('isPaymentManagementVisible (payment UI)', () => {
    it('hides card management affordances in mock mode', () => {
      expect(isPaymentManagementVisible(true)).toBe(false);
    });

    it('shows card management affordances in live mode', () => {
      expect(isPaymentManagementVisible(false)).toBe(true);
    });
  });

  describe('canSkipAuthenticatedUser (auth skip)', () => {
    it('lets the demo buyer proceed without a real user in mock mode', () => {
      expect(canSkipAuthenticatedUser(true, false)).toBe(true);
    });

    it('requires a real user in live mode', () => {
      expect(canSkipAuthenticatedUser(false, false)).toBe(false);
    });

    it('always proceeds when a real user is present', () => {
      expect(canSkipAuthenticatedUser(false, true)).toBe(true);
      expect(canSkipAuthenticatedUser(true, true)).toBe(true);
    });
  });

  describe('requiresDemoToken (auth gate)', () => {
    it('enforces a demo token in mock mode', () => {
      expect(requiresDemoToken(true)).toBe(true);
    });

    it('defers to real auth in live mode', () => {
      expect(requiresDemoToken(false)).toBe(false);
    });
  });

  describe('isDemoCheckoutAssistEnabled (demo checkout defaults)', () => {
    it('applies demo checkout defaults only in mock mode', () => {
      expect(isDemoCheckoutAssistEnabled(true)).toBe(true);
      expect(isDemoCheckoutAssistEnabled(false)).toBe(false);
    });
  });

  describe('Consumer seam contract — auth skip (useCart)', () => {
    // Old ad-hoc check in composables/useCart.ts: if (token || config.public.MOCK_MODE) return false;
    // New: if (canSkipAuthenticatedUser(Boolean(config.public.MOCK_MODE), Boolean(token))) return false;
    // These tests verify the routing behavior is preserved across mock/live modes.
    it('mock mode: skips auth prompt when no real token (matches old token || MOCK_MODE)', () => {
      expect(canSkipAuthenticatedUser(true, false)).toBe(true);
      expect(canSkipAuthenticatedUser(true, true)).toBe(true);
    });
    it('live mode: requires real token to skip auth (matches old token || MOCK_MODE)', () => {
      expect(canSkipAuthenticatedUser(false, false)).toBe(false);
      expect(canSkipAuthenticatedUser(false, true)).toBe(true);
    });
  });

  describe('Consumer seam contract — payment UI (OrderStockType)', () => {
    // Old ad-hoc checks in components/order-summary/OrderStockType.vue:
    //   v-if="!config.public.MOCK_MODE"  (line 133 — payment card modal)
    //   if (config.public.MOCK_MODE) showCardsModal.value = false  (line 264)
    // New: const paymentManagementVisible = isPaymentManagementVisible(Boolean(config.public.MOCK_MODE));
    // These tests verify the payment management visibility is preserved across mock/live modes.
    it('mock mode: hides payment management affordances (matches old !MOCK_MODE)', () => {
      expect(isPaymentManagementVisible(true)).toBe(false);
    });
    it('live mode: shows payment management affordances (matches old !MOCK_MODE)', () => {
      expect(isPaymentManagementVisible(false)).toBe(true);
    });
  });
});
