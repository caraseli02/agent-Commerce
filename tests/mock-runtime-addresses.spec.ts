import { describe, expect, it } from 'vitest';

import { addRuntimeAddress, deleteRuntimeAddress, getRuntimeAddresses, updateRuntimeAddress } from '../server/utils/mockRuntimeAddresses';

describe('mockRuntimeAddresses', () => {
  it('initializes demo addresses for a control-panel customer', () => {
    const addresses = getRuntimeAddresses('customer-001');

    expect(addresses.shippingAddress).toHaveLength(1);
    expect(addresses.billingAddress).toHaveLength(1);
    expect(addresses.shippingAddress[0]?.alias).toBe('Main Address');
  });

  it('supports add, update, and delete flows for shipping addresses', () => {
    const customerId = `customer-test-${Date.now()}`;
    const created = addRuntimeAddress(customerId, 'shipping', {
      alias: 'Warehouse',
      name1: '100 Demo Way',
      name2: '',
      country: 'US',
      region: 'California',
      city: 'San Francisco',
      postcode: '94105',
      default: false,
    });

    expect(created._id).toBeTruthy();

    const afterAdd = getRuntimeAddresses(customerId);
    expect(afterAdd.shippingAddress).toHaveLength(2);
    expect(afterAdd.shippingAddress.some((address) => address.alias === 'Warehouse')).toBe(true);

    const updated = updateRuntimeAddress(customerId, 'shipping', {
      ...created,
      alias: 'Updated Warehouse',
      default: created.default,
    });

    expect(updated?.alias).toBe('Updated Warehouse');

    const deleted = deleteRuntimeAddress(customerId, 'shipping', created._id);
    expect(deleted).toBe(true);

    const afterDelete = getRuntimeAddresses(customerId);
    expect(afterDelete.shippingAddress).toHaveLength(1);
    expect(afterDelete.shippingAddress[0]?.default).toBe(true);
  });
});
