<template>
  <div class="pt-[30px] pb-10 md:flex-1 lg:pt-[60px]">
    <div class="container h-full">
      <div class="flex flex-col h-full md:max-w-[410px] md:mx-auto">
        <div class="flex items-center mb-5">
          <div class="font-medium mr-2 md:text-xl">Business Details</div>
          <QuestionIcon class="w-5 h-5 text-muted-foreground" />
        </div>
        <div class="mb-[30px]">
          <div class="grid grid-cols-1 gap-[15px] mb-6">
            <BuyerFormInput
              v-model="details.fullCompanyName.value"
              :error="details.fullCompanyName.error"
              label="Full Company Name"
              placeholder="Your Full Company Name"
            />
            <BuyerFormInput
              v-model="details.companyRegistrationNumber.value"
              :error="details.companyRegistrationNumber.error"
              label="Company Registration Number"
              placeholder="Company Registration Number"
            />
            <FormSelect
              v-model="details.country.value.value"
              :error="details.country.value.error"
              :options="countries"
              label="Country"
              placeholder="Select Country"
              search
              class="relative z-20"
            />
            <FormSelect
              v-model="details.region.value.value"
              :error="details.region.value.error"
              :options="regions"
              :disabled="regions.length === 0"
              label="County/Region"
              placeholder="Select County/Region"
              search
              class="relative z-10"
            />
          </div>
          <div class="grid grid-cols-1 gap-[15px] mb-10">
            <BuyerFormInput v-model="details.city.value" :error="details.city.error" label="City" placeholder="City" />
            <BuyerFormInput v-model="details.postcode.value" :error="details.postcode.error" label="Postcode" placeholder="Postcode" />
            <BuyerFormInput
              v-model="details.addressLine1.value"
              :error="details.addressLine1.error"
              label="Address Line 1"
              placeholder="Address Line 1"
            />
            <BuyerFormInput
              v-model="details.addressLine2.value"
              :error="details.addressLine2.error"
              label="Address Line 2"
              placeholder="Address Line 2"
            />
            <div class="flex items-center space-x-2">
              <UiCheckbox id="vat show" :checked="vatPayer" @update:checked="vatPayer = $event" />
              <label
                for="vat show"
                class="text-muted-foreground text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Is VAT payer
              </label>
            </div>
            <BuyerFormInput
              v-if="vatPayer && details.vatNumber"
              v-model="details.vatNumber.value"
              :error="details.vatNumber.error"
              label="VAT Number"
              placeholder="VAT Number"
            />
          </div>
          <div class="flex items-center justify-between">
            <button class="flex items-center rounded bg-muted px-[22px] py-[11px] text-muted-foreground" @click="$emit('back')">
              <ChevronRightIcon class="w-3 h-3 mr-2 rotate-180" />
              <span class="text-sm font-medium">Back</span>
            </button>
            <button class="flex items-center rounded bg-blue-600 px-[22px] py-[11px] text-white" @click="$emit('continue')">
              <span class="text-sm font-medium mr-2">Continue</span>
              <ChevronRightIcon class="w-3 h-3" />
            </button>
          </div>
        </div>
        <div class="text-xs text-center text-muted-foreground mt-auto">
          For assistance please contact
          <a href="mailto:support@demo.app" class="text-blue-500">support@demo.app</a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import QuestionIcon from '@/assets/icons/question-circle.svg';
import ChevronRightIcon from '@/assets/icons/chevron-right.svg';
import type { FormSelectOption, SignupBusinessDetails } from '~~/types';
import { useCountries } from '~/composables/useCountries';

const { countries } = useCountries();

defineProps({
  selectedType: {
    type: String,
    required: true,
  },
});

defineEmits(['continue', 'back']);

const details = useState<SignupBusinessDetails>('signup-business-details');

const regions = ref<FormSelectOption[]>([]);

watch(details.value.country, (newVal) => {
  if (newVal?.value) {
    details.value.region = {
      value: {
        value: undefined,
        error: '',
      },
      label: '',
      icon: '',
    };
    regions.value =
      countries.value
        .find((e) => e.label === newVal.value.value?.label)
        ?.regions.map((e) => {
          return {
            label: e.name,
            value: e.name,
          };
        }) || [];
  }
});

const vatPayer = defineModel<boolean>({ default: false });
</script>
