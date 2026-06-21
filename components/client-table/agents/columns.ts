import type { ColumnDef } from '@tanstack/vue-table';
import { storeToRefs } from 'pinia';
import RowActions from '~/components/dataTable/RowActions.vue';
import type { ActionOptionsConfiguration } from '~/components/dataTable/RowActions.vue';
import UserInfo from '~/components/dataTable/UserInfo.vue';
import CellDate from '~/components/dataTable/CellDate.vue';
import { renderColumnHeader } from '~/components/dataTable/renderColumnHeader';
import { AccountStatusEnum, type CustomerTableColumns } from '~/types/auth/user-interface';
import { AgentsTableColumnsEnum } from '~/components/client-table/agents/columns.enum';
import StatusWithColor from '~/components/dataTable/StatusWithColor.vue';
import { useAuthStore } from '~/store/authStore';
import { AccountRole } from '~/types';
import { activateUser, deactivateUser, deleteUser } from '~/composables/api/dashboard-admin';

const statusName: Record<AccountStatusEnum, string> = {
  [AccountStatusEnum.Inactive]: 'Inactive',
  [AccountStatusEnum.Active]: 'Active',
  [AccountStatusEnum.Pending]: 'Pending',
};
const statusColors = {
  Active: 'bg-green-800',
  Disabled: 'bg-pink-500',
  Pending: 'bg-yellow-500',
};

const authStore = useAuthStore();
const { getUserDetails } = storeToRefs(authStore);

export const columns: ColumnDef<CustomerTableColumns>[] = [
  {
    accessorKey: AgentsTableColumnsEnum.NAME,
    header: ({ column }) => renderColumnHeader(column, 'Name'),
    cell: ({ row }) =>
      h(UserInfo, {
        name: `${row.original.contactDetails?.firstName} ${row.original.contactDetails?.lastName}`,
        email: row.original.contactDetails?.email,
      }),
  },
  {
    accessorKey: AgentsTableColumnsEnum.CREATED_AT,
    header: ({ column }) => renderColumnHeader(column, 'Date'),
    cell: ({ row }) => h(CellDate, { inputDateString: row.getValue(AgentsTableColumnsEnum.CREATED_AT) as string }),
  },
  {
    accessorKey: AgentsTableColumnsEnum.STATUS,
    header: ({ column }) => renderColumnHeader(column, 'Status'),
    cell: ({ row }) => {
      const val = row.getValue(AgentsTableColumnsEnum.STATUS) as AccountStatusEnum;
      return h(StatusWithColor, {
        status: statusName[val],
        options: statusColors,
      });
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: AgentsTableColumnsEnum.ORDERS_COUNT,
    header: ({ column }) => renderColumnHeader(column, 'Orders'),
    cell: ({ row }) => h('div', { class: 'inline overflow-hidden' }, (row.original.ordersCount ?? 0) as number),
  },
  {
    accessorKey: AgentsTableColumnsEnum.TOTAL,
    header: ({ column }) => renderColumnHeader(column, 'Total'),
    cell: ({ row }) =>
      h('div', { class: 'inline overflow-hidden' }, formatNumberWithCommas(row.getValue(AgentsTableColumnsEnum.TOTAL), 'Lei')),
  },
  {
    id: 'actions',
    header: ({ column }) => renderColumnHeader(column, 'Actions'),
    cell: ({ row }) =>
      h(RowActions, {
        row: row,
        discount: row.original?.adminSettings?.discount?.value,
        lock: row.original.status === AccountStatusEnum.Inactive,
        options: [
          {
            label: 'Profile',
            enable: getUserDetails.value?.role === AccountRole.Admin,
            navigateToRoute: `/dashboard/customers/${row.original.firebaseId}`,
          },
          {
            label: 'Delete',
            enable: getUserDetails.value?.role === AccountRole.Admin,
            actionFn: deleteUser,
          },
          {
            label: 'Unlock account',
            enable: row.original.status === AccountStatusEnum.Inactive,
            actionFn: activateUser,
          },
          {
            label: 'Lock account',
            enable: row.original.status === AccountStatusEnum.Active,
            actionFn: deactivateUser,
          },
          {
            label: 'Activate account',
            enable: row.original.status === AccountStatusEnum.Pending,
            actionFn: activateUser,
          },
        ] as ActionOptionsConfiguration[],
      }),
  },
];
