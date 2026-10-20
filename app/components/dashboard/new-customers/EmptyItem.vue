<template>
  <div class="flex items-center justify-between w-full">
    <div class="flex items-center w-[calc(100%-40px)]">
      <div class="relative flex items-center justify-center rounded-full overflow-hidden w-10 h-10 flex-shrink-0 bg-gray-100 mr-3">
        <SkeletonLoader v-if="loading" type="circle" class="w-full h-full" />
        <UserIcon v-else class="w-7 h-7 text-muted-foreground" />
      </div>
      <div :class="[loading ? 'w-full' : 'truncate']">
        <SkeletonLoader v-if="loading" class="block w-2/3 h-4 mb-2" />
        <div v-else class="text-sm leading-[1.43] font-semibold truncate text-muted-foreground">No data available</div>
        <SkeletonLoader v-if="loading" class="w-full h-4" />
        <div v-else class="text-xs leading-[1.67] text-muted-foreground truncate">No data available</div>
      </div>
    </div>
    <div v-if="!loading" class="flex text-gray-100">
      <MoreVerticalIcon class="w-7 h-7" />
    </div>
  </div>
</template>

<script setup lang="ts">
import UserIcon from '@/assets/icons/dashboard/user.svg';
import MoreVerticalIcon from '@/assets/icons/dashboard/more-vertical.svg';

defineProps({
  loading: {
    type: Boolean,
    required: false,
    default: false,
  },
});
</script>
