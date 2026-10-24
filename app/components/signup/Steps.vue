<!-- eslint-disable vue/no-v-html -->
<template>
  <aside class="flex flex-col bg-[#22242F] shadow-m pt-[30px] px-5 pb-[25px] md:w-[290px] md:pt-10 md:pb-5 lg:w-[400px] lg:px-[30px]">
    <div class="flex items-center justify-between mb-[46px] md:mb-[100px]">
      <Logo class="w-[121px]" />
      <NuxtLink to="/" class="flex" @click="clearFormData">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="w-6 h-6">
          <path
            fill="#fff"
            d="M22.816 10.559a.92.92 0 0 1 .109 1.301.93.93 0 0 1-1.308.108l-.948-.8v8.037a3.087 3.087 0 0 1-3.095 3.08H6.43a3.088 3.088 0 0 1-3.095-3.08v-8.038l-.947.801a.931.931 0 0 1-1.31-.108.92.92 0 0 1 .108-1.301l10.216-8.625a.93.93 0 0 1 1.199 0l10.214 8.625ZM6.431 20.438h1.857v-5.853c0-.851.693-1.54 1.548-1.54h4.333c.855 0 1.548.689 1.548 1.54v5.853h1.857c.685 0 1.238-.551 1.238-1.233V9.6l-6.81-5.75-6.81 5.75v9.605c0 .682.554 1.233 1.239 1.233Zm3.714 0h3.715v-5.545h-3.715v5.545Z"
          />
        </svg>
      </NuxtLink>
    </div>
    <h1 class="text-2xl leading-[1.75] font-semibold text-white mb-[45px] md:mb-[60px] lg:text-[32px] lg:max-w-[256px] lg:mx-auto">
      Start your <br />
      journey with us.
    </h1>
    <div
      class="relative flex items-center justify-between overflow-hidden md:flex-col md:items-start md:gap-[35px] md:mb-10 lg:max-w-[256px] lg:mx-auto lg:mb-20"
    >
      <div v-for="(step, index) in steps" :key="index" class="relative z-10 flex flex-col items-center md:flex-row">
        <div
          class="flex items-center justify-center w-[38px] h-[38px] rounded-full bg-card border-2 mb-2.5 md:w-[42px] md:h-[42px] md:mb-0 md:mr-3"
          :class="[currentStep === index ? 'border-blue-500' : 'border-border md:border-blue-500']"
        >
          <div
            class="flex items-center justify-center rounded-full w-[22px] h-[22px] transition-colors duration-300 md:w-[25px] md:h-[25px]"
            :class="[currentStep === index ? 'bg-blue-600 text-white' : 'text-muted-foreground']"
          >
            <Check v-if="index < currentStep" class="h-4 w-4 text-blue-500" aria-label="Completed" />
            <span v-else class="leading-tight font-medium font-Inter">
              {{ index + 1 }}
            </span>
          </div>
        </div>
        <div>
          <div class="text-xs font-medium text-white md:text-sm md:mb-1" v-html="step.label" />
          <div class="text-sm leading-tight text-white max-md:hidden">
            {{ step.description }}
          </div>
        </div>
      </div>
      <div
        class="absolute flex items-center gap-1.5 overflow-hidden top-[18px] left-1/2 -translate-x-1/2 w-[calc(100%-20px)] md:flex-col md:items-start md:h-[calc(100%-20px)] md:top-1/2 md:-translate-y-1/2 md:left-5 md:translate-x-0"
      >
        <div v-for="dash in 100" :key="dash" class="rounded-full w-1.5 h-[3px] bg-border flex-shrink-0 md:w-[3px] md:h-1.5" />
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { Check } from '@lucide/vue';
import Logo from '@/assets/media/logo-light.svg';
import type { SignupAccountType } from '~~/types';
import { useSignupState } from '@/composables/signup/useSignupState';

defineProps({
  currentStep: {
    type: Number,
    required: true,
  },
});

const { clearFormData } = useSignupState();

const selectedType = useState<SignupAccountType>('signup-account-type');

const steps = computed(() => [
  {
    label: "Account <span class='max-md:hidden'>Type</span>",
    description: 'Choose your account type',
  },
  {
    label: `${selectedType.value === 'personal' ? 'Personal' : 'Business'} <span class='max-md:hidden'>Details</span>`,
    description: `Set up your ${selectedType.value === 'personal' ? 'personal' : 'business'} details`,
  },
  {
    label: "Contact <span class='max-md:hidden'>Details</span>",
    description: 'Set up your contact details',
  },
  {
    label: 'Profile',
    description: 'Set up your profile info',
  },
  {
    label: 'Finished',
    description: 'Your account is ready!',
  },
]);
</script>
