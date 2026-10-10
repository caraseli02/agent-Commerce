import { describe, expect, it } from 'vitest';
import { resolveOrderLineIdentity } from '~~/helpers/order-line-identity';

const baseItem = {
  id: 'prod-1',
  stock: 1,
  isFolder: false,
  initialUnitPrice: 1,
  unitPriceAfterDiscounts: 1,
  subtotal: 1,
  total: 1,
  discount: { value: 0, startDate: '', endDate: '' },
};

describe('order line identity', () => {
  it('renders immutable persisted name and code without catalog data', () => {
    expect(resolveOrderLineIdentity({ ...baseItem, name: 'Purchased MCU', code: 'STM32-ORDER-SNAPSHOT' })).toEqual({
      name: 'Purchased MCU',
      code: 'STM32-ORDER-SNAPSHOT',
      description: undefined,
      manufacturer: undefined,
    });
  });

  it('uses embedded legacy data only when the persisted snapshot is absent', () => {
    expect(
      resolveOrderLineIdentity({
        ...baseItem,
        productEntity: { name: 'Legacy resistor', description: '1 kΩ', manufacturer: 'Legacy parts' },
      } as never),
    ).toEqual({ name: 'Legacy resistor', code: undefined, description: '1 kΩ', manufacturer: 'Legacy parts' });
  });
});
