<template>
  <div
    class="relative flex flex-col bg-white rounded-xl p-4 pr-2 shadow-xs md:p-6 md:pr-3"
    :class="[type === 'default' ? 'pb-5 md:pb-8' : 'md:pb-6']"
  >
    <div class="flex items-start justify-between">
      <div
        class="leading-normal font-semibold md:mb-7"
        :class="[type === 'default' ? 'mb-6' : 'mb-9']"
      >
        New Customers
      </div>
      <WarningIcon
        v-if="error"
        class="w-6 h-6"
      />
    </div>
    <div
      v-if="people.length > 0"
      class="grid grid-cols-1 gap-4"
      :class="[type === 'default' ? 'md:gap-3' : 'mb-7 md:mb-5']"
    >
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
    <div
      v-if="people.length === 0"
      class="flex flex-col items-center justify-center flex-1 max-lg:mt-11 max-lg:mb-3"
    >
      <EmojiSadIcon class="w-[52px] h-[52px] mb-4" />
      <div class="text-sm font-medium leading-normal text-gray-500">
        No data available
      </div>
    </div>
    <div
      v-if="type !== 'default' && people.length > 0"
      class="flex items-center mt-auto"
      :class="[type === 'detailed' ? 'justify-between' : 'justify-center']"
    >
      <div
        v-if="type !== 'landing'"
        class="flex items-center"
      >
        <ArrowUpIcon class="w-4 h-4 mr-1" />
        <div class="text-sm leading-[1.43] font-medium text-[#00D395] mr-1">
          3,78%
        </div>
        <button
          class="flex items-center"
          @click="showOptions = !showOptions"
        >
          <span class="text-sm left-[1.43] text-slate-500 font-medium mr-1">
            {{ selectedOption }}
          </span>
          <ChevronIcon
            class="w-5 h-5 text-slate-500 transition-transform duration-300"
            :class="[showOptions ? 'rotate-180' : '']"
          />
        </button>
      </div>
      <button
        disabled
        class="flex items-center disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span class="text-sm font-medium left-[1.43] text-slate-500 mr-1"> View All </span>
        <ArrowRightIcon class="w-5 h-5" />
      </button>
    </div>
    <Transition name="fade-full">
      <div
        v-if="showOptions"
        v-click-outside="() => (showOptions = false)"
        class="absolute z-10 -bottom-0.5 left-0 translate-y-full grid grid-cols-1 gap-1 rounded-lg bg-white p-3 w-[200px]"
        :style="{
          boxShadow: '0px 0px 6px rgba(51, 51, 51, 0.2)',
        }"
      >
        <button
          v-for="(option, index) in options"
          :key="index"
          class="flex items-center w-full text-left px-3 py-2 rounded-lg transition-colors duration-300 hover:bg-[#F2F2F2] hover:text-blue-500"
          :class="selectedOption === option ? 'bg-[#F2F2F2] text-blue-500' : ''"
          @click="
            showOptions = false;
            selectedOption = option;
          "
        >
          <span class="text-sm leading-[1.71] font-medium">{{ option }}</span>
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import Avatar from 'assets/icons/dashboard/avatar.png';
import ArrowUpIcon from '@/assets/icons/dashboard/arrow-up.svg';
import ChevronIcon from '@/assets/icons/dashboard/chevron-down.svg';
import ArrowRightIcon from '@/assets/icons/dashboard/arrow-right.svg';
import { AccountStatusEnum, type UserInterface } from '~/types/auth/user-interface';
import { useNuxtApp } from '#app';
import EmojiSadIcon from '@/assets/icons/dashboard/emoji-sad.svg';
import WarningIcon from '@/assets/icons/dashboard/warning.svg';
import { AccountType, getAccountTypeById } from '~/types';
import type { DashboardCustomerTableItem } from '~/types';

const { $api } = useNuxtApp();

const showOptions = ref(false);
const selectedOption = ref('This Week');
const options = ['Last 24h', 'This Week', 'Last 7 Days', 'Last 30 Days', 'All Time'];
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

  const data = await $api.userDashboard.fetchNewCustomersWidget();

  if (!data || !data.data || data.status !== 'success') {
    loading.value = false;
    error.value = true;
    return;
  }

  loading.value = false;

  people.value = data.data?.map(
    (user: UserInterface): DashboardCustomerTableItem => ({
      avatar: Avatar,
      name:
                user.accountType === AccountType.Personal
                  ? `${user?.personalDetails?.firstName ?? ''} ${user?.personalDetails?.lastName ?? ''}`.trim()
                  : `${user?.contactDetails?.firstName ?? ''} ${user?.contactDetails?.lastName ?? ''}`.trim(),
      email: user.profileDetails?.email ?? '-',
      account: getAccountTypeById(user.accountType ?? AccountType.Personal) || '-',
      company: user.companyDetails?.name || '-',
      registered: user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-GB') : '-',
      spent: user.spent ?? 0,
      ordersCount: user.ordersCount ?? 0,
      id: user._id ?? user.firebaseId ?? '',
      firebaseId: user.firebaseId ?? '',
      active: user.status === AccountStatusEnum.Active,
      address: user.personalDetails?.address
        ?? user.companyDetails?.address ?? {
        country: '',
        region: '',
        city: '',
        name1: '',
        name2: '',
        postcode: '',
        _id: '',
      },
      flag: { label: '', value: '', icon: '', regions: [] },
    }),
  );
};

fetchAndSetNewCustomers();
</script>
