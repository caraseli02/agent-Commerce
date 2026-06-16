import type { CategoriesMap, TaxonomyInterface } from '~/types/dashboard/categories';
import { useCategoriesStore } from '~/store/categoriesStore';

export const mapLabelsToIds = (array: TaxonomyInterface[], result: CategoriesMap = {}): CategoriesMap => {
  const categoriesStore = useCategoriesStore();

  if (categoriesStore.categoriesMap && Object.keys(categoriesStore.categoriesMap).length) {
    return categoriesStore.categoriesMap;
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

export const mapPathArrayOfNames = (path: string, categoriesMap: CategoriesMap) => {
  const idToNameMap = Object.entries(categoriesMap).reduce<Record<string, { name: string; id: string }>>((acc, [name, id]) => {
    acc[id] = { name, id };
    return acc;
  }, {});

  return path
    .split('/')
    .filter(id => id)
    .map(id => idToNameMap[id])
    .filter((entry): entry is { id: string; name: string } => Boolean(entry));
};

export const mapNamesToPath = (namesArray: string[], categoriesMap: CategoriesMap) => {
  const ids = namesArray.map(name => categoriesMap[name] ?? null);
  return ids.filter(Boolean).join('/');
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
