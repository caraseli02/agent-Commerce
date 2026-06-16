<template>
  <div class="w-[1488px] max-w-full p-4 mx-auto transition-all duration-300 md:py-6 2xl:px-6">
    <DashboardBreadcrumbs
      title="Control Panel"
      :customer="customerSlug"
      :panel-view="activeView"
      :customer-name="customerName"
      :account-type="accountType"
    >
      <div class="max-lg:hidden max-w-max">
        <div class="grid grid-cols-[repeat(2,auto)] gap-5 text-right">
          <div class="flex flex-col">
            <div class="text-sm leading-relaxed font-medium text-slate-500 mb-3">
              Credit Limit
            </div>
            <div
              v-if="!isLoading"
              class="font-semibold leading-tight"
            >
              <div
                v-if="emptyData || error || !credit"
                class="text-sm font-medium leading-tight text-gray-500"
              >
                No data available
              </div>
              <div v-else>
                {{ credit.limit }} Lei
              </div>
            </div>
            <SkeletonLoader
              v-else
              class="w-[104px] h-5"
            />
          </div>
          <div
            class="relative pl-5 before:absolute before:top-1/2 before:-translate-y-1/2 before:left-0 before:w-px before:h-[85%] before:bg-border before:rounded-[50px]"
          >
            <div class="text-sm leading-relaxed font-medium text-slate-500 mb-3">
              Available Credit
            </div>
            <div
              v-if="!isLoading"
              class="font-semibold leading-tight text-blue-500"
            >
              <div
                v-if="emptyData || error || !credit"
                class="text-sm font-medium leading-tight text-gray-500"
              >
                No data available
              </div>
              <div v-else>
                {{ credit.available }} Lei
              </div>
            </div>
            <SkeletonLoader
              v-else
              class="w-[104px] h-5"
            />
          </div>
        </div>
      </div>
    </DashboardBreadcrumbs>
    <div class="grid grid-cols-1 gap-4 md:gap-6">
      <div class="bg-white rounded-xl px-4 py-3 shadow-xs grid grid-cols-2 md:py-2 lg:hidden">
        <div class="pr-4 md:flex md:items-center md:py-2">
          <SkeletonLoader
            v-if="isLoading"
            class="w-full h-[45px] md:h-5"
          />
          <template v-else>
            <div
              class="flex items-center justify-between text-xs leading-relaxed font-medium text-slate-500 mb-2 md:m-0 md:text-sm md:mr-2"
            >
              <div>Credit Limit</div>
              <WarningIcon
                v-if="error"
                class="w-5 h-5 md:hidden"
              />
            </div>
            <div
              v-if="emptyData || error || !credit"
              class="text-sm font-medium leading-tight text-gray-500"
            >
              No data available
            </div>
            <div
              v-else
              class="text-sm font-semibold leading-tight"
            >
              {{ credit.limit }} Lei
            </div>
            <WarningIcon
              v-if="error"
              class="w-5 h-5 ml-auto max-md:hidden"
            />
          </template>
        </div>
        <div
          class="relative pl-4 before:absolute before:top-0 before:left-0 before:w-px before:h-full before:bg-gray-100 before:rounded-[50px] md:flex md:items-center"
        >
          <SkeletonLoader
            v-if="isLoading"
            class="w-full h-[45px] md:h-5"
          />
          <template v-else>
            <div
              class="flex items-center justify-between text-xs leading-relaxed font-medium text-slate-500 mb-2 md:m-0 md:text-sm md:mr-2"
            >
              <div>Available Credit</div>
              <WarningIcon
                v-if="error"
                class="w-5 h-5 md:hidden"
              />
            </div>
            <div
              v-if="emptyData || error || !credit"
              class="text-sm font-medium leading-tight text-gray-500"
            >
              No data available
            </div>
            <div
              v-else
              class="text-sm font-semibold leading-tight text-blue-500"
            >
              {{ credit.available }} Lei
            </div>
            <WarningIcon
              v-if="error"
              class="w-5 h-5 ml-auto max-md:hidden"
            />
          </template>
        </div>
      </div>
      <div class="relative flex items-center gap-1 bg-white rounded-xl p-2 shadow-xs overflow-x-auto hide-scrollbar">
        <NuxtLink
          v-for="(view, index) in panelViews.filter((item) => item.allowTo.includes(accountType))"
          :key="index"
          :to="`/dashboard/customers/${route.params.slug}/control-panel/${view.path}`"
          class="panelView relative z-10 text-sm font-medium leading-[1.42857] px-6 py-3 rounded-lg flex-shrink-0 transition-colors duration-300"
          :class="[view.path === activeView ? 'text-white ' : 'hover:text-blue-500']"
        >
          {{ view.name }}
        </NuxtLink>
        <div
          class="absolute top-1/2 -translate-y-1/2 bg-blue-500 h-11 rounded-lg transition-all duration-300"
          :style="{
            width: viewHighlightWidth + 'px',
            left: viewHightlightLeft + 'px',
          }"
        />
      </div>
      <NuxtPage />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { UserInterface } from '~/types/auth/user-interface';
