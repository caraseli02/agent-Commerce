<template>
  <div class="relative min-h-[50vh] md:w-full">
    <div class="mx-auto flex w-full max-w-xl flex-col items-center justify-center gap-4 p-4 text-center md:p-[30px] lg:pt-10">
      <div class="text-xl font-semibold">Card setup disabled in demo</div>
      <p class="text-sm text-slate-500">
        Stripe card setup is not available in this portfolio preview build. Use the enabled navigation below to return to account settings.
      </p>
      <div class="flex flex-wrap items-center justify-center gap-2">
        <UiButton variant="default" @click="goToSettings"> Back to settings </UiButton>
        <UiButton variant="outline" @click="goHome"> Back home </UiButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const router = useRouter();

const goHome = async () => {
  await router.push('/');
};

const goToSettings = async () => {
  await router.push('/dashboard/client?tab=settings');
};
</script>
