<template>
  <div class="min-w-[171px]">
    {{ formattedDate }}
  </div>
</template>

<script setup lang="ts">
import { format } from 'date-fns';

const props = defineProps<{
  inputDateString: string;
}>();

const formattedDate = computed(() => {
  return format(new Date(props.inputDateString), 'dd MMMM yyyy HH:mm');
});
</script>
