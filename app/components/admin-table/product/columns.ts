import type { ColumnDef } from '@tanstack/vue-table';
import { renderColumnHeader } from '~/components/dataTable/renderColumnHeader';
import StatusWithColor from '~/components/dataTable/StatusWithColor.vue';
import type { ProductInterface } from '~~/types/product';
import { formatLei } from '~/utils/numbers';

const statusColors = {
  Active: 'bg-green-800',
  Inactive: 'bg-gray-500',
};

export const columns: ColumnDef<ProductInterface>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => renderColumnHeader(column, 'Product'),
    cell: ({ row }) =>
      h('div', { class: 'min-w-[220px]' }, [
        h('div', { class: 'text-sm font-medium text-foreground' }, row.original.name),
        h('div', { class: 'text-xs text-muted-foreground' }, row.original.code || row.original.manufacturerCode || ''),
      ]),
  },
  {
    accessorKey: 'manufacturer',
    header: ({ column }) => renderColumnHeader(column, 'Manufacturer'),
    cell: ({ row }) => h('div', { class: 'min-w-[120px]' }, row.original.manufacturer || 'N/A'),
  },
  {
    accessorKey: 'category',
    header: ({ column }) => renderColumnHeader(column, 'Category'),
    cell: ({ row }) => h('div', { class: 'min-w-[120px]' }, row.original.category || 'N/A'),
  },
  {
    accessorKey: 'stock',
    header: ({ column }) => renderColumnHeader(column, 'Stock'),
    cell: ({ row }) => h('div', {}, `${row.original.stock ?? 0} ${row.original.measure || ''}`.trim()),
  },
  {
    id: 'price',
    header: ({ column }) => renderColumnHeader(column, 'Price'),
    cell: ({ row }) => {
      const current = row.original.priceHistory?.find((entry) => entry.active) ?? row.original.priceHistory?.[0];
      return h('div', { class: 'inline overflow-hidden' }, current ? formatLei(current.price) : 'N/A');
    },
    enableSorting: false,
  },
  {
    accessorKey: 'active',
    header: ({ column }) => renderColumnHeader(column, 'Status'),
    cell: ({ row }) => h(StatusWithColor, { status: row.original.active === false ? 'Inactive' : 'Active', options: statusColors }),
    enableSorting: false,
  },
];
