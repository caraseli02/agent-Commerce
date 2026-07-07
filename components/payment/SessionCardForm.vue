<template>
  <div class="relative min-h-screen bg-slate-50 md:w-full">
    <div class="container flex min-h-[60vh] flex-col items-center justify-center gap-4 py-10">
      <div class="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 class="text-xl font-semibold text-slate-900">Stripe checkout disabled in demo</h1>
        <p class="mt-2 text-sm leading-6 text-slate-600">
          Online payment is disabled in this portfolio preview. Return to order summary to continue the demo checkout flow.
        </p>
        <div class="mt-6 flex flex-wrap items-center justify-center gap-2">
          <UiButton variant="default" @click="goToOrderSummary"> Back to order summary </UiButton>
          <UiButton variant="outline" @click="goHome"> Back home </UiButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const router = useRouter();
const route = useRoute();
const orderId = ref<string>();
onMounted(() => {
  orderId.value = route.query.id as string | undefined;
});

const goHome = async () => {
  await router.push('/');
};

const goToOrderSummary = async () => {
  if (orderId.value) {
    await router.push(`/order-summary/${orderId.value}`);
    return;
  }

  await router.push('/order-summary');
};
</script>
