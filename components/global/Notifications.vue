<template>
  <UiSheet :key="userDetails?._id" v-model:open="showNotifications">
    <UiSheetTrigger>
      <button type="button" class="flex items-center -mr-2.5 xl:-mr-4" aria-label="Open notifications">
        <div class="flex items-center">
          <div class="flex flex-col items-center">
            <BellIcon :class="adminView ? 'text-slate-500' : 'text-white'" class="mb-0 h-6 w-6 xl:mb-1" />
            <span v-if="!adminView" class="hidden text-xs font-medium leading-[1.33] text-white xl:inline-block"> Notifications </span>
          </div>
          <span
            v-if="unreadNotifications > 0"
            class="z-10 -top-1 -right-[9px] -translate-y-2 flex h-[18px] items-center justify-center rounded-[100px] bg-rose-500 font-Inter text-xs font-medium leading-[1.5] text-white xl:-translate-y-[18px]"
            :class="[
              unreadNotifications < 10 ? 'w-[18px]' : unreadNotifications < 100 ? 'w-6' : 'w-[31px]',
              adminView ? '-translate-x-1 xl:-translate-x-[8px]' : '-translate-x-2.5 xl:-translate-x-[38px]',
            ]"
          >
            <span>
              {{ unreadNotifications }}
            </span>
          </span>
        </div>
      </button>
    </UiSheetTrigger>
    <LazyUiSheetContent
      side="right"
      hidde-close-button
      class="flex h-full w-full flex-col gap-0 overflow-hidden rounded-none border-l border-slate-100 p-0 shadow-lg sm:max-w-[440px] md:w-[440px]"
    >
      <header class="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 bg-white px-4 py-3 md:px-6">
        <h2 class="truncate text-lg font-semibold text-neutral-800">Notifications</h2>
        <button
          type="button"
          class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-light-300 text-slate-500 transition-colors duration-300 hover:bg-light-400 hover:text-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label="Close notifications"
          @click="showNotifications = false"
        >
          <XIcon class="h-5 w-5" />
        </button>
      </header>

      <div class="shrink-0 border-b border-slate-100 px-2 pt-2 md:px-4">
        <UiTabs v-model="selectedTab">
          <UiTabsList
            class="min-h-9 w-full justify-start overflow-x-scroll overflow-y-hidden rounded-none bg-white p-0 scrollbar-none lg:overscroll-x-none"
          >
            <template v-for="tab in tabs" :key="tab.value">
              <UiTabsTrigger class="relative pb-3 data-[state=active]:text-blue-500 data-[state=active]:shadow-none" :value="tab.value">
                {{ tab.label }}
                <UiBadge
                  :key="tab.badge"
                  variant="secondary"
                  :class="{ 'bg-blue-500 text-white': selectedTab === tab.value }"
                  class="ml-1 h-5 min-w-5 rounded-full p-1.5 text-xs"
                >
                  {{ tab.badge }}
                </UiBadge>
                <div v-if="selectedTab === tab.value" class="absolute bottom-0 h-1 w-full rounded-t-full bg-blue-500" />
              </UiTabsTrigger>
            </template>
          </UiTabsList>
        </UiTabs>
      </div>

      <div class="notifications-scroll min-h-0 flex-1 overflow-y-auto">
        <NuxtLink
          v-for="(notification, index) in first50"
          :key="index"
          :to="`${route.path}`"
          event=""
          class="flex w-full flex-col border-b border-border bg-white px-2 py-3 pt-2 pb-1 transition-colors duration-300 last:border-b-0 hover:bg-[#F5F5F5]"
          @click.prevent="markNotificationAsRead(notification, index)"
        >
          <div class="flex w-full items-center justify-between px-2 py-3">
            <div class="flex items-center">
              <NotificationIcon class="mr-2 h-5 w-5" :class="getNotificationClass(notification.title)" />
              <span v-if="!notification.seen" class="mr-2 flex h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />
              <span class="text-sm font-medium capitalize leading-[1.43]">
                {{ notification.title }}
              </span>
            </div>
            <div class="flex items-center">
              <span class="mr-4 text-xs leading-[1.67] text-slate-500">
                {{ getCurrentDate(notification.date) }}
              </span>
              <button
                type="button"
                class="flex items-center justify-center text-slate-500 transition-colors duration-300 hover:text-blue-500"
                aria-label="Delete notification"
                @click.stop.prevent="deleteNotification(notification, index)"
              >
                <XIcon class="h-4 w-4" />
              </button>
            </div>
          </div>
          <div class="flex min-h-12 items-center justify-between pb-2 pl-3 pr-2">
            <div class="mr-1 text-sm leading-[1.43] text-slate-500">
              {{ notification.description }}
            </div>
            <ChevronRight class="h-[18px] w-[18px] flex-shrink-0" />
          </div>
        </NuxtLink>
      </div>

      <div class="sticky bottom-0 z-10 flex shrink-0 items-center justify-between border-t border-slate-100 bg-white px-4 py-4">
        <NuxtLink to="/" class="flex items-center text-blue-500">
          <span class="mr-2 text-sm font-medium leading-[1.43]"> View all </span>
          <ArrowRight class="h-5 w-5 text-blue-500" />
        </NuxtLink>
        <Settings class="h-5 w-5 text-slate-500" aria-hidden="true" />
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
