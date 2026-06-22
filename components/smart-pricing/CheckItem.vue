<script setup lang="ts">
import { SquarePenIcon, Trash2Icon } from 'lucide-vue-next';

defineProps<{
  item: {
    label: string;
    value: string | string[];
    selected: boolean;
  };
}>();

const emit = defineEmits<{
  updateSelected: [val: boolean];
  deleteItem: [];
  editItem: [];
}>();
</script>

<template>
  <div
    class="w-full max-w-[358px] md:max-w-none md:w-fit h-16 bg-light-200 flex justify-between md:gap-10 items-center p-3 rounded-xl"
    :class="{ 'ring-2 ring-blue-500': item.selected }"
  >
    <section class="flex gap-2 items-center">
      <UiCheckbox :checked="item.selected" class="border-grey-600 w-5 h-5" @update:checked="emit('updateSelected', $event)" />
      <div class="flex items-center justify-between gap-2 bg-white border border-grey-300 px-3 py-1 min-w-[148px] w-full h-9 rounded-lg">
        <span class="font-medium text-sm min-w-12">{{ item.label }}</span>
        <UiSeparator class="w-[1px] h-5" />
        <div class="max-w-[115px] md:max-w-none overflow-hidden flex flex-nowrap gap-1">
          <template v-if="Array.isArray(item.value)">
            <UiBadge
              v-for="badge in item.value"
              :key="badge"
              variant="secondary"
              class="text-xs rounded bg-light-300 px-1 font-normal min-w-[60px] max-h-[22px]"
            >
              <span class="w-full text-center">{{ badge }}</span>
            </UiBadge>
          </template>
          <UiBadge v-else variant="secondary" class="text-xs rounded bg-light-300 px-1 font-normal">
            {{ item.value }}
          </UiBadge>
        </div>
      </div>
    </section>
    <div class="flex gap-2">
      <UiButton variant="ghost" size="icon">
        <SquarePenIcon class="w-5 h-5 text-slate-500" @click="emit('editItem')" />
      </UiButton>
      <UiButton variant="ghost" size="icon">
        <Trash2Icon class="w-5 h-5 text-slate-500" @click="emit('deleteItem')" />
      </UiButton>
    </div>
  </div>
</template>

<style scoped></style>
