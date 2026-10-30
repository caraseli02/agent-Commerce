<template>
  <main class="flex min-h-screen items-center justify-center bg-background px-4 py-10">
    <div class="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <h1 class="text-2xl font-semibold text-foreground">Create your account</h1>
      <p class="mt-1 text-sm text-muted-foreground">
        Already have one?
        <NuxtLink to="/?signin=true" class="font-medium text-blue-500 hover:underline">Sign in</NuxtLink>
      </p>

      <form novalidate class="mt-6 grid gap-4" aria-label="Create account" @submit.prevent="handleSubmit">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormInput v-model="form.firstName" size="lg" label="First name" :error="errors.firstName" />
          <FormInput v-model="form.lastName" size="lg" label="Last name" :error="errors.lastName" />
        </div>
        <FormInput v-model="form.email" size="lg" type="email" label="Email" placeholder="you@example.com" :error="errors.email" />
        <FormPassword v-model="form.password" size="lg" label="Password" placeholder="At least 8 characters" :error="errors.password" />

        <UiButton type="submit" class="min-h-11 w-full" :disabled="isSubmitting" :aria-busy="isSubmitting">
          {{ isSubmitting ? 'Creating account…' : 'Create account' }}
        </UiButton>
        <p v-if="formError" role="alert" class="rounded bg-rose-600 p-2 text-sm text-white">{{ formError }}</p>
      </form>
    </div>
  </main>
</template>

<script setup lang="ts">
import { useSignup } from '~/composables/useSignup';

definePageMeta({ layout: 'empty' });
useHead({ title: 'Create account' });

type Field = 'firstName' | 'lastName' | 'email' | 'password';

const form = reactive<Record<Field, string>>({ firstName: '', lastName: '', email: '', password: '' });
const errors = reactive<Record<Field, string>>({ firstName: '', lastName: '', email: '', password: '' });
const formError = ref('');
const isSubmitting = ref(false);
const { registerCustomer } = useSignup();

const validate = () => {
  errors.firstName = form.firstName.trim() ? '' : 'First name is required';
  errors.lastName = form.lastName.trim() ? '' : 'Last name is required';
  errors.email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) ? '' : 'Enter a valid email address';
  errors.password = form.password.length >= 8 ? '' : 'Password must be at least 8 characters';
  return !Object.values(errors).some(Boolean);
};

const handleSubmit = async () => {
  if (isSubmitting.value) return;
  formError.value = '';
  if (!validate()) return;

  isSubmitting.value = true;
  try {
    await registerCustomer({ ...form });
    await navigateTo('/dashboard/client?tab=home');
  } catch (error: unknown) {
    const apiError = error as {
      statusCode?: number;
      response?: { status?: number };
      data?: { data?: { fieldErrors?: Record<string, string[]> } };
    };
    const status = apiError.response?.status || apiError.statusCode;
    const fieldErrors = apiError.data?.data?.fieldErrors || {};
    for (const field of Object.keys(errors) as Field[]) errors[field] = fieldErrors[field]?.[0] || '';

    if (status === 409) errors.email = 'An account with this email already exists. Sign in instead.';
    else if (status === 429) formError.value = 'Too many attempts. Please wait a few minutes and try again.';
    else if (status === 400) return;
    else if (!status && error instanceof Error && error.message.startsWith('Account created')) {
      formError.value = 'Your account was created, but we could not sign you in. Please sign in.';
    } else formError.value = 'We could not create your account right now. Please try again.';
  } finally {
    isSubmitting.value = false;
  }
};
</script>
