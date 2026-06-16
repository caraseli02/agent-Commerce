<template>
  <div class="py-20 md:py-[120px] lg:py-[150px] xl:pt-[200px] xl:pb-[354px]">
    <div class="container max-w-[406px]">
      <h1 class="text-xl leading-[1.4] font-semibold text-center mb-6">
        Forgot your password?
      </h1>
      <p class="text-sm leading-[1.71] text-center mb-10">
        Enter your email address and we will share a link to create a new password.
      </p>
      <form
        class="grid grid-cols-1 gap-6"
        @submit.prevent="handleSubmit"
      >
        <FormInput
          v-model="form.email.value"
          :error="form.email.error"
          type="email"
          label="Email Address"
          placeholder="Enter Your Email Address"
        />
        <button
          class="flex items-center justify-center p-2 rounded-lg bg-blue-500 leading-[1.67] h-12 text-white font-medium"
          @click="resetPassword(form.email.value)"
        >
          Reset Password
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { toast } from '~/components/ui/toast';

const { $api } = useNuxtApp();
const router = useRouter();

const form = ref({
  email: {
    value: '',
    error: '',
  },
});
const handleSubmit = () => {
  void resetPassword(form.value.email.value);
};

const resetPassword = async (email: string) => {
  const response = (await $api.user.resetPasswordLink(email)) as { status: string };

  if (response.status !== 'success') {
    toast({
      title: 'Error',
      description: 'Something went wrong. Please try again.',
      variant: 'destructive',
    });
    await router.push('/');
    return;
  }

  toast({
    title: 'Success',
    description: 'An email link has been sent to your account.',
    variant: 'success',
  });
  await router.push('/');
  return;
};

useHead({
  title: 'Forgot Password',
});
</script>
