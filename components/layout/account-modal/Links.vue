<template>
  <div>
    <NuxtLink
      v-show="!route.path.includes('dashboard')"
      :to="isAdmin ? '/dashboard' : '/dashboard/client'"
      class="hover:bg-zinc-100 text-neutral-800 hover:text-blue-500 items-stretch flex justify-start gap-3 pl-3 pr-20 py-3 rounded-lg"
      @click="emit('close')"
    >
      <component :is="IconApps" class="w-6 h-6" />
      <div class="transition-all text-sm font-medium leading-6 whitespace-nowrap">Dashboard</div>
    </NuxtLink>
    <UiButton
      v-for="(menuItem, index) in menuActions"
      :key="index"
      type="button"
      variant="ghost"
      class="w-full items-stretch justify-start gap-3 rounded-lg py-3 pl-3 pr-20 text-neutral-800 hover:bg-zinc-100 hover:text-blue-500"
      @click="emit('close'), menuItem.action()"
    >
      <component :is="menuItem.icon" class="w-6 h-6" />
      <div class="transition-all text-sm font-medium leading-6 whitespace-nowrap">
        {{ menuItem.text }}
      </div>
      <div
        v-if="menuItem.text === 'Notifications' && unreadNotifications > 0"
        class="text-white text-center text-xs font-medium leading-5 whitespace-nowrap flex justify-center items-center bg-rose-500 aspect-[1.3333333333333333] my-auto px-1 rounded-[100px]"
      >
        {{ unreadNotifications }}
      </div>
    </UiButton>
    <NuxtLink
      v-for="(menuItem, index) in menuLinks"
      :key="index"
      :to="menuItem.to"
      class="items-stretch flex justify-start gap-3 pl-3 pr-20 py-3 rounded-lg"
      :class="menuItem.disabled ? 'text-neutral-200 cursor-not-allowed' : 'hover:bg-zinc-100 text-neutral-800 hover:text-blue-500'"
      @click="emit('close')"
    >
      <component :is="menuItem.icon" class="w-6 h-6" />
      <div
        v-if="menuItem.disabled"
        class="transition-all text-sm font-medium leading-6 whitespace-nowrap flex items-center justify-between flex-1"
      >
        <span>{{ menuItem.text }}</span>
        <span class="text-[10px] bg-zinc-100 text-zinc-400 px-1.5 py-0.5 rounded ml-2 font-bold tracking-tight">COMING SOON</span>
      </div>
      <div v-else class="transition-all text-sm font-medium leading-6 whitespace-nowrap">
        {{ menuItem.text }}
      </div>
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import IconApps from '@/assets/icons/menu/apps.svg';
import SvgoMenuNotification from '@/assets/icons/menu/Notification.svg';
import SvgoMenuTag from '@/assets/icons/menu/tag.svg';
import SvgoMenuFileUpload from '@/assets/icons/menu/file-upload.svg';
import SvgoMenuPackagingLocation from '@/assets/icons/menu/packaging-location.svg';
import SvgoMenuClock from '@/assets/icons/menu/Clock.svg';
import SvgoMenuSetting from '@/assets/icons/menu/Setting.svg';
import { useAuthStore } from '~/store/authStore';
import { AccountRole } from '~/types/signup/form';
import { useNotificationStore } from '~/store/notificationStore';

const notificationStore = useNotificationStore();
const { unreadNotifications, showNotifications } = storeToRefs(notificationStore);

const authStore = useAuthStore();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const route = useRoute();

const isAdmin = computed(() => {
  const role = authStore.userDetails?.role;
  return role === AccountRole.SuperAdmin || role === AccountRole.Admin;
});

const menuActions = ref([
  {
    icon: SvgoMenuNotification,
    text: 'Notifications',
    to: '/',
    action: () => {
      showNotifications.value = true;
    },
  },
  // {
  //   icon: SvgoMenuCartAdd,
  //   text: 'Quick Buy',
  //   to: '/',
  //   action: () => null
  // }
]);
const menuLinks = ref([
  {
    icon: SvgoMenuTag,
    text: 'Price Offer',
    to: '/',
    disabled: true,
  },
  {
    icon: SvgoMenuFileUpload,
    text: 'BOM Upload',
    to: '/',
    disabled: true,
  },
  {
    icon: SvgoMenuPackagingLocation,
    text: 'Order Tracking',
    to: isAdmin.value ? '/dashboard' : '/dashboard/client?tab=home',
  },
  {
    icon: SvgoMenuClock,
    text: 'Order History',
    to: isAdmin.value ? '/dashboard/orders' : '/dashboard/client?tab=orders',
  },
  {
    icon: SvgoMenuSetting,
    text: 'Settings',
    to: isAdmin.value ? '/dashboard' : '/dashboard/client?tab=settings',
  },
  // Add more menu items as needed
]);
</script>
