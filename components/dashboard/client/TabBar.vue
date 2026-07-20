<template>
  <SharedScrollableRegion label="Dashboard sections" test-id="client-dashboard-tabs">
    <div class="relative flex items-center gap-4 bg-white rounded-xl px-3 shadow-xs md:gap-8 md:px-6">
      <button
        v-for="(filter, index) in computedOrderFilters"
        :key="index"
        class="ordersFilter flex items-center gap-3 relative z-10 text-sm font-medium leading-[1.71] py-5 flex-shrink-0 whitespace-nowrap transition-colors duration-300 md:py-8"
        :class="[filter.label === activeOrderFilter?.label ? 'text-blue-500' : 'hover:text-blue-500']"
        @click="activeOrderFilter = filter"
      >
        <span v-if="filter.label">
          {{ filter.label }}
        </span>
        <span
          v-if="filter.total_items"
          class="px-2 rounded-[25px] text-xs leading-[1.66] font-medium min-w-[32px] transition-colors duration-300 text-center"
          :class="filter.label === activeOrderFilter?.label ? 'text-white bg-blue-500' : 'text-slate-500 bg-gray-100'"
        >
          {{ filter.total_items }}
        </span>
        <template v-if="filter.icon === 'dashboard'">
          <DashboardIcon />
        </template>
      </button>
      <div
        class="absolute bottom-0 bg-blue-500 h-1 rounded-t-lg transition-all duration-300"
        :style="{
          width: filterHighlightWidth + 'px',
          left: filterHightlightLeft + 'px',
        }"
      />
    </div>
  </SharedScrollableRegion>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import type { OrderInterface } from '~~/types';
import DashboardIcon from '@/assets/icons/dashboard/dashboard-grid.svg';
import { UserPermissionsEnum } from '~/types/auth/permissions';
import { useAuthStore } from '@/store/authStore';
import { getMetadata } from '~/composables/api/customer-dashboard';

type ApiKeysMap = {
  [key: string]: string;
};

const apiKeysMap: ApiKeysMap = {
  orders: 'ordersCount',
  favorites: 'favoritesCount',
  messages: 'messagesCount',
  organization: 'organizationCount',
  agents: 'agentsCount',
  transaction_history: 'transactionsCount',
  activity_logs: 'auditLogsCount',
};

interface TabFilter {
  label?: string;
  value: string;
  key?: unknown;
  total_items?: number | null; // Adjusted to accept null
  items?: OrderInterface[];
  icon?: string;
  requiredPermission?: UserPermissionsEnum;
}

type ApiResponse = {
  status: 'success' | 'error';
  data: Record<string, number | null>;
};

const authStore = useAuthStore();
const { loggedInUser } = storeToRefs(authStore);
const orderFilters = ref<TabFilter[]>([
  {
    icon: 'dashboard',
    value: 'home',
  },
  {
    label: 'Orders',
    value: 'orders',
    requiredPermission: UserPermissionsEnum.OrdersRead,
  },
  // {
  //     label: 'Favorites',
  //     value: 'favorites',
  //     requiredPermission: 'read:favourite'
  // },
  // {
  //     label: 'Messages',
  //     value: 'messages',
  //     requiredPermission: 'read:message'
  // },
  {
    label: 'Organization',
    value: 'organization',
    requiredPermission: UserPermissionsEnum.OrganizationDataRead,
  },
  {
    label: 'Agents',
    value: 'agents',
    requiredPermission: UserPermissionsEnum.AgentRead,
  },
  {
    label: 'Transaction History',
    value: 'transaction_history',
    requiredPermission: UserPermissionsEnum.PaymentDetailsRead,
  },
  {
    label: 'Activity Logs',
    value: 'activity_logs',
    requiredPermission: UserPermissionsEnum.AuditRead,
  },
  {
    label: 'Settings',
    value: 'settings',
  },
]);

const computedOrderFilters = computed(() => {
  return orderFilters.value.filter(
    (filter) => !filter.requiredPermission || loggedInUser.value?.permissions.includes(filter.requiredPermission)
  );
});

const activeOrderFilter = defineModel<TabFilter>();

const filterHighlightWidth = ref(0);
const filterHightlightLeft = ref(0);

// Emitter.on('customer-dashboard-nav-tab', async (tab: { label: string; value: string }) => {
//     if (tab) {
//         activeOrderFilter.value = tab;
//     }
// });

// const setActiveFilterHighlight = () => {
//     const activeFilter = activeOrderFilter.value;
//     const index = computedOrderFilters.value.findIndex((filter) => filter.value === activeFilter?.value);

//     nextTick(() => {
//         if (index !== -1) {
//         const filterElement = document.querySelectorAll('.ordersFilter')[index] as HTMLElement;

//         if (filterElement) {
//             filterHighlightWidth.value = filterElement.clientWidth;
//             filterHightlightLeft.value = filterElement.offsetLeft;
//         }
//     }
//     });

// };

// watch(
//     activeOrderFilter,
//     (newVlad) => {
//         console.log(newVlad);

//         setActiveFilterHighlight();
//     },
//     { deep: true, immediate: true }
// );

const updateOrderFiltersWithCounts = async () => {
  try {
    const response = (await getMetadata()) as ApiResponse;
    const counts = response.data;

    orderFilters.value.forEach((filter) => {
      const apiResponseKey: string = apiKeysMap[filter.value] || '';
      const count = counts[apiResponseKey];
      if (apiResponseKey && count !== undefined) {
        filter.total_items = count;
      }
    });
  } catch (error) {
    console.error('Failed to fetch counts from API:', error);
  }
};

const route = useRoute();
const checkForActiveTab = () => {
  const tabLabel = route.query.tab;
  const tab = orderFilters.value.find((filter) => filter.value === tabLabel);
  if (tab) {
    activeOrderFilter.value = tab;
    // setTimeout(() => {
    //     setActiveFilterHighlight()
    // }, 2000);
  }
};

watch(() => route.query.tab, checkForActiveTab, { immediate: true });

onMounted(async () => {
  updateOrderFiltersWithCounts();
  // setActiveFilterHighlight();
  checkForActiveTab();
});

onBeforeRouteLeave(() => {
  activeOrderFilter.value = { value: 'home', icon: 'Dashboard' };
});
</script>

<style scoped></style>
