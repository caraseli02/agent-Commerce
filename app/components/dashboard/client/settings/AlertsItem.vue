<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useAuthStore } from '~/store/authStore';
import { useClientAccount } from '~/composables/useClientAccount';

const { markSettingsAsRead } = useClientAccount();

const authStore = useAuthStore();
const { getUserDetails } = storeToRefs(authStore);

const props = defineProps<{
  title: string;
  alertKey: string;
}>();

const emailModel = defineModel<boolean>('email');
const appModel = defineModel<boolean>('app');

async function handleChange(title: string, type: string, value: boolean) {
  if (!type || !title || !props.alertKey || !getUserDetails?.value.firebaseId) {
    return;
  }

  await markSettingsAsRead(
    {
      key: props.alertKey,
      [type]: value,
    },
    type,
    getUserDetails?.value.firebaseId,
  );
}
</script>

<template>
  <div class="flex gap-5 justify-between px-0.5 mt-6 max-md:flex-wrap max-md:max-w-full">
    <span>{{ title }}</span>
    <div class="flex justify-between w-28">
      <UiCheckbox
        :id="`${title}-email`"
        :checked="emailModel"
        :aria-label="`${title} (Email)`"
        class="w-5 h-5"
        @update:checked="
          emailModel = $event;
          handleChange(props.title, 'email', $event);
        "
      />
      <UiCheckbox
        :id="`${title}-app`"
        :checked="appModel"
        :aria-label="`${title} (App)`"
        class="w-5 h-5"
        @update:checked="
          appModel = $event;
          handleChange(props.title, 'app', $event);
        "
      />
    </div>
  </div>
</template>

<style scoped></style>
