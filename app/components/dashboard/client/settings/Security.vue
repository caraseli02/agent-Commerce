<script setup lang="ts">
import { toast } from '~/components/ui/toast';
import { storeToRefs } from 'pinia';
import { ref } from 'vue';
import { useAuthStore } from '~/store/authStore';
import { useClientAccount } from '~/composables/useClientAccount';

const { resetPasswordLink: requestResetPasswordLink } = useClientAccount();

const authStore = useAuthStore();
const { getUserDetails } = storeToRefs(authStore);
const email = ref<string>(getUserDetails.value.contactDetails.email);

async function sendResetPasswordLink() {
  if (email.value) {
    try {
      const response = (await requestResetPasswordLink(email.value)) as { status: string; data: unknown };
      if (response.status !== 'success') {
        toast({
          title: 'Error',
          description: 'Something went wrong. Please try again.',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    }
  }
}
</script>

<template>
  <section class="flex flex-col items-start self-stretch p-4 md:p-6 bg-card rounded-xl shadow-l">
    <h2 class="text-xl font-semibold leading-7 text-foreground">Security</h2>
    <p class="mt-4 text-sm leading-5 text-foreground">Send a password reset link.</p>
    <div class="flex flex-col md:flex-row items-end gap-4 self-stretch mt-8 max-md:flex-wrap">
      <div class="flex flex-col gap-1 flex-1 justify-between text-sm leading-5 w-full">
        <UiLabel for="accountEmail" class="text-muted-foreground max-md:max-w-full"> Account Email </UiLabel>
        <UiInput id="accountEmail" v-model:model-value="email" :placeholder="getUserDetails.contactDetails.email" :v-bind="email" />
      </div>
      <UiButton class="w-full md:w-fit" size="lg" @click="sendResetPasswordLink()">
        <svg
          class="shrink-0 my-auto w-6 aspect-square"
          width="24"
          height="25"
          viewBox="0 0 24 25"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M10.4901 2.72957L5.50015 4.59957C4.35015 5.02957 3.41016 6.38955 3.41016 7.61955V15.0495C3.41016 16.2295 4.19017 17.7795 5.14017 18.4895L9.44016 21.6996C10.8502 22.7596 13.1701 22.7596 14.5801 21.6996L18.8802 18.4895C19.8302 17.7795 20.6101 16.2295 20.6101 15.0495V7.61955C20.6101 6.38955 19.6701 5.02957 18.5201 4.59957L13.5302 2.72957C12.6802 2.41957 11.3201 2.41957 10.4901 2.72957Z"
            stroke="white"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M11.9997 11.4204C11.9597 11.4204 11.9097 11.4204 11.8697 11.4204C10.9297 11.3904 10.1797 10.6104 10.1797 9.6604C10.1797 8.6904 10.9697 7.90039 11.9397 7.90039C12.9097 7.90039 13.6997 8.6904 13.6997 9.6604C13.6897 10.6204 12.9397 11.3904 11.9997 11.4204Z"
            stroke="white"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M10.0091 14.2204C9.04906 14.8604 9.04906 15.9103 10.0091 16.5503C11.0991 17.2803 12.8891 17.2803 13.9791 16.5503C14.9391 15.9103 14.9391 14.8604 13.9791 14.2204C12.8991 13.4904 11.1091 13.4904 10.0091 14.2204Z"
            stroke="white"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>

        <span class="ml-2">Send Password Reset</span>
      </UiButton>
    </div>
    <hr class="self-stretch mt-8 w-full border border-grey-100 border-solid stroke-[1px] stroke-gray-200 max-md:max-w-full" />
    <h2 class="mt-8 text-xl font-semibold leading-7 text-foreground">Third party applications logins</h2>
    <p class="mt-4 text-sm leading-5 text-foreground">Connect or disable third party application logins here.</p>
    <UiButton class="min-w-[320px] border-primary mt-8" size="lg" variant="outline">
      <div class="flex gap-2 justify-center">
        <svg class="shrink-0 w-6 aspect-square" width="25" height="25" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g clip-path="url(#clip0_1127_52623)">
            <path
              d="M22.2879 12.7237C22.2879 12.0654 22.2296 11.4404 22.1296 10.832H12.7129V14.5904H18.1046C17.8629 15.8237 17.1546 16.8654 16.1046 17.5737V20.0737H19.3212C21.2046 18.332 22.2879 15.7654 22.2879 12.7237Z"
              fill="#4285F4"
            />
            <path
              d="M12.7121 22.4999C15.4121 22.4999 17.6704 21.5999 19.3204 20.0749L16.1038 17.5749C15.2038 18.1749 14.0621 18.5415 12.7121 18.5415C10.1038 18.5415 7.89544 16.7832 7.10378 14.4082H3.78711V16.9832C5.42878 20.2499 8.80378 22.4999 12.7121 22.4999Z"
              fill="#34A853"
            />
            <path
              d="M7.10456 14.4092C6.89622 13.8092 6.78789 13.1676 6.78789 12.5009C6.78789 11.8342 6.90456 11.1926 7.10456 10.5926V8.01758H3.78789C3.10456 9.36758 2.71289 10.8842 2.71289 12.5009C2.71289 14.1176 3.10456 15.6342 3.78789 16.9842L7.10456 14.4092Z"
              fill="#FBBC05"
            />
            <path
              d="M12.7121 6.45833C14.1871 6.45833 15.5038 6.96667 16.5454 7.95834L19.3954 5.10833C17.6704 3.49167 15.4121 2.5 12.7121 2.5C8.80378 2.5 5.42878 4.75 3.78711 8.01667L7.10378 10.5917C7.89544 8.21667 10.1038 6.45833 12.7121 6.45833Z"
              fill="#EA4335"
            />
          </g>
          <defs>
            <clipPath id="clip0_1127_52623">
              <rect width="20" height="20" fill="white" transform="translate(2.5 2.5)" />
            </clipPath>
          </defs>
        </svg>
        <span>Link Google</span>
      </div>
    </UiButton>
    <p class="mt-4 text-sm leading-5 text-muted-foreground">
      <span class="text-foreground">Linked account:</span>
      madalina.dobrovolski@gmail.com
    </p>
  </section>
</template>

<style scoped></style>
