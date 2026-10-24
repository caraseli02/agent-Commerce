<template>
  <div
    class="relative flex flex-col bg-card rounded-xl p-4 pr-2 shadow-xs md:p-6 md:pr-3"
    :class="[type === 'default' ? 'pb-5 md:pb-8' : 'md:pb-6']"
  >
    <div class="flex items-start justify-between">
      <h2 class="leading-normal font-semibold md:mb-7" :class="[type === 'default' ? 'mb-6' : 'mb-9']">New Customers</h2>
      <WarningIcon v-if="error" class="w-6 h-6" />
    </div>
    <div v-if="people.length > 0 || loading" class="grid grid-cols-1 gap-4" :class="[type === 'default' ? 'md:gap-3' : 'mb-7 md:mb-5']">
      <DashboardNewCustomersItem
        v-for="(person, index) in people.slice(0, type === 'default' ? 7 : 6)"
        :key="index"
        :item="person"
        :index="index"
        :type="type"
        :loading="loading"
      />
      <DashboardNewCustomersEmptyItem
        v-for="(_, index) in type === 'default' ? 7 - people.length : 6 - people.length"
        :key="index"
        :loading="loading"
      />
    </div>
    <div v-if="!loading && people.length === 0" class="flex flex-col items-center justify-center flex-1 max-lg:mt-11 max-lg:mb-3">
      <EmojiSadIcon class="w-[52px] h-[52px] mb-4" />
      <div class="text-sm font-medium leading-normal text-muted-foreground">No data available</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import Avatar from 'assets/icons/dashboard/avatar.png';
import { fetchNewCustomersWidget } from '~/composables/api/dashboard-admin';
import { AccountStatusEnum, type UserInterface } from '~~/types/auth/user-interface';
import EmojiSadIcon from '@/assets/icons/dashboard/emoji-sad.svg';
import WarningIcon from '@/assets/icons/dashboard/warning.svg';
import { AccountType, getAccountTypeById } from '~~/types';
import type { DashboardCustomerTableItem } from '~~/types';
import { formatReviewerDate } from '~~/helpers/reviewer-dates';

const loading = ref(true);
const error = ref(false);
const people = ref<DashboardCustomerTableItem[]>([]);

defineProps({
  type: {
    type: String as PropType<'default' | 'detailed' | 'landing'>,
    required: false,
    default: 'default',
  },
});

const fetchAndSetNewCustomers = async (_time = 7) => {
  loading.value = true;
  error.value = false;

  const data = await fetchNewCustomersWidget();

  if (!data || !data.data || data.status !== 'success') {
    loading.value = false;
    error.value = true;
    return;
  }

  loading.value = false;

  people.value = data.data?.map((user: UserInterface): DashboardCustomerTableItem => ({
    avatar: Avatar,
    name:
      user.accountType === AccountType.Personal
        ? `${user?.personalDetails?.firstName ?? ''} ${user?.personalDetails?.lastName ?? ''}`.trim()
        : `${user?.contactDetails?.firstName ?? ''} ${user?.contactDetails?.lastName ?? ''}`.trim(),
    email: user.profileDetails?.email ?? '-',
    account: getAccountTypeById(user.accountType ?? AccountType.Personal) || '-',
    company: user.companyDetails?.name || '-',
    registered: formatReviewerDate(user.createdAt),
    spent: user.spent ?? 0,
    ordersCount: user.ordersCount ?? 0,
    id: user._id ?? user.firebaseId ?? '',
    firebaseId: user.firebaseId ?? '',
    active: user.status === AccountStatusEnum.Active,
    address: user.personalDetails?.address ??
      user.companyDetails?.address ?? {
        country: '',
        region: '',
        city: '',
        name1: '',
        name2: '',
        postcode: '',
        _id: '',
      },
    flag: { label: '', value: '', icon: '', regions: [] },
  }));
};

fetchAndSetNewCustomers();
</script>
