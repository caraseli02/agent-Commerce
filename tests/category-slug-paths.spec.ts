import { beforeAll, describe, expect, it, vi } from 'vitest';
import {
  buildCategoryCrumbs,
  buildCategorySlugPath,
  buildSlugPathCrumbs,
  categoryBrowseUrl,
  getProductTaxonomyPath,
  humanizeCategorySlug,
  matchesCategoryPath,
  normalizeCategoryPath,
  slugifyCategoryName,
  toCategorySlugSegments,
} from '../helpers/categoryPath.helper';
import { buildDemoTaxonomyTree, mapDemoCategoryNode } from '../data/demoTaxonomyTree';
import { findCategoryByPath } from '../helpers/categories.helper';
import { mockProducts } from '../server/utils/mockProducts';
import type { ProductInterface } from '~/types/product';
import type { TaxonomyInterface } from '../types/dashboard/categories';

vi.mock('~/store/categoriesStore', () => ({
  useCategoriesStore: () => ({
    categoriesMap: null,
    updateCategories: () => undefined,
  }),
}));

const flatten = (categories: TaxonomyInterface[]): TaxonomyInterface[] =>
  categories.flatMap((category) => [category, ...flatten(category.subcategory ?? [])]);

const asCategorySource = (product: ProductInterface) => ({
  path: product.path,
  category: product.category,
  alias: product.alias,
  taxonomyPath: getProductTaxonomyPath(product),
});

const filterByCategory = (category: string) =>
  (mockProducts as ProductInterface[]).filter((product) => matchesCategoryPath(asCategorySource(product), category));

