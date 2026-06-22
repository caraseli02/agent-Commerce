<script setup lang="ts">
import { storeToRefs } from 'pinia';
import Details from './Details.vue';
import Shipping from './Shipping.vue';
import Billing from './Billing.vue';
import Payments from './Payments.vue';
import Credit from './Credit.vue';
import Security from './Security.vue';
import Alerts from './Alerts.vue';
import Marketing from './Marketing.vue';
import { useAuthStore } from '~/store/authStore';

const route = useRoute();
const authStore = useAuthStore();
const { getUserDetails } = storeToRefs(authStore);

onMounted(() => {
  // check if the query has id to scroll in to view
  setTimeout(() => {
    const scrollToId = route.query.scrollTo;
    if (scrollToId) {
      const element = document.getElementById(scrollToId as string);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      }
    }
  }, 100);
});
</script>

<template>
  <template v-if="getUserDetails">
    <Details />
    <Shipping />
    <Billing />
    <Payments />
    <Credit />
    <Security />
    <Alerts />
    <Marketing />
  </template>
  <div v-else class="bg-white rounded-xl shadow-xs p-6 text-sm text-slate-500">Loading settings...</div>
</template>

<style scoped lang="postcss"></style>
