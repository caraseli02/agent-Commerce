import type { Updater } from '@tanstack/vue-table';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface Filter {
  id: string;
  value: unknown; // Value can be single or multiple
  type?: FiltersType;
}

export enum FiltersType {
  Flag = 'flag',
  Includes = 'includes',
  Fixed = 'fixed',
  Range = 'range',
  Sort = 'sort',
  Combined = 'combined',
  InArray = 'in_array',
  NinArray = 'not_in_array',
  Multiple = 'multiple',
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function valueUpdater<T extends Updater<unknown>>(updaterOrValue: T, ref: Ref) {
  ref.value = typeof updaterOrValue === 'function' ? updaterOrValue(ref.value) : updaterOrValue;
}

export function transformSortingKeys(sortingResponse: { id: string; desc: boolean }) {
  if (!sortingResponse) {
    return {}; // Return empty object for no sorting information
  }

  const sortBy = sortingResponse.id;
  const sortOrder = sortingResponse.desc ? 'desc' : 'asc';

  return {
    sortBy,
    sortOrder,
  };
}

export function transformFiltersToObject(filters: Filter[]): Record<string, unknown> {
  const transformedFilters: Record<string, unknown> = {};

  for (const filter of filters) {
    if (filter.id === 'userName') {
      // Change the key to 'name'
      transformedFilters['name'] = filter.value;
    } else if (filter.id === 'createdAt') {
      transformedFilters['startDate'] = (filter.value as string[])[0];
      transformedFilters['endDate'] = (filter.value as string[])[1];
    } else if (filter.type === FiltersType.Range) {
      transformedFilters[`${filter.id}From`] = (filter.value as string[])[0] || 'unknown';
      transformedFilters[`${filter.id}To`] = (filter.value as string[])[1] || 'unknown';
    } else if (Array.isArray(filter.value)) {
      transformedFilters[filter.id] = filter.value.join(',');
    } else {
      transformedFilters[filter.id] = filter.value;
    }
  }

  return transformedFilters;
}
