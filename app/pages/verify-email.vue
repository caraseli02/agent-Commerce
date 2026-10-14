<template>
  <div class="py-20 md:py-[120px] lg:py-[150px] xl:pb-[276px]">
    <div class="container max-w-[406px]">
      <h1 class="text-xl leading-[1.4] font-semibold text-center mb-10">Verify your email</h1>
      <div class="grid gap-4 mt-4">
        <UiButton class="h-12" @click="verifyEmail()"> Verify </UiButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { toast } from '~/components/ui/toast';
import { verifyEmail as verifyEmailRequest } from '~/composables/api/auth';

const route = useRoute();
const router = useRouter();

const verifyEmail = async () => {
  if (!route.query.oobCode) {
    return false;
  }

  const response = (await verifyEmailRequest(route.query.oobCode as string)) as { status: string };

  if (response.status !== 'success') {
    toast({
      description: 'For some reason, your email verification failed. Please try again.',
      title: 'Email verification failed',
      variant: 'destructive',
    });
    await router.push('/');
    return;
  }

  toast({
    description: 'Your email has been verified successfully.',
    title: 'Email verified',
    variant: 'success',
  });
  await router.push('/');
  return;
};

useHead({
  title: 'Verify Email',
});
</script>
