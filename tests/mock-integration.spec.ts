import { describe, expect, it } from 'vitest';
import {
  canSkipAuthenticatedUser,
  isDemoCheckoutAssistEnabled,
  isPaymentManagementVisible,
  requiresDemoToken,
} from '~/helpers/mock-integration';

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
});
