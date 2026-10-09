<template>
  <ClientOnly>
    <ApexChart width="170" :options="chartOptions" :series="series" />
  </ClientOnly>
</template>

<script setup lang="ts">
import { defineAsyncComponent } from 'vue';
import type { ApexOptions } from 'apexcharts';
import { useDashboardWidgetFault } from '~/composables/useDashboardWidgetFault';

const ApexChart = defineAsyncComponent(() => import('vue3-apexcharts'));

defineProps<{
  series: { data: number[] }[];
  chartOptions: ApexOptions;
}>();

useDashboardWidgetFault('returning-customers');
</script>