describe('category slug paths', () => {
  describe('slug helpers', () => {
    it('slugifies names and normalizes both path and label chains', () => {
      expect(slugifyCategoryName('Interface ICs')).toBe('interface-ics');
      expect(slugifyCategoryName('Cables & Connectors')).toBe('cables-connectors');
      expect(slugifyCategoryName('ARM Cortex-M4')).toBe('arm-cortex-m4');

      expect(toCategorySlugSegments('Semiconductors > Microcontrollers')).toEqual(['semiconductors', 'microcontrollers']);
      expect(normalizeCategoryPath('Semiconductors > Microcontrollers')).toBe('semiconductors/microcontrollers');
      expect(normalizeCategoryPath('semiconductors/microcontrollers')).toBe('semiconductors/microcontrollers');
      expect(normalizeCategoryPath('Audio')).toBe('audio');
      expect(normalizeCategoryPath('')).toBe('');

      expect(buildCategorySlugPath(['Semiconductors', 'Interface ICs'])).toBe('semiconductors/interface-ics');
      expect(humanizeCategorySlug('air-purifier')).toBe('Air Purifier');
      expect(humanizeCategorySlug('arm-cortex-m4')).toBe('Arm Cortex-M4');
      expect(humanizeCategorySlug('usb-c')).toBe('USB-C');
      expect(humanizeCategorySlug('rs-485')).toBe('RS-485');
      expect(getProductTaxonomyPath({ details: { SummaryData: { TaxonomyPath: 'Audio > Microphone > USB' } } })).toBe(
        'Audio > Microphone > USB',
      );
      expect(getProductTaxonomyPath({ taxonomyPath: 'Audio > Speaker > Bluetooth' })).toBe('Audio > Speaker > Bluetooth');
    });

    it('builds crumbs that each keep their own ancestor path', () => {
      expect(buildCategoryCrumbs(['Semiconductors ', ' Microcontrollers', 'ARM Cortex-M4'])).toEqual([
        { name: 'Semiconductors', path: 'semiconductors' },
        { name: 'Microcontrollers', path: 'semiconductors/microcontrollers' },
        { name: 'ARM Cortex-M4', path: 'semiconductors/microcontrollers/arm-cortex-m4' },
      ]);

      expect(buildSlugPathCrumbs('audio/air-purifier')).toEqual([
        { name: 'Audio', path: 'audio' },
        { name: 'Air Purifier', path: 'audio/air-purifier' },
      ]);

      expect(buildSlugPathCrumbs('semiconductors/microcontrollers/arm-cortex-m4')).toEqual([
        { name: 'Semiconductors', path: 'semiconductors' },
        { name: 'Microcontrollers', path: 'semiconductors/microcontrollers' },
        { name: 'Arm Cortex-M4', path: 'semiconductors/microcontrollers/arm-cortex-m4' },
      ]);

      expect(buildSlugPathCrumbs('audio/headphones', (path) => (path === 'audio/headphones' ? 'Headphones' : undefined))).toEqual([
        { name: 'Audio', path: 'audio' },
        { name: 'Headphones', path: 'audio/headphones' },
      ]);
    });
  });

  describe('browse url contract', () => {
    it('browses by slug path instead of a keyword or taxonomy id', () => {
      expect(categoryBrowseUrl({ path: 'semiconductors/microcontrollers', name: 'Microcontrollers' })).toBe(
        '/search?category=semiconductors%2Fmicrocontrollers',
      );
      expect(categoryBrowseUrl({ path: '', name: 'Interface ICs' })).toBe('/search?category=interface-ics');
      expect(categoryBrowseUrl({})).toBe('/search');
    });

    it('browses every demo taxonomy leaf through a slug path', () => {
      const leaves = flatten(buildDemoTaxonomyTree()).filter((category) => (category.subcategory ?? []).length === 0);

      expect(leaves.length).toBeGreaterThan(0);
      for (const leaf of leaves) {
        expect(categoryBrowseUrl(leaf)).toBe(`/search?category=${encodeURIComponent(leaf.path)}`);
        expect(leaf.path).not.toMatch(/[a-f0-9]{24}/);
      }
    });
  });

  describe('demo taxonomy tree', () => {
    it('maps demo nodes to slug paths while keeping demo ids internal', () => {
      const node = mapDemoCategoryNode({
        _id: '6640cce35fbc8c0fd9f7ed05',
        name: 'Semiconductors',
        status: 'published',
        items: [{ _id: '6640d32a5fbc8c0fd9f7ed1a', name: 'Interface ICs', status: 'published' }],
      });

      expect(node.id).toBe('6640cce35fbc8c0fd9f7ed05');
      expect(node.path).toBe('semiconductors');
      expect(node.alias).toBe('semiconductors');
      const child = node.subcategory?.[0];
      expect(child).toBeDefined();
      if (!child) {
        throw new Error('Expected the mapped demo node to include its child category');
      }
      expect(child.path).toBe('semiconductors/interface-ics');
      expect(child.id).toBe('6640d32a5fbc8c0fd9f7ed1a');
    });

    it('exposes the catalog categories with catalog-aligned counts', () => {
      const tree = buildDemoTaxonomyTree();
      const names = tree.map((category) => category.name);

      expect(names).toEqual(
        expect.arrayContaining([
          'Semiconductors',
          'Passives',
          'Connectors',
          'Audio',
          'Electronics',
          'Components',
          'Accessories',
          'Wearables',
          'Tools',
          'Home',
          'Office',
        ]),
      );

      expect(findCategoryByPath('semiconductors/microcontrollers', tree)?.name).toBe('Microcontrollers');
      expect(findCategoryByPath('audio/headphones', tree)?.productCount).toBe(1);
      expect(findCategoryByPath('tools', tree)?.productCount).toBe(3);
      expect(findCategoryByPath('unknown/branch', tree)).toBeNull();
    });

    it('keeps a product count on every published leaf that the catalog can serve', () => {
      const tree = buildDemoTaxonomyTree();
      const catalogLeaves = flatten(tree).filter(
        (category) => (category.subcategory ?? []).length === 0 && category.isPublished && filterByCategory(category.path).length > 0,
      );

      expect(catalogLeaves.length).toBeGreaterThan(20);
      for (const leaf of catalogLeaves) {
        expect(leaf.productCount, `${leaf.path} should report products`).toBeGreaterThan(0);
      }
    });
  });

  describe('search category matching', () => {
    it('matches a slug path exactly and by prefix', () => {
      const microcontroller = asCategorySource(
        (mockProducts as ProductInterface[]).find((product) => product.path === 'semiconductors/microcontrollers')!,
      );

      expect(matchesCategoryPath(microcontroller, 'semiconductors/microcontrollers')).toBe(true);
      expect(matchesCategoryPath(microcontroller, 'semiconductors')).toBe(true);
      expect(matchesCategoryPath(microcontroller, 'Semiconductors > Microcontrollers')).toBe(true);
      expect(matchesCategoryPath(microcontroller, 'passives/diodes')).toBe(false);
      expect(matchesCategoryPath(microcontroller, '6640cce35fbc8c0fd9f7ed05')).toBe(false);
      expect(matchesCategoryPath(microcontroller, '')).toBe(true);
    });

    it('resolves taxonomy leaves that are deeper than the catalog path', () => {
      expect(filterByCategory('semiconductors/microcontrollers/arm-cortex-m4')).toHaveLength(1);
      expect(filterByCategory('semiconductors/interface-ics/rs-485')).toHaveLength(1);
      expect(filterByCategory('passives/diodes/schottky')).toHaveLength(1);
      // A bare top-level category must not swallow an unrelated sibling branch.
      expect(filterByCategory('semiconductors/power-management')).toHaveLength(0);
    });

    it('returns products for every menu leaf of the demo taxonomy that maps to the catalog', () => {
      const tree = buildDemoTaxonomyTree();

      expect(filterByCategory(findCategoryByPath('audio/headphones', tree)!.path)).toHaveLength(1);
      expect(filterByCategory(findCategoryByPath('tools', tree)!.path)).toHaveLength(3);
      expect(filterByCategory(findCategoryByPath('electronics', tree)!.path)).toHaveLength(4);
      expect(filterByCategory(findCategoryByPath('semiconductors/microcontrollers/arm-cortex-m4', tree)!.path)).toHaveLength(1);
    });
  });

  describe('search endpoint', () => {
    beforeAll(() => {
      vi.stubGlobal('defineEventHandler', (handler: unknown) => handler);
      vi.stubGlobal('readBody', async (event: { body?: unknown }) => event?.body ?? {});
      vi.stubGlobal('getQuery', (event: { query?: Record<string, unknown> }) => event?.query ?? {});
    });

    const searchWith = async (query: Record<string, unknown>) => {
      const handler = (await import('../server/api/products/search.post')).default as (event: unknown) => Promise<{
        data: { items: { total_items: number; items: ProductInterface[] } };
      }>;

      const response = await handler({ query: { perPage: 50, ...query }, body: {} });
      return response.data.items;
    };

    it('filters by slug path, ancestor path, and taxonomy leaf', async () => {
      const leaf = await searchWith({ category: 'semiconductors/microcontrollers' });
      expect(leaf.total_items).toBe(1);
      const firstLeafItem = leaf.items[0];
      expect(firstLeafItem).toBeDefined();
      if (!firstLeafItem) {
        throw new Error('Expected the microcontrollers search to return a product');
      }
      expect(firstLeafItem.path).toBe('semiconductors/microcontrollers');

      const branch = await searchWith({ category: 'semiconductors' });
      expect(branch.total_items).toBe(2);

      const deepLeaf = await searchWith({ category: 'semiconductors/microcontrollers/arm-cortex-m4' });
      expect(deepLeaf.total_items).toBe(1);
    });

    it('still resolves a legacy category name link via slug normalization', async () => {
      const byName = await searchWith({ category: 'Audio' });
      expect(byName.total_items).toBe(3);
      expect(byName.items.every((product) => product.path?.startsWith('audio/'))).toBe(true);
    });

    it('does not treat a non-category substring as a keyword search', async () => {
      const byUsb = await searchWith({ category: 'usb' });
      expect(byUsb.total_items).toBe(0);

      const byCortex = await searchWith({ category: 'cortex' });
      expect(byCortex.total_items).toBe(0);
    });

    it('keeps the keyword filter independent from the category filter', async () => {
      const combined = await searchWith({ keyword: 'headphones', category: 'audio' });
      expect(combined.total_items).toBeGreaterThan(0);
      expect(combined.items.every((product) => product.category === 'Audio')).toBe(true);
    });
  });
});
