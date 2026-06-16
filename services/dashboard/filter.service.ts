import type { FilterInterface, SortInterface } from '~/model/dashboard/table/filters';

type FilterEmits = (event: 'active-filters', filters: FilterInterface[]) => void;
type SortEmits = (event: 'active-sort', sort: SortInterface) => void;

type FilterInputEvent = Event | string | number | boolean | null | undefined;

export const handleFilterChange = (
  activeFilters: FilterInterface[],
  emits: FilterEmits,
  filter: string,
  event: FilterInputEvent,
  raw: boolean,
  hidden = false,
) => {
  const value = raw ? event : (event as Event & { target?: { value?: string } }).target?.value;

  const existingFilterIndex = activeFilters.findIndex(item => item.filter === filter);

  if (existingFilterIndex < 0) {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    value !== '' && typeof value !== 'undefined' && activeFilters.push({ filter: filter, value: value, hidden: hidden });
  }
  else {
    if (value === '' || typeof value === 'undefined') {
      activeFilters.splice(existingFilterIndex, 1);
    }
    else {
      activeFilters[existingFilterIndex].value = value;
    }
  }

  emits('active-filters', [...activeFilters]);
};

export const handleSortChange = (emits: SortEmits, sortBy: string, sortOrder: number) => {
  emits('active-sort', { sortBy, sortOrder });
};

export const formattedDate = (date: Date) => {
  return new Date(date).toLocaleDateString('en-GB');
};
