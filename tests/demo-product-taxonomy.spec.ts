import { describe, expect, it } from 'vitest';
import { countDemoProductsForCategory, slugifyCategoryName } from '~/data/demoProductTaxonomy';

describe('demoProductTaxonomy', () => {
  it('slugifies category names for path matching', () => {
    expect(slugifyCategoryName('ARM Cortex-M4')).toBe('arm-cortex-m4');
    expect(slugifyCategoryName('Cables & Connectors')).toBe('cables-connectors');
  });

  it('counts products by top-level category name', () => {
    expect(countDemoProductsForCategory('Semiconductors')).toBe(2);
    expect(countDemoProductsForCategory('Passives')).toBe(1);
  });

  it('counts products by path segment for nested names', () => {
    expect(countDemoProductsForCategory('Microcontrollers')).toBe(1);
    expect(countDemoProductsForCategory('Diodes')).toBe(1);
    expect(countDemoProductsForCategory('ARM Cortex-M4')).toBe(0);
  });
});
