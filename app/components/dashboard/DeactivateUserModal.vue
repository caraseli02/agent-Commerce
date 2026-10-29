<template>
  <UiDialog :open="isOpen" @update:open="onOpenChange">
    <UiDialogContent class="w-[358px] max-w-[calc(100vw-32px)] gap-0 border-none p-4 shadow-xs md:p-6 [&>button.absolute]:hidden">
      <UiDialogClose as-child>
        <UiButton
          variant="ghost"
          size="icon"
          class="mb-4 ml-auto flex h-11 w-11 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors duration-200 hover:text-primary"
          aria-label="Close"
        >
          <XIcon class="h-6 w-6" />
        </UiButton>
      </UiDialogClose>
      <UiDialogTitle class="mb-9 text-center text-sm font-normal leading-[2.29]">
        {{ user.active ? 'Lock account:' : 'Unlock account:' }}
      </UiDialogTitle>
      <div class="mb-[78px] flex items-center">
        <div
          class="relative mr-4 flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-full"
          :class="[!user.avatar ? 'bg-muted' : '']"
        >
          <NuxtImg v-if="user.avatar" :src="user.avatar" :alt="user.name" class="h-full w-full rounded-full object-cover" loading="lazy" />
          <UserIcon v-else class="h-7 w-7 text-muted-foreground" />
        </div>
        <div>
          <div class="mb-1 flex items-center gap-3">
            <div class="truncate text-sm font-semibold leading-[1.43] transition-colors duration-200 group-hover/link:text-primary">
              {{ user.name }}
            </div>
            <div class="flex cursor-default items-center gap-3">
              <img v-if="country && country.label" :src="country.icon" :alt="country.label" class="mr-2 w-8 rounded" loading="lazy" />
              <div class="rounded-[25px] bg-primary px-2 text-xs font-semibold leading-[1.67] text-white">10%</div>
            </div>
          </div>
          <div class="truncate text-xs leading-[1.33] text-muted-foreground">
            {{ user.email }}
          </div>
        </div>
      </div>
      <div class="grid grid-cols-[auto_1fr] gap-4">
        <UiButton variant="secondary" class="px-8 py-2 text-sm font-medium leading-[1.71] text-muted-foreground" @click="closeModal">
          Cancel
        </UiButton>
        <UiButton
          v-if="user.active"
          variant="destructive"
          class="justify-center px-5 py-2 text-sm font-medium leading-[1.71]"
          @click="deactivateAccountAsAdmin(user.firebaseId)"
        >
          Lock Account
        </UiButton>
        <UiButton
          v-else
          variant="success"
          class="justify-center px-5 py-2 text-sm font-medium leading-[1.71]"
          @click="activateAccountAsAdmin(user.firebaseId)"
        >
          Unlock Account
        </UiButton>
      </div>
    </UiDialogContent>
  </UiDialog>
</template>

<script setup lang="ts">
import type { DashboardCustomerTableItem } from '~~/types';
import type { CountryInterface } from '~~/types/dashboard/control-panel';
import XIcon from '@/assets/icons/dashboard/x.svg';
import UserIcon from '@/assets/icons/dashboard/user.svg';
import { activateUser, deactivateUser } from '~/composables/api/dashboard-admin';
import { useCountries } from '~/composables/useCountries';

const { countries, load: loadCountries } = useCountries();
const country = ref<CountryInterface | undefined>();

const props = defineProps({
  user: {
    type: Object as PropType<DashboardCustomerTableItem>,
    required: true,
  },
});

const emits = defineEmits(['close', 'changeLockStatus']);
const isOpen = ref(true);

const userCountry = async () => {
  if (props.user) {
    await loadCountries();
    country.value = countries.value.find((c) => c.value === props.user.address?.country) as CountryInterface | undefined;
  }
};
await userCountry();

type ApiStatusResponse = { status: string };

const closeModal = () => {
  isOpen.value = false;
  emits('close');
};

const onOpenChange = (open: boolean) => {
  isOpen.value = open;

  if (!open) {
    emits('close');
  }
};

const deactivateAccountAsAdmin = async (id: string) => {
  closeModal();
  emits('changeLockStatus');
  const response = (await deactivateUser(id)) as ApiStatusResponse;

  if (response.status !== 'success') {
    return;
  }
};

const activateAccountAsAdmin = async (id: string) => {
  closeModal();
  emits('changeLockStatus');
  const response = (await activateUser(id)) as ApiStatusResponse;
  if (response.status !== 'success') {
    return;
  }
};
</script>
