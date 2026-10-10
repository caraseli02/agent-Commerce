<template>
  <div class="flex min-w-[140px] items-center">
    <span :class="statusColor" class="h-3 w-3 mr-2 rounded-full text-xs text-white flex justify-center items-center" />
    {{ status }}
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  status: string;
  options: Record<string, string>;
}>();

const statusColor = computed(() => {
  return props.options[props.status];
});
</script>
