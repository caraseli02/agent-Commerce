import { describe, expect, it } from 'vitest';
import { catalog } from '~~/server/domain/catalog';
import { getMockUserById } from '~~/server/utils/mockUsers';

describe('Catalog checkout quote', () => {
  it('returns every payable component from one server-authoritative quote', async () => {
    const customer = getMockUserById('mock-customer-1');

    const result = await catalog.quoteCheckout({
      customer: customer || undefined,
      deliveryServiceId: 2,
      items: [{ productId: 'prod-1', quantity: 1 }],
    });

    expect(result).toEqual({
      kind: 'quoted',
      quote: expect.objectContaining({
        currency: 'RON',
        lines: [
          expect.objectContaining({
            productId: 'prod-1',
            quantity: 1,
            listUnitPrice: { minor: 99_999, currency: 'RON' },
            discountPercent: 5,
            discountTotal: { minor: 5_000, currency: 'RON' },
            unitPrice: { minor: 94_999, currency: 'RON' },
            lineTotal: { minor: 94_999, currency: 'RON' },
            vatTotal: { minor: 18_050, currency: 'RON' },
          }),
        ],
        merchandiseTotal: { minor: 94_999, currency: 'RON' },
        discountTotal: { minor: 5_000, currency: 'RON' },
        shippingTotal: { minor: 2_990, currency: 'RON' },
        smallOrderCharge: { minor: 0, currency: 'RON' },
        vatRate: 0.19,
        vatTotal: { minor: 18_050, currency: 'RON' },
        grandTotal: { minor: 116_039, currency: 'RON' },
        deliveryOption: expect.objectContaining({ service: expect.objectContaining({ id: 2 }) }),
      }),
    });
  });

  it('rejects unavailable delivery choices instead of accepting browser shipping money', async () => {
    const result = await catalog.quoteCheckout({
      deliveryServiceId: 'attacker-selected-service',
      items: [{ productId: 'prod-1', quantity: 1 }],
    });

    expect(result).toEqual({ kind: 'delivery-unavailable' });
  });

  it('allocates rounded line VAT to exactly the authoritative aggregate VAT', async () => {
    const result = await catalog.quoteCheckout({
      deliveryServiceId: 1,
      items: [
        { productId: 'prod-1', quantity: 1 },
        { productId: 'prod-2', quantity: 1 },
      ],
    });

    expect(result.kind).toBe('quoted');
    if (result.kind !== 'quoted') return;

    expect(result.quote.lines.reduce((sum, line) => sum + line.vatTotal.minor, 0)).toBe(result.quote.vatTotal.minor);
  });
});
