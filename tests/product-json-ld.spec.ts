import { describe, expect, it } from 'vitest';

import { buildBreadcrumbJsonLd, buildProductJsonLd, buildProductPageJsonLd } from '~~/helpers/product-json-ld';
import type { ProductDetail } from '~~/types/product';

const SITE = 'https://shop.example';
const toAbsoluteUrl = (url: string) => (url.startsWith('//') ? `https:${url}` : new URL(url, `${SITE}/`).href);
const context = { toAbsoluteUrl, pageUrl: `${SITE}/product/stm32f407vgt6` };

const makeProduct = (overrides: Partial<ProductDetail> = {}): ProductDetail =>
  ({
    name: 'STM32F407VGT6 Microcontroller',
    alias: 'stm32f407vgt6',
    description: '32-bit ARM Cortex-M4 MCU.',
    code: 'MCU-001',
    manufacturer: 'STMicroelectronics',
    manufacturerCode: 'STM',
    stock: 150,
    sold: 10,
    measure: 'Unit',
    priceHistory: [{ price: 949.99, active: true }],
    priceConfiguration: {
      smartLinkId: 'smart-price-1',
      configuration: [
        { price: 999.99, quantity: 1 },
        { price: 979.99, quantity: 5 },
      ],
    },
    details: {
      SummaryData: {
        Datasheet: 'datasheet.pdf',
        TaxonomyPath: 'Semiconductors > Microcontrollers > ARM Cortex-M4',
        TaxonomyPathIDs: '1,2,3',
        SmallImageURL: '/images/products/microcontroller.png',
        PartDescription: 'LQFP-100',
        Manufacturer: 'STMicroelectronics',
      },
      ParametricData: { Features: [] },
      ProductImage: {
        ProductImageSmall: '/images/products/microcontroller-small.png',
        ProductImageLarge: '/images/products/microcontroller.png',
      },
    },
    ...overrides,
  }) as ProductDetail;

const withoutTaxonomy = () => {
  const product = makeProduct();
  product.details.SummaryData.TaxonomyPath = '';
  return product;
};

describe('buildProductJsonLd', () => {
  it('maps the product detail fields to a schema.org Product with absolute URLs', () => {
    expect(buildProductJsonLd(makeProduct(), context)).toEqual({
      '@type': 'Product',
      '@id': `${SITE}/product/stm32f407vgt6#product`,
      name: 'STM32F407VGT6 Microcontroller',
      url: `${SITE}/product/stm32f407vgt6`,
      description: '32-bit ARM Cortex-M4 MCU.',
      image: [`${SITE}/images/products/microcontroller.png`],
      sku: 'MCU-001',
      brand: { '@type': 'Brand', name: 'STMicroelectronics' },
      offers: {
        '@type': 'Offer',
        url: `${SITE}/product/stm32f407vgt6`,
        price: 999.99,
        priceCurrency: 'RON',
        availability: 'https://schema.org/InStock',
      },
    });
  });

  it('uses the entry tier price with the product-level discount applied, as the page shows it', () => {
    const product = makeProduct({ adminSettings: { discount: { value: 10, startDate: '', endDate: '' } } });

    expect(buildProductJsonLd(product, context).offers).toMatchObject({ price: 899.99 });
  });

  it('falls back to the active price history entry when there are no price tiers', () => {
    const product = makeProduct({ priceConfiguration: undefined });

    expect(buildProductJsonLd(product, context).offers).toMatchObject({ price: 949.99 });
  });

  it('reports out-of-stock products as backorder, matching the stock badge', () => {
    expect(buildProductJsonLd(makeProduct({ stock: 0 }), context).offers).toMatchObject({
      availability: 'https://schema.org/BackOrder',
    });
  });

  it('omits fields the product does not have instead of emitting empty values', () => {
    const product = makeProduct({
      description: '',
      code: '',
      alias: '',
      manufacturer: '',
      stock: Number.NaN,
      priceConfiguration: undefined,
      priceHistory: [],
      details: {
        SummaryData: { Manufacturer: '' },
        ParametricData: { Features: [] },
        ProductImage: { ProductImageSmall: '', ProductImageLarge: '' },
      },
    } as unknown as Partial<ProductDetail>);

    expect(buildProductJsonLd(product, context)).toEqual({
      '@type': 'Product',
      '@id': `${SITE}/product/stm32f407vgt6#product`,
      name: 'STM32F407VGT6 Microcontroller',
      url: `${SITE}/product/stm32f407vgt6`,
    });
  });

  it('falls back to the alias for sku and to the summary manufacturer for brand', () => {
    const product = makeProduct({ code: undefined, manufacturer: undefined });

    expect(buildProductJsonLd(product, context)).toMatchObject({
      sku: 'stm32f407vgt6',
      brand: { '@type': 'Brand', name: 'STMicroelectronics' },
    });
  });

  it('emits an offer without availability when stock is unknown', () => {
    const offers = buildProductJsonLd(makeProduct({ stock: undefined as unknown as number }), context).offers as Record<string, unknown>;

    expect(offers.price).toBe(999.99);
    expect(offers).not.toHaveProperty('availability');
  });
});

describe('buildBreadcrumbJsonLd', () => {
  it('lists Home, each taxonomy level with its storefront search URL, then the product', () => {
    expect(buildBreadcrumbJsonLd(makeProduct(), context)).toEqual({
      '@type': 'BreadcrumbList',
      '@id': `${SITE}/product/stm32f407vgt6#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
        { '@type': 'ListItem', position: 2, name: 'Semiconductors', item: `${SITE}/search?category=semiconductors` },
        {
          '@type': 'ListItem',
          position: 3,
          name: 'Microcontrollers',
          item: `${SITE}/search?category=semiconductors%2Fmicrocontrollers`,
        },
        {
          '@type': 'ListItem',
          position: 4,
          name: 'ARM Cortex-M4',
          item: `${SITE}/search?category=semiconductors%2Fmicrocontrollers%2Farm-cortex-m4`,
        },
        { '@type': 'ListItem', position: 5, name: 'STM32F407VGT6 Microcontroller', item: `${SITE}/product/stm32f407vgt6` },
      ],
    });
  });

  it('prefers the indexed taxonomyPath, like the breadcrumb UI', () => {
    const product = { ...makeProduct(), taxonomyPath: 'Audio > Headphones' } as ProductDetail;
    const names = (buildBreadcrumbJsonLd(product, context)?.itemListElement as Array<{ name: string }>).map((item) => item.name);

    expect(names).toEqual(['Home', 'Audio', 'Headphones', 'STM32F407VGT6 Microcontroller']);
  });

  it('returns null when the product has no taxonomy crumbs', () => {
    expect(buildBreadcrumbJsonLd(withoutTaxonomy(), context)).toBeNull();
  });
});

describe('buildProductPageJsonLd', () => {
  it('wraps both nodes in one @graph under a single schema.org context', () => {
    const graph = buildProductPageJsonLd(makeProduct(), context);

    expect(graph['@context']).toBe('https://schema.org');
    expect((graph['@graph'] as Array<Record<string, unknown>>).map((node) => node['@type'])).toEqual(['Product', 'BreadcrumbList']);
    expect(JSON.parse(JSON.stringify(graph))).toEqual(graph);
  });

  it('keeps only the Product node when no breadcrumbs are available', () => {
    const graph = buildProductPageJsonLd(withoutTaxonomy(), context);

    expect((graph['@graph'] as Array<Record<string, unknown>>).map((node) => node['@type'])).toEqual(['Product']);
  });
});
