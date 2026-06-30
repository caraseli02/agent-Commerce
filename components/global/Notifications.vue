<template>
  <UiSheet :key="userDetails?._id" v-model:open="showNotifications">
    <UiSheetTrigger>
      <button class="flex items-center -mr-2.5 xl:-mr-4">
        <div class="flex items-center">
          <div class="flex items-center flex-col">
            <BellIcon :class="adminView ? 'text-slate-500' : 'text-white'" class="w-6 h-6 xl:mb-1" />
            <span v-if="!adminView" class="hidden font-medium text-xs leading-[1.33] text-white xl:inline-block"> Notifications </span>
          </div>
          <span
            v-if="unreadNotifications > 0"
            class="flex items-center justify-center -translate-y-2 h-[18px] font-Inter z-10 -top-1 -right-[9px] bg-rose-500 text-white rounded-[100px] text-xs font-medium leading-[1.5] xl:-translate-y-[18px]"
            :class="[
              unreadNotifications < 10 ? 'w-[18px]' : unreadNotifications < 100 ? 'w-6' : 'w-[31px]',
              adminView ? 'xl:-translate-x-[8px] -translate-x-1' : 'xl:-translate-x-[38px] -translate-x-2.5',
            ]"
          >
            <span>
              {{ unreadNotifications }}
            </span>
          </span>
        </div>
      </button>
    </UiSheetTrigger>
    <LazyUiSheetContent class="md:max-h-[calc(100vh-48px)] w-full h-full md:min-w-[440px] p-0 md:m-6 overflow-hidden rounded-xl">
      <div class="relative flex flex-col gap-[60px] pt-4 px-3 shadow-s">
        <div class="flex items-center justify-between">
          <p class="text-2xl font-medium">Notifications</p>
          <UiButton class="z-10 hover:z-10 hover:bg-slate-200 w-8 h-8" size="icon" variant="secondary" @click="showNotifications = false">
            <XIcon />
          </UiButton>
        </div>

        <UiTabs v-model="selectedTab">
          <UiTabsList
            class="bg-white min-h-9 ml-2 p-0 w-full justify-start scrollbar-none overflow-x-scroll lg:overscroll-x-none overflow-y-hidden rounded-none"
          >
            <template v-for="tab in tabs" :key="tab.value">
              <UiTabsTrigger class="pb-3 data-[state=active]:shadow-none data-[state=active]:text-blue-500 relative" :value="tab.value">
                {{ tab.label }}
                <UiBadge
                  :key="tab.badge"
                  variant="secondary"
                  :class="{ 'bg-blue-500 text-white': selectedTab === tab.value }"
                  class="text-xs rounded-full p-1.5 min-w-5 h-5 ml-1"
                >
                  {{ tab.badge }}
                </UiBadge>
                <div v-if="selectedTab === tab.value" class="w-full h-1 bg-blue-500 absolute bottom-0 rounded-t-full" />
              </UiTabsTrigger>
            </template>
          </UiTabsList>
        </UiTabs>
      </div>
      <div class="flex-1 overflow-y-auto h-full md:max-h-[calc(100vh-246px)] notifications-scroll">
        <NuxtLink
          v-for="(notification, index) in first50"
          :key="index"
          :to="`${route.path}`"
          event=""
          class="flex flex-col w-full bg-white pt-2 pb-1 py-3 px-2 border-b border-border last:border-b-0 transition-colors duration-300 hover:bg-[#F5F5F5]"
          @click.prevent="markNotificationAsRead(notification, index)"
        >
          <div class="flex items-center justify-between w-full py-3 px-2">
            <div class="flex items-center">
              <NotificationIcon class="w-5 h-5 mr-2" :class="getNotificationClass(notification.title)" />
              <span v-if="!notification.seen" class="flex w-2 h-2 flex-shrink-0 bg-blue-500 rounded-full mr-2" />
              <span class="capitalize text-sm leading-[1.43] font-medium">
                {{ notification.title }}
              </span>
            </div>
            <div class="flex items-center">
              <span class="text-xs leading-[1.67] text-slate-500 mr-4">
                {{ getCurrentDate(notification.date) }}
              </span>
              <button
                class="flex items-center justify-center text-slate-500 transition-colors duration-300 hover:text-blue-500"
                @click.stop.prevent="deleteNotification(notification, index)"
              >
                <XIcon class="w-4 h-4" />
              </button>
            </div>
          </div>
          <div class="flex items-center justify-between pl-3 pr-2 pb-2 min-h-12">
            <div class="text-sm leading-[1.43] text-slate-500 mr-1">
              {{ notification.description }}
            </div>
            <ChevronRight class="w-[18px] h-[18px] flex-shrink-0" />
          </div>
        </NuxtLink>
      </div>
      <div class="flex justify-between py-4 shadow-s z-10 sticky bg-white bottom-0 px-4">
        <NuxtLink to="/" class="flex items-center text-blue-500">
          <span class="text-sm leading-[1.43] font-medium mr-2"> View all </span>
          <ArrowRight class="w-5 h-5 text-blue-500" />
        </NuxtLink>
        <Settings class="w-5 h-5 text-slate-500" />
      </div>
    </LazyUiSheetContent>
  </UiSheet>
