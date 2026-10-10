import type { CategoriesMap, TaxonomyInterface } from '~~/types/dashboard/categories';
import { useCategoriesStore } from '~/store/categoriesStore';
import { buildCategorySlugPath, normalizeCategoryPath, slugifyCategoryName, toCategorySlugSegments } from '~~/helpers/categoryPath.helper';

export const mapLabelsToIds = (array: TaxonomyInterface[], result: CategoriesMap = {}): CategoriesMap => {
  const categoriesStore = useCategoriesStore();

  // Only fall back to the persisted map while the taxonomy is still loading; a loaded taxonomy always wins
  // so a stale localStorage map can never block a rebuild after the tree changes.
  if (!array || array.length === 0) {
    return categoriesStore.categoriesMap ?? {};
  }

  const recursiveFn = (items: TaxonomyInterface[], map: CategoriesMap): CategoriesMap => {
    for (const item of items) {
      map[item.name] = item.id;
      if (item.subcategory && item.subcategory.length > 0) {
        recursiveFn(item.subcategory, map);
      }
    }
    return map;
  };

  const mappedCategories = recursiveFn(array, result);
  categoriesStore.updateCategories(mappedCategories);

  return mappedCategories;
};

/**
 * Resolves the segments of a category path to taxonomy entries. Segments are slugs
 * (`semiconductors/microcontrollers`); legacy id chains still resolve for older links.
 */
export const mapPathArrayOfNames = (path: string, categoriesMap: CategoriesMap) => {
  const bySegment = new Map<string, { name: string; id: string }>();

  for (const [name, id] of Object.entries(categoriesMap)) {
    const entry = { name, id };
    bySegment.set(slugifyCategoryName(name), entry);
    if (id) {
      bySegment.set(id.toLowerCase(), entry);
    }
  }

  return toCategorySlugSegments(path)
    .map((segment) => bySegment.get(segment))
    .filter((entry): entry is { id: string; name: string } => Boolean(entry));
};

/** Builds the slug path for a chain of known category names. */
export const mapNamesToPath = (namesArray: string[], categoriesMap: CategoriesMap) => {
  return buildCategorySlugPath(namesArray.filter((name) => Boolean(categoriesMap[name])));
};

export const findCategory = (id: string, categories: TaxonomyInterface[]): TaxonomyInterface | null => {
  if (!id) {
    return null;
  }

  for (const category of categories) {
    if (category.id === id) {
      return category;
    }
    if (category.subcategory) {
      const foundCategory = findCategory(id, category.subcategory);
      if (foundCategory) {
        return foundCategory;
      }
    }
  }

  return null;
};

export const findCategoryByPath = (path: string, categories: TaxonomyInterface[]): TaxonomyInterface | null => {
  const target = normalizeCategoryPath(path);
  if (!target) {
    return null;
  }

  for (const category of categories) {
    if (normalizeCategoryPath(category.path) === target) {
      return category;
    }
    if (category.subcategory) {
      const foundCategory = findCategoryByPath(target, category.subcategory);
      if (foundCategory) {
        return foundCategory;
      }
    }
  }

  return null;
};
