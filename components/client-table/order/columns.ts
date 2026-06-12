import type { ColumnDef } from '@tanstack/vue-table';
import { storeToRefs } from 'pinia';
import { statusColors } from './options';
import { AccountRole } from '~/types';
import type { OrderTableColumns } from '~/types';
import RowActions from '~/components/dataTable/RowActions.vue';
import type { ActionOptionsConfiguration } from '~/components/dataTable/RowActions.vue';
import IdCell from '~/components/dataTable/IdCell.vue';
import OrderType from '~/components/dataTable/OrderType.vue';
import StatusWithColor from '~/components/dataTable/StatusWithColor.vue';
import UserInfo from '~/components/dataTable/UserInfo.vue';
import CellDate from '~/components/dataTable/CellDate.vue';
import { renderColumnHeader } from '~/components/dataTable/renderColumnHeader';
import { OrderTableColumnsEnum } from '~/components/client-table/order/columns.enum';
import DocumentService from '~/services/dashboard/document.service';
import { useAuthStore } from '~/store/authStore';

const authStore = useAuthStore();
const { getUserDetails } = storeToRefs(authStore);

export const columns: ColumnDef<OrderTableColumns>[] = [
    {
        accessorKey: OrderTableColumnsEnum.SHORT_ID,
        header: ({ column }) => renderColumnHeader(column, 'Order'),
        cell: ({ row }) =>
            h(IdCell, {
                IdCell: row.getValue(OrderTableColumnsEnum.SHORT_ID) as string,
                orderId: row.original._id,
            }),
    },
    {
        accessorKey: OrderTableColumnsEnum.TYPE,
        header: ({ column }) => renderColumnHeader(column, 'Type'),
        cell: ({ row }) => h(OrderType, { type: row.getValue('type') as OrderTableColumns['type'] }),
    },
    {
        accessorKey: OrderTableColumnsEnum.USER_NAME,
        header: ({ column }) => renderColumnHeader(column, 'Name'),
        cell: ({ row }) =>
            h(UserInfo, {
                name: `${row.original.user.contactDetails.firstName} ${row.original.user.contactDetails.lastName}`,
                email: row.original.user.contactDetails.email ?? 'N/A',
            }),
    },
    {
        accessorKey: OrderTableColumnsEnum.CREATED_AT,
        header: ({ column }) => renderColumnHeader(column, 'Date'),
        cell: ({ row }) => h(CellDate, { inputDateString: row.getValue(OrderTableColumnsEnum.CREATED_AT) as string }),
    },
    {
        accessorKey: OrderTableColumnsEnum.STATUS,
        header: ({ column }) => renderColumnHeader(column, 'Status'),
        cell: ({ row }) =>
            h(StatusWithColor, {
                status: row.getValue(OrderTableColumnsEnum.STATUS) as string,
                options: statusColors,
            }),
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id));
        },
    },
    {
        accessorKey: OrderTableColumnsEnum.TOTAL,
        header: ({ column }) => renderColumnHeader(column, 'Total'),
        cell: ({ row }) =>
            h('div', { class: 'inline overflow-hidden' }, formatNumberWithCommas(row.getValue(OrderTableColumnsEnum.TOTAL), ' lei')),
    },
    {
        id: 'actions',
        header: ({ column }) => renderColumnHeader(column, 'Actions'),
        cell: ({ row }) =>
            h(RowActions, {
                row: row,
                service: DocumentService,
                options: [
                    {
                        label: 'View order',
                        enable: true,
                        navigateToRoute: `/order-summary/${row.original._id}`,
                    },
                    {
                        label: 'Download invoice',
                        enable: getUserDetails.value?.role === AccountRole.Client && !!row.original?.paymentDetails?.invoiceId,
                        actionFn: 'downloadDocument',
                        actionParameter: row.original.paymentDetails?.invoiceId,
                    },
                ] as ActionOptionsConfiguration[],
            }),
    },
];
