import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = (relativePath: string) => readFileSync(resolve(repoRoot, relativePath), 'utf8');

describe('empty state UX contract (#194)', () => {
  it('defines shared presets for search, cart, orders, and favorites', () => {
    const presets = source('app/components/global/empty-state-presets.ts');

    expect(presets).toContain("primaryTo: '/search'");
    expect(presets).toContain("primaryLabel: 'Start shopping'");
    expect(presets).toContain("heading: 'No orders yet'");
    expect(presets).toContain("primaryLabel: 'Browse products'");
    expect(presets).toContain("variant: 'error'");
    expect(presets).toContain('discover products in the Components Marketplace catalog');
    expect(presets).not.toContain('discover parts in the Components Marketplace catalog');
  });

  it('uses the shared empty state for no search results', () => {
    const products = source('app/components/search/Products.vue');

    expect(products).toContain('<EmptyState');
    expect(products).toContain('searchEmptyPreset');
    expect(products).not.toContain('No products found');
  });

  it('keeps search fetch failures distinct from empty results', () => {
    const searchPage = source('app/pages/search.vue');

    expect(searchPage).toContain('v-else-if="error"');
    expect(searchPage).toContain('role="alert"');
    expect(searchPage).toContain('SearchProducts');
  });

  it('uses cart read error and empty treatments in the cart panel', () => {
    const cartPanel = source('app/components/layout/favorites-cart-modal/cart/Index.vue');

    expect(cartPanel).toContain("cartReadCacheKey('cart-panel')");
    expect(cartPanel).toContain('cartReadError');
    expect(cartPanel).toContain('cartEmptyPreset');
    expect(cartPanel).toContain('cartErrorPreset');
    expect(cartPanel).toContain('GlobalEmptyState');
  });

  it('uses shared empty and error states for client orders', () => {
    const ordersTable = source('app/components/client-table/order/Index.vue');

    expect(ordersTable).toContain('ordersEmptyPreset');
    expect(ordersTable).toContain("variant: 'error'");
    expect(ordersTable).toContain('GlobalEmptyState');
    expect(ordersTable).toContain("import GlobalEmptyState from '~/components/global/EmptyState.vue'");
    expect(ordersTable).toContain('aria-busy="true"');
    expect(ordersTable).toContain('Loading orders…');
  });

  it('generates unique empty-state heading ids by default', () => {
    const emptyState = source('app/components/global/EmptyState.vue');

    expect(emptyState).toContain('useId()');
    expect(emptyState).toContain('resolvedHeadingId');
    expect(emptyState).not.toContain("headingId: 'empty-state-heading'");
  });

  it('shows dashboard favorites empty state without restoring removed storefront favorites UI', () => {
    const activity = source('app/components/dashboard/client/Activity.vue');

    expect(activity).toContain('favoritesEmptyPreset');
    expect(activity).toContain('hasFavorites');
    expect(activity).toContain("import GlobalEmptyState from '~/components/global/EmptyState.vue'");
    expect(existsSync(resolve(repoRoot, 'app/components/layout/favorites-cart-modal/favorites/Index.vue'))).toBe(false);
  });

  it('shows guest-friendly empty states for checkout addresses instead of N/A placeholders', () => {
    const shippingBilling = source('app/components/order-summary/ShippingAndBillingSection.vue');
    const orderStockType = source('app/components/order-summary/OrderStockType.vue');
    const checkoutButtons = source('app/components/order-summary/CheckoutButtons.vue');
    const useUser = source('app/composables/useUser.ts');

    expect(orderStockType).toContain('guest-address-prompt');
    expect(orderStockType).toContain('Checkout as Guest');
    expect(checkoutButtons).toContain('checkout-as-guest');
    expect(shippingBilling).toContain('GuestCheckoutAddressForm');
    expect(shippingBilling).not.toContain('billing-guest-empty');
    expect(shippingBilling).not.toContain('shipping-guest-empty');
    expect(orderStockType).toContain('showGuestSignInWall');
    expect(useUser).not.toContain("alias: 'N/A'");
  });
});
