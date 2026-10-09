import { buildDemoTaxonomyTree } from '~~/data/demoTaxonomyTree';
import type { TaxonomyInterface } from '~~/types/dashboard/categories';
import { defineAnonymousCatalogHandler } from '~~/server/utils/anonymousCatalogCache';

interface CategoryResponseNode {
  _id: string;
  name: string;
  alias: string;
  path: string;
  active: boolean;
  productCount: number;
  children: CategoryResponseNode[];
}

// Derived from the same demo taxonomy the storefront renders, so slug paths cannot drift apart.
const toResponseNode = (category: TaxonomyInterface): CategoryResponseNode => ({
  _id: category.id,
  name: category.name,
  alias: category.alias ?? '',
  path: category.path,
  active: category.isPublished,
  productCount: category.productCount ?? 0,
  children: (category.subcategory ?? []).map(toResponseNode),
});

export default defineAnonymousCatalogHandler('categories', async () => {
  return {
    status: 'success',
    data: buildDemoTaxonomyTree().map(toResponseNode),
  };
});
