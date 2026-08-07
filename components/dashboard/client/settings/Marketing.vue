<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useAuthStore } from '~/store/authStore';
import { useClientAccount } from '~/composables/useClientAccount';

const { markSettingsAsRead } = useClientAccount();

const authStore = useAuthStore();

const { getUserDetails } = storeToRefs(authStore);

const userSettings = ref(getUserDetails.value.adminSettings?.marketingPreferences);

const settings = ref(getUserDetails.value);

const newsletterSubscription = ref(userSettings.value?.newsletter.app || false);

watch(newsletterSubscription, async (newValue) => {
  if (newValue === null || !getUserDetails?.value.firebaseId) {
    return;
  }
  const response = await markSettingsAsRead(
    {
      key: 'newsletter',
      ['app']: newValue,
    },
    'app',
    getUserDetails?.value.firebaseId
  );
  if (response.status === 'success' && getUserDetails.value.adminSettings?.marketingPreferences) {
    getUserDetails.value.adminSettings.marketingPreferences.newsletter.app = newValue;
  }
});

watch(settings, (newSettings) => {
  if (newSettings) {
    newsletterSubscription.value = newSettings?.adminSettings?.marketingPreferences?.newsletter.app || false;
  }
});
</script>

<template>
  <section class="flex flex-col self-stretch p-4 md:p-6 bg-white rounded-xl shadow-l">
    <h2 class="text-xl font-semibold leading-7 text-neutral-800 max-md:max-w-full">Marketing Preferences</h2>
    <div class="flex gap-5 justify-between mt-8 max-md:flex-wrap max-md:max-w-full">
      <p class="text-sm leading-6 text-neutral-800">Subscribe to Newsletter</p>
      <div class="flex justify-center items-center my-auto rounded h-5 w-5" role="checkbox" tabindex="0">
        <input
          id="MarketingPreferences"
          v-model="newsletterSubscription"
          type="checkbox"
          class="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
        >
      </div>
    </div>
  </section>
</template>

<style scoped></style>
