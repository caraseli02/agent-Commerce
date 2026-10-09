<template>
  <div class="min-w-[171px]">
    {{ formattedDate }}
  </div>
</template>

<script setup lang="ts">
import { formatReviewerDateTime } from '~~/helpers/reviewer-dates';

const props = defineProps<{
  inputDateString: string;
}>();

const formattedDate = computed(() => formatReviewerDateTime(props.inputDateString));
</script>
