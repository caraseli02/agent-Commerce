import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const smokePathFiles = [
  'components/admin-table/order/Order.vue',
  'components/admin-table/customer/Customer.vue',
  'components/dashboard/orders/InfoCards.vue',
  'pages/dashboard/customers/[slug]/control-panel.vue',
  'pages/dashboard/customers/[slug]/control-panel/[view].vue',
  'components/dashboard/customers/CustomerInformation.vue',
  'components/dashboard/customers/RecentTransactions.vue',
];

describe('order and dashboard type namespace consolidation (#403)', () => {
  it('keeps deprecated model paths as re-export shims', () => {
    const placeOrderShim = readFileSync(resolve('model/order/response/PlaceOrder.ts'), 'utf8');
    const adminUsersShim = readFileSync(resolve('model/dashboard/response/CustomerInterfaceResponse.ts'), 'utf8');
    const clientDashboardShim = readFileSync(resolve('model/dashboard/customer-information/customer-information.ts'), 'utf8');

    expect(placeOrderShim).toContain('@deprecated');
    expect(placeOrderShim).toContain("export * from '~/types/order/place-order'");
    expect(adminUsersShim).toContain("export * from '~/types/dashboard/admin-users'");
    expect(clientDashboardShim).toContain("export * from '~/types/dashboard/client-dashboard'");
  });

  it('types admin orders API composables with canonical response shapes', () => {
    const ordersApi = readFileSync(resolve('composables/api/orders.ts'), 'utf8');

    expect(ordersApi).toContain('PaginatedOrdersResponse');
    expect(ordersApi).toContain('WidgetResponse');
    expect(ordersApi).toContain('OrderRequestInterfaceResponse');
    expect(ordersApi).toContain('$apiClient<PaginatedOrdersResponse>');
    expect(ordersApi).toContain('$apiClient<WidgetResponse>');
    expect(ordersApi).toContain('$apiClient<OrderRequestInterfaceResponse>');
  });

  it('removes fetch-path as unknown as cast hubs on Admin Smoke Path', () => {
    const fetchCastPatterns = [
      /fetchOrders\([^)]*\)\s+as\s+unknown/,
      /fetchWidget\([^)]*\)\s+as\s+unknown/,
      /fetchCustomersList\([^)]*\)\s+as\s+unknown/,
      /fetchCustomerInformation\([^)]*\)\s+as\s+unknown/,
      /fetchCustomerRecentTransactions\([^)]*\)\s+as\s+unknown/,
      /\.data\.items\s+as\s+unknown\s+as/,
      /type\s+as\s+unknown\s+as\s+WidgetApiType/,
    ];

    for (const relativePath of smokePathFiles) {
      const source = readFileSync(resolve(relativePath), 'utf8');
      for (const pattern of fetchCastPatterns) {
        expect(source, `${relativePath} matched ${pattern}`).not.toMatch(pattern);
      }
    }
  });
});
