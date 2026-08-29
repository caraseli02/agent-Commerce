import type { Row } from '@tanstack/vue-table';
import { useVirtualizer } from '@tanstack/vue-virtual';
import type { Ref } from 'vue';

const DEFAULT_ROW_HEIGHT = 53;
const DEFAULT_OVERSCAN = 5;

export function useVirtualTableRows<TData>(rows: Ref<Row<TData>[]>, scrollContainerRef: { value?: unknown }) {
  const rowVirtualizer = useVirtualizer(
    computed(() => ({
      count: rows.value.length,
      getScrollElement: () => (scrollContainerRef.value as Element | null | undefined) ?? null,
      estimateSize: () => DEFAULT_ROW_HEIGHT,
      overscan: DEFAULT_OVERSCAN,
    })),
  );

  const virtualRows = computed(() => rowVirtualizer.value.getVirtualItems());

  const paddingTop = computed(() => {
    const items = virtualRows.value;
    return items[0]?.start ?? 0;
  });

  const paddingBottom = computed(() => {
    const items = virtualRows.value;
    if (items.length === 0) {
      return 0;
    }

    return rowVirtualizer.value.getTotalSize() - (items[items.length - 1]?.end ?? 0);
  });

  return {
    virtualRows,
    paddingTop,
    paddingBottom,
    rowVirtualizer,
  };
}
