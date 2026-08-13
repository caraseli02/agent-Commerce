<template>
  <header
    class="fixed z-30 top-0 left-0 w-full bg-white shadow-xs md:transition-all md:duration-300 md:delay-50 md:ml-[96px] md:w-[calc(100%-96px)]"
    :class="[isCollapsedOnDesktop ? '' : '2xl:ml-[280px] 2xl:w-[calc(100%-280px)]']"
  >
    <div class="max-w-full mx-auto flex items-center justify-between px-4 py-3 transition-all duration-300 md:py-4 2xl:px-6">
      <button class="flex md:opacity-0 md:pointer-events-none md:hidden" @click="$emit('show-side-nav')">
        <BurgerIcon class="w-6 h-6 text-slate-500" />
      </button>
      <DashboardSearch v-model="searchValue" placeholder="Search" class="w-[400px] max-md:hidden" />
      <div class="flex items-center">
        <button class="flex mr-4 md:mr-8 md:hidden" @click="showMobileSearch = !showMobileSearch">
          <SearchIcon class="w-6 h-6 text-slate-500" />
        </button>
        <button class="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 mr-8 max-md:hidden">
          <PlusIcon class="w-6 h-6 text-slate-500" />
        </button>
        <button v-if="$route.name === 'dashboard-customers-slug'" class="flex mr-4 md:mr-8">
          <SettingsIcon class="w-6 h-6 text-slate-500" />
        </button>
        <div class="relative flex items-center">
          <div class="mr-3 mt-1 max-md:relative md:mr-10">
            <div class="relative">
              <Notifications
                :notifications="notifications"
                :unread-notifications="unreadNotifications"
                admin-view
                @delete="deleteNotification"
                @mark-as-read="markNotificationAsRead"
                @close="showNotifications = false"
              />
            </div>
            <Transition name="slide-fast-from-bottom">
              <div
                v-if="showNotifications"
                v-click-outside="() => (showNotifications = false)"
                class="flex flex-col fixed z-50 top-0 left-0 w-full h-full bg-white shadow-m md:absolute md:w-[316px] md:h-[508px] md:max-h-[80vh] md:left-[unset] md:right-0 md:top-[62px] md:rounded-xl md:overflow-hidden"
              >
                <div class="relative flex items-center justify-between py-4 px-3 shadow-s">
                  <button
                    class="flex items-center text-slate-500 transition-colors duration-300 hover:text-blue-500 md:hidden"
                    @click="showNotifications = false"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 mr-2">
                      <path
                        d="M6.3826 3.95312L2.33594 7.99979L6.3826 12.0465"
                        stroke="currentColor"
                        stroke-width="1.5"
                        stroke-miterlimit="10"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                      <path
                        d="M13.6653 8L2.44531 8"
                        stroke="currentColor"
                        stroke-width="1.5"
                        stroke-miterlimit="10"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                    <span class="text-sm leading-[1.43] font-medium"> Back </span>
                  </button>
                  <div
                    class="max-md:absolute max-md:top-1/2 max-md:left-1/2 max-md:-translate-x-1/2 max-md:-translate-y-1/2 text-sm leading-[1.43] font-medium"
                  >
                    Notifications
                  </div>
                  <button class="flex text-slate-500 transition-colors duration-300 hover:text-blue-500">
                    <SettingsIcon class="w-6 h-6" />
                  </button>
                </div>
                <div class="flex-1 overflow-y-auto notifications-scroll">
                  <NuxtLink
                    v-for="(notification, index) in notifications"
                    :key="index"
                    :to="`${route.path}`"
                    event=""
                    class="flex flex-col w-full bg-white pt-2 pb-1 px-3 border-b border-border last:border-b-0 transition-colors duration-300 hover:bg-[#F5F5F5]"
                    @click.prevent="markNotificationAsRead(notification, index)"
                  >
                    <div class="flex items-center justify-between w-full mb-2">
                      <div class="flex items-center">
                        <NotificationIcon
                          class="w-5 h-5 mr-2"
                          :class="[
                            notification.title === 'Others'
                              ? 'text-slate-500'
                              : notification.title === 'Password change' || notification.title === 'Reset password'
                                ? 'text-blue-500'
                                : notification.title === 'Removed'
                                  ? 'text-rose-500'
                                  : notification.title === 'Completed'
                                    ? 'text-[#00D395]'
                                    : notification.title === 'Pending'
                                      ? 'text-[#FFB100]'
                                      : 'text-[#A460BC]',
                          ]"
                        />
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
                          class="flex text-slate-500 transition-colors duration-300 hover:text-blue-500"
                          @click.stop.prevent="deleteNotification(notification, index)"
                        >
                          <XIcon class="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div class="flex items-center justify-between">
                      <div class="text-sm leading-[1.43] text-slate-500 mr-1">
                        {{ notification.description }}
                      </div>
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 18 18"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        class="w-[18px] h-[18px] flex-shrink-0"
                      >
                        <path
                          d="M7.5 12.75L10.5 9L7.5 5.25"
                          stroke="#5E6278"
                          stroke-width="1.5"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                      </svg>
                    </div>
                  </NuxtLink>
                </div>
                <div class="flex justify-center py-4 shadow-s relative z-10">
                  <NuxtLink to="/" class="flex items-center text-blue-500">
                    <span class="text-sm leading-[1.43] font-medium mr-2"> View all </span>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      class="w-4 h-4 rotate-180"
                    >
                      <path
                        d="M6.3826 3.95312L2.33594 7.99979L6.3826 12.0465"
                        stroke="currentColor"
                        stroke-width="1.5"
                        stroke-miterlimit="10"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                      <path
                        d="M13.6653 8L2.44531 8"
                        stroke="currentColor"
                        stroke-width="1.5"
                        stroke-miterlimit="10"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </NuxtLink>
                </div>
              </div>
            </Transition>
          </div>
          <div class="relative">
            <button class="flex items-center text-left" @click="showOptions = !showOptions">
              <div class="relative lg:mr-4">
                <img :src="DashboardAvatar" alt="Avatar" class="w-11 h-11 rounded-full object-cover" loading="lazy" />
                <div class="absolute -bottom-1 -right-1 box-content w-2.5 h-2.5 rounded-full bg-[#00D395] border-4 border-white" />
              </div>
              <div class="flex flex-col max-lg:hidden">
                <div class="leading-normal font-medium">
                  {{ (user?.contactDetails?.firstName || '') + ' ' + (user?.contactDetails?.lastName || '') }}
                </div>
                <div class="text-xs leading-normal text-slate-500">
                  {{ user?.role !== AccountRole.Client ? AccountRole[user.role] : AccountType[user.role] }}
                </div>
              </div>
            </button>
            <Transition name="fade-full">
              <div
                v-if="showOptions"
                v-click-outside="() => (showOptions = false)"
                class="absolute -bottom-3.5 right-0 translate-y-full grid grid-cols-1 gap-1 w-full rounded-lg bg-white p-3 min-w-[174px] shadow-m md:-bottom-[18px] md:w-[210px] lg:w-[210px]"
              >
                <button
                  class="flex items-center w-full text-left px-3 py-2 rounded-lg transition-colors duration-300 hover:bg-[#F2F2F2] hover:text-blue-500"
                  @click="showOptions = false"
                >
                  <ProfileIcon class="w-6 h-6 mr-3 text-current" />
                  <span class="text-sm leading-[1.71] font-medium"> Profile </span>
                </button>
                <button
                  class="flex items-center w-full text-left px-3 py-2 rounded-lg transition-colors duration-300 hover:bg-[#F2F2F2] hover:text-blue-500"
                  @click="showOptions = false"
                >
                  <SettingsIcon class="w-6 h-6 mr-3 text-current" />
                  <span class="text-sm leading-[1.71] font-medium">Settings</span>
                </button>
                <button
                  class="flex items-center w-full text-left px-3 py-2 rounded-lg transition-colors duration-300 hover:bg-[#F2F2F2] hover:text-blue-500"
                  @click="
                    showOptions = false;
                    handleSignOut();
                    $router.push('/');
                  "
                >
                  <SignOutIcon class="w-6 h-6 mr-3 text-current" />
                  <span class="text-sm leading-[1.71] font-medium"> Sign out </span>
                </button>
              </div>
            </Transition>
          </div>
        </div>
        <Transition name="fade">
          <div
            v-if="showMobileSearch"
            v-click-outside="() => (showMobileSearch = false)"
            class="absolute z-50 top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] md:hidden"
          >
            <div class="flex items-center border border-border bg-white rounded-lg pr-3">
              <label class="relative z-10 flex-1 flex items-center">
                <form action="" @submit.prevent>
                  <input
                    v-model="searchValue"
                    type="search"
                    placeholder="Search"
                    class="bg-transparent flex-1 w-full px-3 py-2.5 text-sm leading-[1.43] placeholder:text-gray-500 focus:outline-none"
                  />
                </form>
              </label>
              <SearchIcon v-if="!searchValue" class="flex-shrink-0 w-5 h-5 text-gray-500" />
              <button v-else class="flex" @click.stop="searchValue = ''">
                <XIcon class="flex-shrink-0 w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { differenceInDays, differenceInHours } from 'date-fns';
