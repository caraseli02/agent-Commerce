import type { TaxonomyInterface } from '~/types/dashboard/categories';
import { useToast } from '@/components/ui/toast/use-toast';

type IMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

/**
 * Finds the parent ID for a given category ID in a recursive category structure.
 */
export function findParentId(categories: TaxonomyInterface[], targetId: string): string | undefined {
  function search(items: TaxonomyInterface[]): string | undefined {
    for (const item of items) {
      const subcategories = item.subcategory ?? [];
      if (subcategories.length > 0) {
        for (const subItem of subcategories) {
          if (subItem.id === targetId) {
            return item.id;
          }
        }
        const result = search(subcategories);
        if (result) return result;
      }
    }
    return undefined;
  }

  return search(categories);
}

export function extractIds(data: TaxonomyInterface) {
  const ids: string[] = [];

  function recurse(item: TaxonomyInterface) {
    ids.push(item.id); // Add the current item's id

    // If the current item has a 'subcategory', recurse through each of them
    if (item.subcategory && item.subcategory.length > 0) {
      item.subcategory.forEach(recurse);
    }
  }

  recurse(data); // Start recursion with the root item
  return ids;
}

export function extractIdAndName(dataArray: TaxonomyInterface[], excludeIds?: string[]) {
  const result: { id: string; name: string }[] = [];

  function recurse(item: TaxonomyInterface) {
    // If the current item or unknown of its children are excluded, skip the recursion
    if (excludeIds && excludeIds.includes(item.id)) {
      return; // Skip this item and all its subcategories
    }

    // Add the current item's id and name to the result if not excluded
    result.push({ id: item.id, name: item.name });

    // Recurse through subcategories if they exist
    if (item.subcategory && item.subcategory.length > 0) {
      item.subcategory.forEach(recurse);
    }
  }

  // Iterate over each object in the array
  dataArray.forEach(recurse);

  return result;
}

export const filterByQuery = (items: TaxonomyInterface[], query: string): TaxonomyInterface[] => {
  const results: TaxonomyInterface[] = [];
  const search = (categories: TaxonomyInterface[], query: string) => {
    for (const category of categories) {
      if (category.name.toLowerCase().includes(query.toLowerCase())) {
        results.push(category);
      }
      else {
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        category?.subcategory && search(category.subcategory, query);
      }
    }
  };

  search(items, query);
  return results;
};

export const sortByField = <T>(items: T[], field: keyof T, order: 'asc' | 'desc') => {
  const multiplier = order === 'asc' ? 1 : -1;
  return items.sort((a, b) => {
    if (typeof a[field] === 'string') {
      return (a[field] as string).localeCompare(b[field] as string) * multiplier;
    }
    if (typeof a[field] === 'number' && typeof b[field] === 'number') {
      return (((a[field] as number) - b[field]) as number) * multiplier;
    }
    return 0;
  });
};

export const apiRequest = async (url: string, method: IMethod, token: string, body?: Record<string, unknown>) => {
  const { toast } = useToast();
  const config = useRuntimeConfig();
  try {
    const response = await $fetch<{ status: string; description: string }>(`${config.public.BASE_URL_API}${url}`, {
      method,
      headers: { Authorization: `Bearer ${token}` },
      ...(body !== undefined ? { body } : {}),
    });
    toast({
      title: response.status,
      description: response.description,
    });
    return response;
  }
  catch (error: unknown) {
    const description
            = error instanceof Error
              ? error.message
              : typeof error === 'object'
                && error !== null
                && 'description' in error
                && typeof (error as { description?: unknown }).description === 'string'
                ? (error as { description: string }).description
                : 'An error occurred during the request.';
    toast({
      title: 'Error',
      description,
      variant: 'destructive',
    });
    console.error(`Error during API request: ${method} ${url}`, error);
    throw error;
  }
};
