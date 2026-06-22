<script setup lang="ts">
import { InfoIcon, SettingsIcon } from 'lucide-vue-next';
import { computed } from 'vue';
import { PaymentTypeEnum } from '~/types';
import type { BankInfo, CardInfo } from '~/types';
import type { CustomerCreditInterface } from '~/types/auth/account-settings';

const props = defineProps<{
  customerDetails: {
    title: string;
    name: string;
    email: string;
    phone: string;
  };
  paymentMethod: {
    type: PaymentTypeEnum;
    info: CardInfo | CustomerCreditInterface | BankInfo;
  };
  hasMixedItems: boolean;
}>();

const isCardInfo = computed(() => props.paymentMethod.type === PaymentTypeEnum.Card && (props.paymentMethod.info as CardInfo).provider);
const isCreditInfo = computed(
  () => props.paymentMethod.type === PaymentTypeEnum.Credit && (props.paymentMethod.info as CustomerCreditInterface).limit
);
const isBankInfo = computed(() => props.paymentMethod.type === PaymentTypeEnum.Bank && (props.paymentMethod.info as BankInfo).text);
</script>

<template>
  <div class="flex gap-9 max-md:flex-col max-md:gap-0">
    <div class="flex flex-col w-6/12 max-md:ml-0 max-md:w-full">
      <div class="flex flex-col grow text-sm font-semibold leading-5 text-neutral-700 max-md:mt-9 max-md:max-w-full">
        <h2 class="text-base leading-7 max-md:max-w-full">
          {{ props.customerDetails.title }}
        </h2>
        <p class="mt-9 leading-6 max-md:max-w-full">
          {{ props.customerDetails.name }}
        </p>
        <p class="mt-2 font-medium text-gray-500 max-md:max-w-full">
          {{ props.customerDetails.email }}
        </p>
        <p class="mt-2 font-medium text-gray-500 max-md:max-w-full">
          {{ props.customerDetails.phone }}
        </p>
      </div>
    </div>
    <div class="flex flex-col w-6/12 max-md:ml-0 max-md:w-full">
      <div class="flex flex-col max-md:mt-9 max-md:max-w-full">
        <h2 class="text-base font-semibold leading-7 text-neutral-700 max-md:max-w-full">Payment Method</h2>

        <div v-if="isCardInfo" class="flex gap-2 self-start pr-8 mt-9 max-md:pr-5">
          <p class="text-sm font-medium leading-6 text-gray-500">
            {{ (props.paymentMethod.info as CardInfo).provider }}
          </p>
          <p class="text-sm font-medium leading-6 text-gray-500">** {{ (props.paymentMethod.info as CardInfo).last4.slice(-2) }}</p>
          <div class="flex justify-center items-center px-1 py-2 bg-violet-100 rounded border border-gray-300 border-solid shadow-xl">
            <img
              loading="lazy"
              src="https://cdn.builder.io/api/v1/image/assets/TEMP/e53ea3231ba188441a6034265f4f0ada066f8bb4f5df5f996b3b263a866e52a9?apiKey=20497529553648aab918fa2d322ece87&"
              alt="Visa logo"
              class="w-6 aspect-[3.03] fill-blue-700"
            />
          </div>
        </div>

        <UiDropdownMenu v-if="isCreditInfo">
          <UiDropdownMenuTrigger class="w-fit flex items-center gap-2 mt-9">
            Credit
            <InfoIcon class="w-4 h-4 stroke-1 text-slate-500" />
          </UiDropdownMenuTrigger>
          <UiDropdownMenuContent class="p-4">
            <article class="flex flex-col w-full max-w-[261px]">
              <header class="flex gap-4 justify-between w-full text-sm font-medium leading-6 text-neutral-800">
                <h2>Credit Info</h2>
                <SettingsIcon class="shrink-0 self-start w-5 aspect-square stroke-1.5" />
              </header>
              <section class="flex gap-5 justify-between mt-4 text-xs leading-5 text-gray-500 rounded-lg">
                <div class="flex flex-col justify-center">
                  <h3>Credit Limit</h3>
                  <p class="mt-1 font-medium text-neutral-800">
                    {{ (props.paymentMethod.info as CustomerCreditInterface).limit }}
                  </p>
                  <h3 class="mt-4">Till Due</h3>
                  <p class="mt-1 font-medium text-neutral-800">
                    {{ (props.paymentMethod.info as CustomerCreditInterface).tillDue }}
                  </p>
                </div>
                <div class="flex flex-col justify-center">
                  <h3>Credit Term</h3>
                  <p class="mt-1 font-medium text-neutral-800">
                    {{ (props.paymentMethod.info as CustomerCreditInterface).term }}
                  </p>
                  <h3 class="mt-4">Total Spent</h3>
                  <p class="mt-1 font-medium text-neutral-800">
                    {{ (props.paymentMethod.info as CustomerCreditInterface).spent }}
                  </p>
                </div>
                <div class="flex flex-col justify-center">
                  <h3>Due Date</h3>
                  <p class="mt-1 font-medium text-neutral-800">
                    {{ (props.paymentMethod.info as CustomerCreditInterface).dueDate }}
                  </p>
                  <h3 class="mt-4">Available</h3>
                  <p class="mt-1 font-medium text-red-500">
                    {{ (props.paymentMethod.info as CustomerCreditInterface).available }}
                  </p>
                </div>
              </section>
            </article>
          </UiDropdownMenuContent>
        </UiDropdownMenu>

        <UiDropdownMenu v-if="isBankInfo">
          <UiDropdownMenuTrigger class="w-fit flex items-center gap-2 mt-9">
            Bank Transfer
            <InfoIcon class="w-4 h-4 stroke-1 text-slate-500" />
          </UiDropdownMenuTrigger>
          <UiDropdownMenuContent class="p-4"> Bank Transfer </UiDropdownMenuContent>
        </UiDropdownMenu>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* your styles here */
</style>
