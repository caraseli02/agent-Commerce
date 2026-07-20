<template>
  <div class="relative min-h-screen md:w-full">
    <div class="container flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <div class="max-w-xl text-center">
        <h1 class="text-xl font-semibold text-foreground">Stripe checkout disabled in demo</h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Online card payment is disabled in this portfolio preview. Use the demo checkout buttons on the order summary instead of this
          payment session.
        </p>
      </div>
      <div class="flex flex-wrap items-center justify-center gap-2">
        <UiButton variant="default" @click="goToOrderSummary"> Back to order summary </UiButton>
        <UiButton variant="outline" @click="goHome"> Back home </UiButton>
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
