<template>
  <div class="pt-[30px] pb-10 md:flex-1 lg:pt-[60px]">
    <div class="container h-full">
      <div class="flex flex-col h-full md:max-w-[410px] md:mx-auto">
        <div class="flex items-center mb-5">
          <div class="font-medium mr-2 md:text-xl">Personal Details</div>
          <QuestionIcon class="w-5 h-5 text-gray-500" />
        </div>
        <div class="mb-[30px]">
          <div class="grid grid-cols-1 gap-[15px] mb-10">
            <FormInput v-model="details.firstName.value" :error="details.firstName.error" label="First Name" placeholder="First Name" />
            <FormInput v-model="details.lastName.value" :error="details.lastName.error" label="Last Name" placeholder="Last Name" />
            <FormSelect
              v-model="details.country.value"
              :error="details.country.error"
              :options="countries"
              label="Country"
              placeholder="Select Country"
              search
              class="relative z-20"
            />
            <FormSelect
              v-model="details.region.value"
              :error="details.region.error"
              :options="regions"
              :disabled="regions.length === 0"
              label="County/Region"
              placeholder="Select County/Region"
              search
              class="relative z-10"
            />
            <FormInput v-model="details.city.value" :error="details.city.error" label="City" placeholder="City" />
            <FormInput v-model="details.postcode.value" :error="details.postcode.error" label="Postcode" placeholder="Postcode" />
            <FormInput
              v-model="details.addressLine1.value"
              :error="details.addressLine1.error"
              label="Address Line 1"
              placeholder="Address Line 1"
            />
            <FormInput
              v-model="details.addressLine2.value"
              :error="details.addressLine2.error"
              label="Address Line 2"
              placeholder="Address Line 2"
            />
          </div>
          <div class="flex items-center justify-between">
            <button class="flex items-center rounded bg-gray-100 px-[22px] py-[11px] text-slate-500" @click="$emit('back')">
              <ChevronRightIcon class="w-3 h-3 mr-2 rotate-180" />
              <span class="text-sm font-medium">Back</span>
            </button>
            <button class="flex items-center rounded bg-blue-500 px-[22px] py-[11px] text-white" @click="$emit('continue')">
              <span class="text-sm font-medium mr-2">Continue</span>
              <ChevronRightIcon class="w-3 h-3" />
            </button>
          </div>
        </div>
        <div class="text-xs text-center text-slate-500 mt-auto">
          For assistance please contact
          <a href="mailto:support@demo.app" class="text-blue-500">support@demo.app</a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FormSelectOption, SignupPersonalDetails } from '~~/types';
import QuestionIcon from '@/assets/icons/question-circle.svg';
import ChevronRightIcon from '@/assets/icons/chevron-right.svg';
import { countries } from '@/data/countries';

defineEmits(['continue', 'back']);

const details = useState<SignupPersonalDetails>('signup-personal-details');

const regions = ref<FormSelectOption[]>([]);

watch(details.value.country, (newVal) => {
  if (newVal?.value) {
    details.value.region = {
      value: undefined,
      error: '',
    };
    regions.value =
      countries
        .find((e) => e.label === newVal.value?.label)
        ?.regions.map((e) => {
          return {
            label: e.name,
            value: e.name,
          };
        }) || [];
  }
});
</script>
