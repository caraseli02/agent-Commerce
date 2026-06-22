<template>
  <div class="flex min-w-[140px] items-center">
    <span :class="item?.color" class="h-3 w-3 mr-2 rounded-full text-xs text-white flex justify-center items-center" />
    {{ item?.label }}
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  val: number;
  options: { label: string; value: number; color: string }[];
}>();

const item = computed(() => {
  return props.options.find((option) => option.value === props.val);
});
</script>
