import type { ColumnDef } from '@tanstack/vue-table';
import RowActions from '~/components/dataTable/RowActions.vue';
import type { ActionOptionsConfiguration } from '~/components/dataTable/RowActions.vue';
import IdCell from '~/components/dataTable/IdCell.vue';
import EnumToText from '~/components/dataTable/EnumToText.vue';
import CellDate from '~/components/dataTable/CellDate.vue';
import { renderColumnHeader } from '~/components/dataTable/renderColumnHeader';
import { paymentStatusOptions, paymentTypeOptions } from '~/components/client-table/transaction/options';
import { TransactionTableColumnsEnum } from '~/components/client-table/transaction/columns.enum';
import type { TransactionInterface } from '~~/types/dashboard/transaction';
import { downloadDocument } from '~/composables/api/documents';
import { formatNumberWithCommas } from '~/utils/numbers';
// import { useAuthStore } from '~/store/authStore';
// import { storeToRefs } from 'pinia';

// const authStore = useAuthStore();
// const { getUserDetails } = storeToRefs(authStore);

export const columns: ColumnDef<TransactionInterface>[] = [
  // Update here
  {
    accessorKey: TransactionTableColumnsEnum.TRANSACTION_ID, // Update accessor keys
    header: ({ column }) => renderColumnHeader(column, 'Transaction ID'), // Adapt titles if needed
    cell: ({ row }) =>
      h(IdCell, {
        IdCell: row.getValue(TransactionTableColumnsEnum.TRANSACTION_ID) as string,
        orderId: row.original.orderId,
      }),
  },
  {
    accessorKey: TransactionTableColumnsEnum.ORDER_ID,
    header: ({ column }) => renderColumnHeader(column, 'Order ID'),
    cell: ({ row }) =>
      h(IdCell, {
        IdCell: row.getValue(TransactionTableColumnsEnum.ORDER_ID) as string,
        orderId: row.original.orderId,
      }),
  },
  {
    accessorKey: TransactionTableColumnsEnum.INVOICE_ID,
    header: ({ column }) => renderColumnHeader(column, 'Invoice ID'),
    cell: ({ row }) =>
      h(IdCell, {
        IdCell: row.getValue(TransactionTableColumnsEnum.INVOICE_ID) as string,
        invoiceId: row.original.invoiceId ?? '#',
      }),
  },

  {
    accessorKey: TransactionTableColumnsEnum.TYPE,
    header: ({ column }) => renderColumnHeader(column, 'Type'), // Change the title if needed
    cell: ({ row }) =>
      h(EnumToText, {
        val: row.getValue('type') as number,
        options: paymentTypeOptions as { label: string; value: number; color: string }[],
      }),
  },
  {
    accessorKey: TransactionTableColumnsEnum.CREATED_AT,
    header: ({ column }) => renderColumnHeader(column, 'Date'),
    cell: ({ row }) => h(CellDate, { inputDateString: row.getValue(TransactionTableColumnsEnum.CREATED_AT) as string }),
  },
  {
    accessorKey: TransactionTableColumnsEnum.STATUS,
    header: ({ column }) => renderColumnHeader(column, 'Status'),
    cell: ({ row }) =>
      h(EnumToText, {
        val: row.getValue(TransactionTableColumnsEnum.STATUS) as number,
        options: paymentStatusOptions as { label: string; value: number; color: string }[],
      }),
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: TransactionTableColumnsEnum.TOTAL,
    header: ({ column }) => renderColumnHeader(column, 'Total'),
    cell: ({ row }) =>
      h('div', { class: 'inline overflow-hidden' }, `lei ${formatNumberWithCommas(row.getValue(TransactionTableColumnsEnum.TOTAL))}`),
  },
  {
    id: TransactionTableColumnsEnum.ACTIONS, // Update the id
    header: ({ column }) => renderColumnHeader(column, 'Actions'),
    cell: ({ row }) =>
      h(RowActions, {
        row: row,
        options: [
          {
            label: 'Download invoice',
            // enable: getUserDetails.value.role === AccountRole.Client && row.original?.invoiceId,
            actionFn: downloadDocument,
            actionParameter: row.original.invoiceId,
          },
        ] as unknown as ActionOptionsConfiguration[],
      }),
  },
];
