<template>
  <div class="container mb-5 md:mb-6">
    <h1 class="break-words text-xl font-semibold text-foreground md:text-2xl">{{ title }}</h1>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  keyword: string;
}>();

const title = computed(() => {
  const keyword = props.keyword.trim();
  return keyword ? `Search results for “${keyword}”` : 'Browse products';
});
</script>
