import { categories as demoCategories } from '~~/data/categories';
import { countDemoProductsForCategory } from '~~/data/demoProductTaxonomy';
import { slugifyCategoryName } from '~~/helpers/categoryPath.helper';
import type { TaxonomyInterface } from '~~/types/dashboard/categories';

export type DemoCategoryNode = {
  _id: string;
  name: string;
  status?: string;
  icon?: string;
  items?: DemoCategoryNode[];
};

/**
 * Builds the demo taxonomy the storefront consumes in mock mode. `id` stays the demo `_id` for
 * admin screens, while `path`/`alias` are slug based (`semiconductors/microcontrollers`) so public
 * links match `mockProducts.path` instead of leaking taxonomy ids.
 */
export const mapDemoCategoryNode = (node: DemoCategoryNode, parentPath = ''): TaxonomyInterface => {
  const alias = slugifyCategoryName(node.name);
  const path = parentPath ? `${parentPath}/${alias}` : alias;
  const children = (node.items || []).map((item) => mapDemoCategoryNode(item, path));
  const childProductTotal = children.reduce((sum, child) => sum + (child.productCount || 0), 0);
  const directProductCount = countDemoProductsForCategory(node.name);
  // Prefer real catalog matches; for parents also roll up children so empty leaves do not zero out a match.
  const productCount = children.length > 0 ? Math.max(childProductTotal, directProductCount) : directProductCount;

  return {
    id: node._id,
    name: node.name,
    alias,
    averageWeight: 0,
    productCount,
    products: [],
    subcategory: children,
    path,
    isPublished: node.status === 'published',
    icon: node.icon,
  };
};

export const buildDemoTaxonomyTree = (): TaxonomyInterface[] =>
  (demoCategories as DemoCategoryNode[]).map((category) => mapDemoCategoryNode(category));