</template>

<script setup lang="ts">
import { differenceInDays, differenceInHours } from 'date-fns';
import { XIcon, ArrowRight, Settings, ChevronRight } from 'lucide-vue-next';
import { storeToRefs } from 'pinia';
import BellIcon from '@/assets/icons/header/bell.svg';
import NotificationIcon from '@/assets/icons/dashboard/notification-ringing.svg';
import { AccountRole, type Notification, getAccountTypeById } from '~/types';
import { useAuthStore } from '~/store/authStore';
import { useNotificationStore } from '~/store/notificationStore';

const notificationStore = useNotificationStore();
const { unreadNotifications, showNotifications } = storeToRefs(notificationStore);

enum NotificationsGroups {
  Users = 0,
  Orders = 1,
  System = 2,
}

const route = useRoute();

const emits = defineEmits(['close', 'markAsRead', 'delete']);

const props = defineProps<{
  notifications: Notification[];
  adminView?: boolean;
}>();

const selectedTab = ref('all');
const tabs = ref();

const authStore = useAuthStore();
const { userDetails } = storeToRefs(authStore);

// Update tab badges based on notifications
const updateTabs = () => {
  selectedTab.value = 'all';
  const accountType = getAccountTypeById(userDetails.value?.accountType as number);
  const allCount = props.notifications.length;
  const usersCount = props.notifications.filter((n) => n.group === NotificationsGroups.Users).length;
  const ordersCount = props.notifications.filter((n) => n.group === NotificationsGroups.Orders).length;
  const systemCount = props.notifications.filter((n) => n.group === NotificationsGroups.System).length;

  tabs.value = [
    { value: 'all', label: 'All', badge: allCount },
    { value: 'orders', label: 'Orders', badge: ordersCount },
    { value: 'system', label: 'System', badge: systemCount },
  ];

  if (userDetails.value?.role === AccountRole.Admin || accountType === 'Business') {
    tabs.value.splice(2, 0, { value: 'users', label: 'Users', badge: usersCount });
  }
};

// Watch notifications and update tabs accordingly
watch(() => props.notifications, updateTabs, { deep: true });

// Initial update on mount
onMounted(updateTabs);

const first50 = computed(() => {
  let filteredNotifications = props.notifications;

  // Filter based on selected tab
  if (selectedTab.value !== 'all') {
    filteredNotifications = filteredNotifications.filter((notification) => {
      switch (selectedTab.value) {
        case 'users':
          return notification.group === NotificationsGroups.Users;
        case 'orders':
          return notification.group === NotificationsGroups.Orders;
        case 'system':
          return notification.group === NotificationsGroups.System;
        default:
          return true;
      }
    });
  }

  // Sort by unseen first and most recent date
  return filteredNotifications.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 50);
});

const getCurrentDate = (date: string) => {
  const currentDate = new Date();
  const receivedDate = new Date(date);
  return differenceInHours(currentDate, receivedDate) < 24
    ? differenceInHours(currentDate, receivedDate) + 'h'
    : differenceInDays(currentDate, receivedDate) + 'd';
};

const markNotificationAsRead = async (notification: Notification, index: number) => {
  emits('markAsRead', notification, index);
};
const deleteNotification = async (notification: Notification, index: number) => {
  emits('delete', notification, index);
};

function getNotificationClass(notificationTitle: string): string {
  switch (notificationTitle) {
    case 'Others':
      return 'text-slate-500';
    case 'Processing':
      return 'text-purple-500';
    case 'Failed':
    case 'New':
      return 'text-blue-500';
    case 'Removed':
      return 'text-rose-500';
    case 'Completed':
      return 'text-green-500';
    case 'Pending':
      return 'text-amber-500';
    default:
      return 'text-blue-500';
  }
}
</script>