import { useNuxtApp } from '#app';
import { ControlPanelLabels, ControlPanelTabsEnum } from '~/types/dashboard/control-panel';
import { AccountType } from '~/types';
import type { CustomerCreditInterface } from '~/types/auth/account-settings';
import { customerCreditHelper } from '~/helpers/customer-credit.helper';

const route = useRoute();
const router = useRouter();
const customerSlug = computed(() => String(route.params.slug ?? ''));
const customerName = ref('');
const config = useRuntimeConfig();
const isMockMode = computed(() => Boolean(config.public.MOCK_MODE));

useHead({
  title: 'Dashboard Control Panel',
});

const viewHighlightWidth = ref(0);
const viewHightlightLeft = ref(0);
const { $api } = useNuxtApp();
const activeView = computed(() => String(route.params.view ?? ''));

const error = ref(false);
const emptyData = ref(false);
const isLoading = ref(false);
const credit = ref({} as { limit: string; spent: string; available: string });
const getCustomerCredit = async () => {
  if (!customerSlug.value) {
    return;
  }
  isLoading.value = true;
  try {
    const response = (await $api.controlPanel.fetchCustomerCredit(customerSlug.value)) as {
      status: string;
      data: CustomerCreditInterface;
    };

    if (response.status !== 'success' || !response.data) {
      isLoading.value = false;
      error.value = true;
      emptyData.value = true;
      return;
    }

    isLoading.value = false;
    error.value = false;
    emptyData.value = false;
    credit.value = customerCreditHelper(response.data);
  }
  catch {
    isLoading.value = false;

    if (isMockMode.value) {
      error.value = false;
      emptyData.value = false;
      credit.value = customerCreditHelper({
        limit: 12000,
        spent: 3200,
        available: 8800,
        dueDate: new Date().toISOString(),
        tillDue: '30 days',
        term: 30,
        freeze: false,
        active: true,
      });
      return;
    }

    error.value = true;
    emptyData.value = true;
  }
};
await getCustomerCredit();

const accountType = ref(AccountType.Personal);
const panelViews = ControlPanelLabels;

const setActivePanelHighlight = () => {
  const view = activeView.value;
  const index = panelViews.filter(item => item.allowTo.includes(accountType.value)).findIndex(panelView => panelView.path === view);

  if (index !== -1) {
    const viewElement = document.querySelectorAll('.panelView')[index] as HTMLElement;

    if (viewElement) {
      viewHighlightWidth.value = viewElement.clientWidth;
      viewHightlightLeft.value = viewElement.offsetLeft;
    }
  }
};

watch(activeView, () => {
  setActivePanelHighlight();
});

const fetchInformation = async () => {
  if (!customerSlug.value) {
    return;
  }
  try {
    const response = (await $api.customerProfile.fetchCustomerInformation(customerSlug.value)) as unknown as {
      status: string;
      data: UserInterface;
    };

    if (response.status !== 'success') {
      return;
    }
    accountType.value = response.data.accountType ?? AccountType.Personal;
    customerName.value = `${response.data.contactDetails?.firstName ?? ''} ${response.data.contactDetails?.lastName ?? ''}`.trim();
  }
  catch {
    if (isMockMode.value) {
      accountType.value = AccountType.Personal;
      customerName.value = 'Demo Customer';
    }
  }
};

await fetchInformation();

onMounted(() => {
  if (!route.params.view) {
    const fixedPath = route.path.replace(/\/+$/, '');
    const newPath = `${fixedPath}/${accountType.value == 0 ? ControlPanelTabsEnum.Account : ControlPanelTabsEnum.Organization}`;

    router.replace({
      path: newPath,
    });
  }
  setActivePanelHighlight();
});

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard',
});
</script>
