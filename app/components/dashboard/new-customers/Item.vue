<template>
  <div class="flex items-center justify-between w-full">
    <NuxtLink :to="`/dashboard/customers/${item.firebaseId}`" class="group/link flex items-center w-[calc(70%)] sm:w-[calc(80%)]">
      <div
        class="relative flex items-center justify-center rounded-full overflow-hidden w-10 h-10 flex-shrink-0 mr-3"
        :class="[
          !item.avatar ? 'bg-gray-100' : '',
          loading
            ? ''
            : 'after:absolute after:top-0 after:left-0 after:w-full after:h-full after:rounded-full after:border-2 after:border-primary after:opacity-0 after:transition-opacity after:duration-200 group-hover/link:after:opacity-100',
        ]"
      >
        <SkeletonLoader v-if="loading" type="circle" class="w-full h-full" />
        <template v-else>
          <!-- Bundled asset URLs must bypass Nuxt Image's runtime IPX provider. -->
          <!-- eslint-disable-next-line vue/html-self-closing -->
          <img v-if="item.avatar" :src="item.avatar" :alt="`${item.name}`" class="w-full h-full rounded-full object-cover" loading="lazy" />
          <UserIcon v-else class="w-7 h-7 text-muted-foreground" />
        </template>
      </div>
      <div :class="[loading ? 'w-full' : 'truncate']">
        <SkeletonLoader v-if="loading" class="block w-2/3 h-4 mb-2" />
        <div v-else class="text-sm leading-[1.43] font-semibold truncate transition-colors duration-200 group-hover/link:text-primary">
          {{ `${item.name}` }}
        </div>
        <SkeletonLoader v-if="loading" class="w-full h-4" />
        <div v-else class="text-xs leading-[1.67] text-muted-foreground truncate">{{ item.email }}</div>
      </div>
    </NuxtLink>
    <div v-if="!loading" class="relative flex">
      <DemoTooltip v-if="!item.active" theme="black" :position="'top'" class="self-start mx-3">
        <LockKeyholeIcon class="w-4 h-4 text-muted-foreground transition-colors duration-200 hover:text-primary" />
        <template #content>
          <span class="capitalize">Account Locked</span>
        </template>
      </DemoTooltip>

      <UiButton
        variant="ghost"
        size="icon"
        class="flex h-auto w-auto text-[#9296AA] transition-colors duration-200 hover:text-primary"
        aria-label="Open customer menu"
        @click="showOptions = !showOptions"
      >
        <MoreVerticalIcon class="w-6 h-6" />
      </UiButton>
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
    <!-- eslint-disable vue/no-mutating-props -->
    <DashboardDeactivateUserModal
      v-if="showDeactivatingModal"
      :user="item"
      @close="showDeactivatingModal = false"
      @change-lock-status="item.active = !item.active"
    />
    <!-- eslint-enable vue/no-mutating-props -->
  </Teleport>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import { LockKeyholeIcon } from '@lucide/vue';
import MoreVerticalIcon from '@/assets/icons/dashboard/more-vertical.svg';
import UserIcon from '@/assets/icons/dashboard/user.svg';
import DemoTooltip from '~/components/global/DemoTooltip.vue';
import type { DashboardCustomerTableItem } from '~~/types';
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