import { storeToRefs } from 'pinia';
import { AccountRole, AccountType } from '../../types';
import DashboardAvatar from '@/assets/icons/dashboard/avatar.png';
import BurgerIcon from '@/assets/icons/dashboard/burger.svg';
import SearchIcon from '@/assets/icons/dashboard/search.svg';
import PlusIcon from '@/assets/icons/dashboard/plus.svg';
import ProfileIcon from '@/assets/icons/dashboard/profile.svg';
import SettingsIcon from '@/assets/icons/dashboard/setting.svg';
import SignOutIcon from '@/assets/icons/dashboard/sign-out.svg';
import NotificationIcon from '@/assets/icons/dashboard/notification-ringing.svg';
import XIcon from '@/assets/icons/dashboard/x.svg';
import type { Notification } from '~/types/dashboard/notification';
import { useAuthStore } from '~/store/authStore';
import { useNotificationStore } from '~/store/notificationStore';
import type { UserInterface } from '~/types/auth/user-interface';
import {
  deleteNotificationById,
  fetchGetNotifications,
  markNotificationAsRead as markNotificationAsReadById,
} from '~/composables/api/notifications';

defineProps({
  isCollapsedOnDesktop: {
    type: Boolean,
    required: true,
  },
});
const authStore = useAuthStore();
const notificationStore = useNotificationStore();
const { getUserDetails } = storeToRefs(authStore);

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'show-side-nav'): unknown;
}>();

