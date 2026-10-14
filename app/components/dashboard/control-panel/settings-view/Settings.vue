<template>
  <div class="bg-white rounded-xl p-4 shadow-xs md:p-6 xl:order-1">
    <div class="mb-6 md:mb-9">
      <h2 class="text-xl leading-[1.4] font-semibold">Customer Settings</h2>
    </div>
    <div class="grid grid-cols-1 gap-6 md:gap-9">
      <div class="border border-border rounded-xl p-4 md:p-6">
        <h3 class="leading-[1.5] font-semibold mb-4">Alerts and Notifications</h3>
        <p class="text-sm leading-[1.71] mb-8">Change to alerts and notification settings.</p>
        <div class="grid grid-cols-1 gap-6">
          <div class="grid grid-cols-[1fr_50px_50px]">
            <div />
            <div class="text-sm leading-[1.71] text-center">Email</div>
            <div class="text-sm leading-[1.71] text-right">App</div>
          </div>
          <div v-for="(item, index) in alertsAndNotifications" :key="index" class="grid grid-cols-[1fr_50px_50px]">
            <div class="text-sm leading-[1.71] text-left">
              {{ item.label }}
            </div>
            <div class="flex justify-center">
              <UiCheckbox
                :checked="item.email"
                :aria-label="`${item.label} (Email)`"
                class="mt-px"
                @update:checked="
                  item.email = $event;
                  markSettingAsRead(item, 'email');
                "
              />
            </div>
            <div class="flex justify-end">
              <UiCheckbox
                :checked="item.app"
                :aria-label="`${item.label} (App)`"
                class="mt-px"
                @update:checked="
                  item.app = $event;
                  markSettingAsRead(item, 'app');
                "
              />
            </div>
          </div>
        </div>
      </div>
      <div class="border border-border rounded-xl p-4 md:p-6">
        <h3 class="leading-[1.5] font-semibold mb-4">Security</h3>
        <p class="text-sm leading-[1.71] mb-8">Send a password reset link.</p>
        <form class="md:grid md:items-end md:grid-cols-[1fr_auto] md:gap-4" @submit.prevent="">
          <FormInput
            v-model="securityEmail"
            label="Account Email"
            placeholder="madalina.dobrovolski@company.com"
            size="lg"
            class="max-md:mb-4"
          />
          <UiButton type="button" class="h-auto flex w-full px-6 py-2.5" @click="resetPassword(securityEmail)">
            <SecurityUserIcon class="w-6 h-6 mr-2" />
            <span class="text-sm leading-[1.71] font-medium"> Send Password Reset </span>
          </UiButton>
        </form>
      </div>
      <div class="border border-border rounded-xl p-4 md:p-6">
        <h3 class="leading-[1.5] font-semibold mb-8">Marketing Preferences</h3>
        <div class="grid grid-cols-1 gap-6">
          <div v-for="(item, index) in marketingPreferences" :key="index" class="flex items-center justify-between">
            <div class="text-sm leading-[1.71] text-left">
              {{ item.label }}
            </div>
            <UiCheckbox
              :checked="item.email"
              :aria-label="`${item.label} (Email)`"
              class="mt-px"
              @update:checked="
                item.email = $event;
                markSettingAsRead(item, 'email');
              "
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import SecurityUserIcon from '@/assets/icons/dashboard/security-user.svg';
import { AlertAndNotificationLabelsEnum, MarketingPreferencesEnum } from '~~/types/auth/account-settings';
import { toast } from '~/components/ui/toast';
import { useControlPanel } from '~/composables/useControlPanel';

const { resetPasswordLink: requestResetPasswordLink, loadCustomerSettings, markSettingsAsRead } = useControlPanel();

const config = useRuntimeConfig();
const isMockMode = computed(() => Boolean(config.public.MOCK_MODE));
const alertsAndNotifications = ref([
  {
    label: AlertAndNotificationLabelsEnum.newProducts,
    key: 'newProducts',
    email: false,
    app: false,
  },
  {
    label: AlertAndNotificationLabelsEnum.hotDeals,
    key: 'hotDeals',
    email: false,
    app: false,
  },
  {
    label: AlertAndNotificationLabelsEnum.outOfStock,
    key: 'outOfStock',
    email: false,
    app: false,
  },
  {
    label: AlertAndNotificationLabelsEnum.priceChange,
    key: 'priceChange',
    email: false,
    app: false,
  },
  {
    label: AlertAndNotificationLabelsEnum.shippingUpdates,
    key: 'shippingUpdates',
    email: false,
    app: false,
  },
]);
const props = defineProps({
  id: {
    type: String,
    required: true,
  },
});
const getCustomerSettings = async () => {
  if (!props.id) {
    return;
  }
  try {
    const settings = await loadCustomerSettings(props.id);

    if (!settings && !isMockMode.value) {
      return;
    }

    if (!settings?.alertsAndNotifications || !settings?.marketingPreferences) {
      return;
    }
    type SettingToggle = { email?: boolean; app?: boolean };
    type SettingsGroup = Record<string, SettingToggle>;

    marketingPreferences.value.forEach((preference) => {
      const marketingSettings = settings.marketingPreferences as unknown as SettingsGroup;
      preference.email = marketingSettings[preference.key]?.email || false;
      preference.app = marketingSettings[preference.key]?.app || false;
    });
    alertsAndNotifications.value.forEach((alert) => {
      const alertSettings = settings.alertsAndNotifications as unknown as SettingsGroup;
      alert.email = alertSettings[alert.key]?.email || false;
      alert.app = alertSettings[alert.key]?.app || false;
    });
  } catch (error) {
    console.error('Failed to load customer settings', error);
    if (!isMockMode.value) {
      return;
    }
  }
};

const securityEmail = ref('');
const marketingPreferences = ref([
  {
    label: MarketingPreferencesEnum.cookiesPolicy,
    key: 'cookiesPolicy',
    email: false,
    app: false,
  },
  {
    label: MarketingPreferencesEnum.newsletter,
    key: 'newsletter',
    email: false,
    app: false,
  },
  {
    label: MarketingPreferencesEnum.eMailMarketing,
    key: 'emailMarketing',
    email: false,
    app: false,
  },
]);
const markSettingAsRead = async (item: { key: string; email?: boolean; app?: boolean }, type: string) => {
  if (!props.id || !type || !item) {
    return;
  }
  try {
    await markSettingsAsRead(item, type, props.id);
  } catch (error) {
    console.error('Failed to mark setting as read', error);
    toast({
      variant: 'destructive',
      title: 'Error',
      description: 'Could not save setting changes',
    });
    if (!isMockMode.value) {
      return;
    }
  }
};
await getCustomerSettings();

const resetPassword = async (email: string) => {
  if (!email) {
    return;
  }
  try {
    const response = (await requestResetPasswordLink(email)) as { status: string };

    if (response.status !== 'success') {
      return;
    }
  } catch (error) {
    console.error('Failed to send password reset link', error);
    toast({
      variant: 'destructive',
      title: 'Error',
      description: 'Could not send password reset link',
    });
    if (!isMockMode.value) {
      return;
    }
  }
};
</script>
