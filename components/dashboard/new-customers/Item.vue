<template>
  <div class="flex items-center justify-between w-full">
    <NuxtLink :to="`/dashboard/customers/${item.firebaseId}`" class="group/link flex items-center w-[calc(70%)] sm:w-[calc(80%)]">
      <div
        class="relative flex items-center justify-center rounded-full overflow-hidden w-10 h-10 flex-shrink-0 mr-3"
        :class="[
          !item.avatar ? 'bg-gray-100' : '',
          loading
            ? ''
            : 'after:absolute after:top-0 after:left-0 after:w-full after:h-full after:rounded-full after:border-2 after:border-blue-500 after:opacity-0 after:transition-opacity after:duration-300 group-hover/link:after:opacity-100',
        ]"
      >
        <SkeletonLoader v-if="loading" type="circle" class="w-full h-full" />
        <template v-else>
          <img v-if="item.avatar" :src="item.avatar" :alt="`${item.name}`" class="w-full h-full rounded-full object-cover" />
          <UserIcon v-else class="w-7 h-7 text-gray-500" />
        </template>
      </div>
      <div :class="[loading ? 'w-full' : 'truncate']">
        <SkeletonLoader v-if="loading" class="block w-2/3 h-4 mb-2" />
        <div v-else class="text-sm leading-[1.43] font-semibold truncate transition-colors duration-300 group-hover/link:text-blue-500">
          {{ `${item.name}` }}
        </div>
        <SkeletonLoader v-if="loading" class="w-full h-4" />
        <div v-else class="text-xs leading-[1.67] text-slate-500 truncate">{{ item.email }}</div>
      </div>
    </NuxtLink>
    <div v-if="!loading" class="relative flex">
      <DemoTooltip v-if="!item.active" theme="black" :position="'top'" class="self-start mx-3">
        <LockKeyholeIcon class="w-4 h-4 text-slate-500 transition-colors duration-300 hover:text-blue-500" />
        <template #content>
          <span class="capitalize">Account Locked</span>
        </template>
      </DemoTooltip>

      <button class="flex text-[#9296AA] transition-colors duration-300 hover:text-blue-500" @click="showOptions = !showOptions">
        <MoreVerticalIcon class="w-6 h-6" />
      </button>
      <Transition name="fade-bottom">
        <ThreeDotMenu
          v-if="showOptions"
          v-click-outside="() => (showOptions = false)"
          :index="index"
          :dropdown-top="30"
          :dropdown-left="25"
          :profile-button="true"
          :profile="item"
          :profile-text="'Profile'"
          :document-button="true"
          :document-text="'Orders'"
          :settings-button="true"
          :settings-text="'Settings'"
          :deactivate-button="true"
          :deactivate-text="item.active ? 'Lock Account' : 'Unlock Account'"
          :trash-button="true"
          :trash-text="'Delete Account'"
          @profile-clicked="showOptions = false"
          @document-clicked="showOptions = false"
          @settings-clicked="showOptions = false"
          @deactivate-clicked="
            showDeactivatingModal = true;
            showOptions = false;
          "
          @trash-clicked="showOptions = false"
        />
      </Transition>
    </div>
  </div>
  <Teleport to="body">
    <Transition name="fade">
      <!-- eslint-disable vue/no-mutating-props -->
      <DashboardDeactivateUserModal
        v-if="showDeactivatingModal"
        :user="item"
        @close="showDeactivatingModal = false"
        @change-lock-status="item.active = !item.active"
      />
      <!-- eslint-enable vue/no-mutating-props -->
    </Transition>
    <div
      class="fixed z-50 top-0 left-0 w-full h-full bg-[#2F3241]/10 transition-all duration-300 cursor-pointer"
      :class="[showDeactivatingModal ? 'backdrop-blur-[7.5px]' : 'backdrop-blur-0 opacity-0 pointer-events-none']"
      @click="showDeactivatingModal = false"
    />
  </Teleport>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import { LockKeyholeIcon } from 'lucide-vue-next';
import MoreVerticalIcon from '@/assets/icons/dashboard/more-vertical.svg';
import UserIcon from '@/assets/icons/dashboard/user.svg';
import DemoTooltip from '~/components/global/DemoTooltip.vue';
import type { DashboardCustomerTableItem } from '~/types';
import ThreeDotMenu from '~/components/shared/tables/micro/row-items/ThreeDotMenu.vue';

defineProps({
  item: {
    type: Object as PropType<DashboardCustomerTableItem>,
    required: true,
  },
  type: {
    type: String as PropType<'default' | 'detailed' | 'landing'>,
    required: false,
    default: 'default',
  },
  loading: {
    type: Boolean,
    required: false,
    default: false,
  },
  index: {
    type: Number,
    required: true,
  },
});

const showOptions = ref(false);
const showDeactivatingModal = ref(false);
</script>