const showMobileSearch = ref(false);
const searchValue = ref('');
const notifications = ref<Notification[]>([] as Notification[]);
const error = ref(false);
const isLoading = ref(false);
const showOptions = ref(false);
const showNotifications = ref(false);
const unreadNotifications = ref(0);

const user = ref({} as UserInterface);

onMounted(() => {
  if (getUserDetails.value) {
    user.value = getUserDetails.value;
  }
});

watch(
  () => notificationStore.refreshRequestId,
  () => {
    void fetchNofications();
  },
);

watch(
  () => authStore.getToken(),
  (token) => {
    if (!token) {
      notifications.value = [];
      unreadNotifications.value = 0;
    }
  },
);

const fetchNofications = async () => {
  error.value = false;
  isLoading.value = true;
  unreadNotifications.value = 0;

  type NotificationsResponse = { status: string; description: Notification[] };
  const response = (await fetchGetNotifications()) as unknown as NotificationsResponse;
  if (response.status !== 'success') {
    isLoading.value = false;
    error.value = true;

    return;
  } else {
    isLoading.value = false;
  }
  notifications.value = response.description;
  notifications.value.forEach((notification) => {
    if (notification.seen === false) {
      unreadNotifications.value++;
    }
  });
};

const handleSignOut = async () => {
  authStore.signOut();
  setTimeout(() => {
    emit('close');
  }, 200);
};

const route = useRoute();
const getCurrentDate = (date: string) => {
  const currentDate = new Date();
  const receivedDate = new Date(date);
  return differenceInHours(currentDate, receivedDate) < 24
    ? differenceInHours(currentDate, receivedDate) + 'h'
    : differenceInDays(currentDate, receivedDate) + 'd';
};

const markNotificationAsRead = async (notification: Notification, index: number) => {
  if (notifications.value[index].seen !== true) {
    unreadNotifications.value--;
  }

  const response = (await markNotificationAsReadById(notification.id)) as { status: string };

  if (response.status !== 'success') {
    return;
  }

  notifications.value[index].seen = true;
};

const deleteNotification = async (notification: Notification, index: number) => {
  const response = (await deleteNotificationById(notification.id)) as { status: string };

  if (response.status !== 'success') {
    return;
  }

  notifications.value.splice(index, 1);
};

Promise.all([fetchNofications()]);
</script>

<style lang="scss">
.notifications-scroll {
  scrollbar-width: thin;

  &::-webkit-scrollbar {
    @apply w-1;
  }

  &::-webkit-scrollbar-track {
    @apply bg-[#f5f5f5];
  }

  &::-webkit-scrollbar-thumb {
    background: #d4d4d4;
    @apply rounded-[100px] border-[#f5f5f5];
  }
}
</style>
