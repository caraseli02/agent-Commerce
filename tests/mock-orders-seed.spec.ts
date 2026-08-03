import { describe, expect, it } from 'vitest';

import { DEFAULT_MOCK_ORDERS_COUNT, expandMockOrders, getDemoOrders, resolveMockOrdersCount } from '~/server/utils/mockDashboardDemo';

describe('mock admin orders seed', () => {
  it('pads curated fixtures to the default virtualization QA count', () => {
    expect(resolveMockOrdersCount()).toBe(DEFAULT_MOCK_ORDERS_COUNT);
    expect(DEFAULT_MOCK_ORDERS_COUNT).toBeGreaterThanOrEqual(120);

    const expanded = expandMockOrders();
    expect(expanded).toHaveLength(DEFAULT_MOCK_ORDERS_COUNT);
    expect(expanded[0].orderNumber).toBe('ORD-2024-0001');
    expect(expanded[29].orderNumber).toBe('ORD-2024-0030');
    expect(expanded[119].orderNumber).toBe('ORD-2024-0120');
  });

  it('maps padded fixtures into the admin orders API contract', () => {
    const orders = getDemoOrders();

    expect(orders.length).toBeGreaterThanOrEqual(120);
    expect(orders[0].shortId).toBe('ORD-2024-0001');
    expect(orders[0]._id).toBe('ord-1');
    expect(orders[119].shortId).toBe('ORD-2024-0120');
    expect(orders[119]._id).toBe('ord-120');
  });

  it('honors MOCK_ORDERS_COUNT for stress runs', () => {
    const previous = process.env.MOCK_ORDERS_COUNT;
    process.env.MOCK_ORDERS_COUNT = '45';

    try {
      expect(resolveMockOrdersCount()).toBe(45);
      expect(expandMockOrders(45)).toHaveLength(45);
    } finally {
      if (previous === undefined) {
        delete process.env.MOCK_ORDERS_COUNT;
      } else {
        process.env.MOCK_ORDERS_COUNT = previous;
      }
    }
  });
});
