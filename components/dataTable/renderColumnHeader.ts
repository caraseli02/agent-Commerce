import type { Column } from '@tanstack/vue-table';
import ColumnHeader from '~/components/dataTable/ColumnHeader.vue';

export function renderColumnHeader<TData, TValue>(column: Column<TData, TValue>, title: string) {
    return h(ColumnHeader, {
        column: column as Column<unknown, unknown>,
        title,
    });
}
