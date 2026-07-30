import { describe, expect, it } from 'vitest';
import { countDemoProductsForCategory, demoProductTaxonomy, slugifyCategoryName } from '~/data/demoProductTaxonomy';
import { normalizeCategoryPath } from '~/helpers/categoryPath.helper';

describe('demoProductTaxonomy', () => {
  it('slugifies category names for path matching', () => {
    expect(slugifyCategoryName('ARM Cortex-M4')).toBe('arm-cortex-m4');
    expect(slugifyCategoryName('Cables & Connectors')).toBe('cables-connectors');
  });

  it('indexes catalog paths as slug paths', () => {
    for (const entry of demoProductTaxonomy) {
      expect(entry.path).toBe(normalizeCategoryPath(entry.path));
      expect(normalizeCategoryPath(entry.taxonomyPath).startsWith(slugifyCategoryName(entry.category))).toBe(true);
    }
  });

  it('counts products by top-level category name', () => {
    expect(countDemoProductsForCategory('Semiconductors')).toBe(2);
    expect(countDemoProductsForCategory('Passives')).toBe(1);
  });

  it('counts products by path segment for nested names', () => {
    expect(countDemoProductsForCategory('Microcontrollers')).toBe(1);
    expect(countDemoProductsForCategory('Diodes')).toBe(1);
    expect(countDemoProductsForCategory('Air Purifier')).toBe(1);
  });

  it('counts products for taxonomy leaves that sit below the catalog path', () => {
    expect(countDemoProductsForCategory('ARM Cortex-M4')).toBe(1);
    expect(countDemoProductsForCategory('RS-485')).toBe(1);
    expect(countDemoProductsForCategory('Schottky')).toBe(1);
    expect(countDemoProductsForCategory('Unknown Leaf')).toBe(0);
  });
});
