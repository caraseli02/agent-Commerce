<template>
  <div class="flex w-full items-start gap-3">
    <div
      class="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-slate-200 text-lg font-semibold text-slate-600 select-none"
      aria-hidden="true"
    >
      {{ avatarInitials }}
    </div>
    <div class="min-w-0 flex-1 pt-0.5">
      <div class="flex min-w-0 items-center gap-2">
        <p class="truncate text-sm font-medium leading-5 text-neutral-700">
          {{ fullname || 'Loading...' }}
        </p>
        <DemoTooltip theme="black" position="bottom">
          <component
            :is="getIconBadgeByAccountType()"
            class="h-5 w-5 shrink-0 text-slate-500 transition-colors duration-300 hover:text-blue-500"
          />
          <template #content>
            <span class="text-sm">{{
              getUserDetails.accountType ? AccountType[getUserDetails.accountType] : AccountRole[getUserDetails.role]
            }}</span>
          </template>
        </DemoTooltip>
      </div>
      <p class="mt-0.5 truncate text-xs leading-4 text-slate-500">
        {{ getUserDetails?.contactDetails.email || 'Loading...' }}
      </p>
      <div class="mt-2 flex min-w-0 items-center gap-1.5">
        <span class="shrink-0 text-xs font-medium leading-5 text-stone-500">Client code:</span>
        <span class="truncate text-xs font-medium leading-5 text-stone-600 tabular-nums">
          {{ getUserDetails?.clientCode || 'N/A' }}
        </span>
        <CopyClipboard
          :text="getUserDetails?.clientCode || ''"
          :label="`Copy client code ${getUserDetails?.clientCode || ''}`"
          class="!min-h-8 !min-w-8 -my-1 shrink-0 text-slate-400 transition-colors duration-300 hover:text-blue-500"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { shallowRef, type Component } from 'vue';
import { storeToRefs } from 'pinia';
import BuildingIcon from '@/assets/icons/menu/busines-buildings.svg';
import UserIcon from '@/assets/icons/menu/user.svg';
import PersonalCardIcon from '@/assets/icons/menu/personalcard.svg';
import briefcaseIcon from '@/assets/icons/menu/briefcase.svg';
import DemoTooltip from '~/components/global/DemoTooltip.vue';
import { useAuthStore } from '~/store/authStore';
import { AccountRole, AccountType } from '~~/types';

const authStore = useAuthStore();

const { getUserDetails } = storeToRefs(authStore);
const accountTypeIcon = shallowRef<Component | null>(null);

onMounted(() => {
  if (!getUserDetails.value) return;

  if (getUserDetails.value.role === AccountRole.Client && getUserDetails.value.accountType === AccountType.Business) {
    accountTypeIcon.value = BuildingIcon;
  } else if (
    getUserDetails.value.role === AccountRole.Client &&
    (getUserDetails.value.accountType === AccountType.SoleTrader || getUserDetails.value.accountType === AccountType.Agent)
  ) {
    accountTypeIcon.value = briefcaseIcon;
  }

  if (getUserDetails.value.role !== AccountRole.Client) {
    accountTypeIcon.value = PersonalCardIcon;
  }
});

const getIconBadgeByAccountType = () => {
  switch (getUserDetails.value?.accountType) {
    case AccountType.Personal:
      return PersonalCardIcon;
    case AccountType.Business:
      return BuildingIcon;
    case AccountType.SoleTrader:
    case AccountType.Agent:
      return briefcaseIcon;
    default:
      return UserIcon;
  }
};

const fullname = computed(() => {
  if (getUserDetails.value?.role === AccountRole.Client && getUserDetails.value?.accountType === AccountType.Personal) {
    // eslint-disable-next-line vue/no-side-effects-in-computed-properties
    accountTypeIcon.value = UserIcon;
    return `${getUserDetails.value?.personalDetails?.firstName} ${getUserDetails.value?.personalDetails?.lastName}`;
  } else {
    return `${getUserDetails.value?.contactDetails?.firstName} ${getUserDetails.value?.contactDetails?.lastName}`;
  }
});

const avatarInitials = computed(() => {
  const sourceName = fullname.value?.trim();

  if (!sourceName) {
    return 'DE';
  }

  const parts = sourceName.split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
});
</script>

<style scoped></style>
