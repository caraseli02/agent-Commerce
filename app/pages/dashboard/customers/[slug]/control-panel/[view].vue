<template>
  <div class="bg-card rounded-xl px-4 py-6 shadow-xs md:px-6">
    <DashboardControlPanelOrganizationView
      v-if="activeView === ControlPanelTabsEnum.Organization && customerDetails.accountType !== AccountType.Personal"
      :id="customerSlug"
      :account="customerDetails"
    />
    <DashboardControlPanelAccountView
      v-else-if="activeView === ControlPanelTabsEnum.Account && customerDetails.accountType === AccountType.Personal"
      :id="customerSlug"
      :account="customerDetails"
    />
    <DashboardControlPanelShippingView
      v-else-if="activeView === ControlPanelTabsEnum.Shipping"
      :id="customerSlug"
      :account-type="customerDetails.accountType ?? AccountType.Personal"
    />
    <ClientTableTransaction v-else-if="activeView === ControlPanelTabsEnum.TransactionHistory" :user-id="customerSlug" />
    <DashboardControlPanelBillingView
      v-else-if="activeView === ControlPanelTabsEnum.Billing"
      :id="customerSlug"
      :account-type="customerDetails.accountType ?? AccountType.Personal"
    />
  </div>
</template>

<script setup lang="ts">
import { ControlPanelTabsEnum } from '~~/types/dashboard/control-panel';
import type { ControlPanelTabs } from '~~/types/dashboard/control-panel';
import type { UserInterface } from '~~/types/auth/user-interface';
import { AccountType } from '~~/types';
import { useControlPanel } from '~/composables/useControlPanel';

const { fetchCustomerInformation } = useControlPanel();

const route = useRoute();
const router = useRouter();
const customerSlug = computed(() => String(route.params.slug ?? ''));
const config = useRuntimeConfig();
const isMockMode = computed(() => Boolean(config.public.MOCK_MODE));

const activeView = computed(() => String(route.params.view ?? '') as ControlPanelTabs);

const customerDetails = ref({} as UserInterface);

const defaultControlPanelView = (accountType: AccountType) =>
  accountType === AccountType.Personal ? ControlPanelTabsEnum.Account : ControlPanelTabsEnum.Organization;

onMounted(() => {
  if (route.params.view === ControlPanelTabsEnum.Settings) {
    router.replace({
      path: `/dashboard/customers/${route.params.slug}/control-panel/${defaultControlPanelView(
        customerDetails.value.accountType ?? AccountType.Personal,
      )}`,
    });
    return;
  }

  if (!Object.values(ControlPanelTabsEnum).includes(route.params.view as ControlPanelTabsEnum)) {
    router.replace({
      path: `/dashboard/customers/${route.params.slug}/control-panel/${defaultControlPanelView(
        customerDetails.value.accountType ?? AccountType.Personal,
      )}`,
    });
  } else {
    if (customerDetails.value.accountType === AccountType.Personal && route.params.view === ControlPanelTabsEnum.Organization) {
      router.replace({
        path: `/dashboard/customers/${route.params.slug}/control-panel/${ControlPanelTabsEnum.Account}`,
      });
    } else if (customerDetails.value.accountType !== AccountType.Personal && route.params.view === ControlPanelTabsEnum.Account) {
      router.replace({
        path: `/dashboard/customers/${route.params.slug}/control-panel/${ControlPanelTabsEnum.Organization}`,
      });
    }
  }
});

const fetchInformation = async () => {
  if (!customerSlug.value) {
    return;
  }
  try {
    const response = await fetchCustomerInformation(customerSlug.value);

    if (response.status !== 'success') {
      return;
    }

    customerDetails.value = response.data;
  } catch (error) {
    console.error('Failed to load customer profile information', error);
    if (isMockMode.value) {
      customerDetails.value = {
        _id: customerSlug.value,
        firebaseId: customerSlug.value,
        accountType: AccountType.Personal,
      } as UserInterface;
    }
  }
};

await fetchInformation();

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard',
});
</script>
