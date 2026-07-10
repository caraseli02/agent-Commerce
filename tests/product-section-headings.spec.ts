import { describe, expect, it } from 'vitest';
import { getProductSectionHeading, PRODUCT_SECTION_HEADINGS } from '~/utils/productSectionHeadings';

describe('product section headings', () => {
  it('maps storefront filter slugs to natural section titles', () => {
    expect(getProductSectionHeading('featured')).toBe('Featured Products');
    expect(getProductSectionHeading('best-sellers')).toBe('Best-Selling Products');
    expect(getProductSectionHeading('hot-deals')).toBe('Hot Deals');
    expect(getProductSectionHeading('top-searched')).toBe('Top Searched Products');
  });

  it('covers every default storefront tab slug', () => {
    const defaultSlugs = ['featured', 'best-sellers', 'hot-deals', 'top-searched'];

    for (const slug of defaultSlugs) {
      expect(PRODUCT_SECTION_HEADINGS[slug]).toBeTruthy();
      expect(getProductSectionHeading(slug)).not.toMatch(/Products Products/i);
    }
  });
});
