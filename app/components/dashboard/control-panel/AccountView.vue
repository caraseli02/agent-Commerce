<template>
  <div>
    <div class="mb-9 md:flex md:items-center md:justify-between">
      <h2 class="text-xl leading-[1.4] font-semibold max-md:mb-9">Account Details</h2>
      <div class="grid grid-cols-2 gap-3 md:grid-cols-[repeat(2,auto)]">
        <UiButton
          variant="secondary"
          class="h-auto flex items-center justify-center w-full text-left px-4 py-2 rounded-md transition-colors duration-300 bg-[#F2F2F2] text-slate-500 hover:text-white hover:bg-blue-500 xl:px-6"
          :class="[isEditing ? 'text-white bg-blue-500' : '']"
          @click="isEditing = !isEditing"
        >
          <EditIcon class="w-5 h-5 mr-2 text-current xl:w-6 xl:h-6" />
          <span class="text-sm leading-[1.42857] font-medium"> Edit </span>
        </UiButton>
        <UiButton
          variant="secondary"
          class="h-auto flex items-center justify-center w-full text-left px-4 py-2 rounded-md transition-colors duration-300 bg-[#F2F2F2] text-slate-500 hover:text-white hover:bg-blue-500 xl:px-6"
        >
          <CopyIcon class="w-5 h-5 mr-2 text-current xl:w-6 xl:h-6" />
          <span class="text-sm leading-[1.42857] font-medium"> Copy Details </span>
        </UiButton>
      </div>
    </div>
    <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-x-9">
      <FormInput
        v-model="form.firstName.value"
        :error="form.firstName.error"
        :disabled="!isEditing"
        :show-disabled-styles="false"
        label="Name"
        size="lg"
        placeholder="Name"
      />
      <FormInput
        v-model="form.lastName.value"
        :error="form.lastName.error"
        :disabled="!isEditing"
        :show-disabled-styles="false"
        label="Name"
        size="lg"
        placeholder="Name"
      />
      <FormSelect
        v-model="form.country.value"
        :error="form.country.error"
        :options="countries"
        :disabled="!isEditing"
        :show-disabled-styles="false"
        label="Country"
        placeholder="United States"
        search
        size="lg"
        class="relative z-20"
      />
      <FormSelect
        v-model="form.region.value"
        :error="form.region.error"
        :options="regions"
        :disabled="!isEditing"
        :show-disabled-styles="false"
        label="County/Region"
        placeholder=""
        search
        size="lg"
        class="relative z-10"
      />
      <FormInput
        v-model="form.city.value"
        :error="form.city.error"
        :disabled="!isEditing"
        :show-disabled-styles="false"
        label="City"
        size="lg"
        placeholder="Georgia"
      />
      <FormInput
        v-model="form.name1.value"
        :error="form.name1.error"
        :disabled="!isEditing"
        :show-disabled-styles="false"
        label="Address Line 1"
        size="lg"
        placeholder="5073 Mark Brown Rd"
      />
      <FormInput
        v-model="form.name2.value"
        :error="form.name2.error"
        :disabled="!isEditing"
        :show-disabled-styles="false"
        label="Address Line 2"
        size="lg"
        placeholder="NE Dalton"
      />
      <FormInput
        v-model="form.postcode.value"
        :error="form.postcode.error"
        :disabled="!isEditing"
        :show-disabled-styles="false"
        label="Postcode"
        size="lg"
        placeholder=""
      />
      <FormInput
        v-model="form.phone.value"
        :error="form.phone.error"
        :disabled="!isEditing"
        :show-disabled-styles="false"
        label="Phone Number"
        size="lg"
        placeholder="+1 (706) 275-0767"
      />
      <FormInput
        v-model="form.email.value"
        :error="form.email.error"
        :disabled="!isEditing"
        :show-disabled-styles="false"
        label="Email"
        placeholder="madalina.dobrovolski@company.com"
        type="email"
        size="lg"
      />
    </div>
    <div v-if="isEditing" class="grid grid-cols-[auto_1fr] gap-4 mt-9 xl:w-1/2 xl:ml-auto xl:pl-4">
      <UiButton
        variant="secondary"
        class="h-auto flex items-center justify-center w-full text-left px-[31px] py-2 rounded-lg transition-colors duration-300 bg-[#F2F2F2] text-slate-500 md:px-[91px] xl:px-[61px]"
        @click="isEditing = false"
      >
        <span class="leading-[1.75] font-medium"> Cancel </span>
      </UiButton>
      <UiButton
        class="h-auto flex items-center justify-center w-full text-left px-[31px] py-2 rounded-lg transition-colors duration-300 bg-blue-500 text-white"
        @click="
          updateAccountDetails();
          isEditing = false;
        "
      >
        <span class="leading-[1.75] font-medium"> Save </span>
      </UiButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import EditIcon from '@/assets/icons/dashboard/edit.svg';
import CopyIcon from '@/assets/icons/dashboard/copy.svg';
import { useCountries } from '~/composables/useCountries';
import type { FormSelectOption } from '~~/types';
import type { AddressInterface, ContactDetails, PersonalDetails, UserInterface } from '~~/types/auth/user-interface';
import { getRegionByCountry } from '~~/helpers/form.helper';
import { useControlPanel } from '~/composables/useControlPanel';

const { updateAccountDetails: updateControlPanelAccountDetails } = useControlPanel();

const { countries, load: loadCountries } = useCountries();

const props = defineProps({
  id: {
    type: String,
    required: true,
  },
  account: {
    type: Object as PropType<UserInterface>,
    required: true,
  },
});

const form = ref({
  firstName: {
    value: '',
    error: '',
  },
  lastName: {
    value: '',
    error: '',
  },
  country: {
    value: {
      value: '',
      label: '',
      icon: '',
    },
    error: '',
  },
  region: {
    value: {
      value: '',
      label: '',
    },
    error: '',
  },
  city: {
    value: '',
    error: '',
  },
  name1: {
    value: '',
    error: '',
  },
  name2: {
    value: '',
    error: '',
  },
  postcode: {
    value: '',
    error: '',
  },
  phone: {
    value: '',
    error: '',
  },
  email: {
    value: '',
    error: '',
  },
});
const regions = ref<FormSelectOption[]>([]);

const getCountryRegion = async (country: unknown, region: unknown) => {
  //
  const countryRegionObj = getRegionByCountry(countries.value, country, region);

  regions.value = countryRegionObj?.regions || [];
  form.value.country.value = countryRegionObj?.country || { label: '', value: '', icon: '' };
  form.value.region.value = countryRegionObj?.region || { label: '', value: '' };
};
const getAccountDetails = async () => {
  if (!props.account?.personalDetails || !props.account?.contactDetails) {
    return;
  }

  form.value.city.value = props.account.personalDetails.address.city;
  form.value.firstName.value = props.account.personalDetails.firstName;
  form.value.lastName.value = props.account.personalDetails.lastName;
  form.value.name1.value = props.account.personalDetails.address.name1;
  form.value.name2.value = props.account.personalDetails.address.name2 || '';
  form.value.postcode.value = props.account.personalDetails.address.postcode;
  form.value.phone.value = props.account.contactDetails.phone;
  form.value.email.value = props.account.contactDetails.email;

  await loadCountries();
  getCountryRegion(props.account.personalDetails.address.country, props.account.personalDetails.address.region);
};
await getAccountDetails();

const isEditing = ref(false);

watch(
  () => form.value.country,
  (newVal) => {
    if (newVal?.value && typeof newVal.value === 'object' && 'value' in newVal.value) {
      form.value.region = {
        value: { label: '', value: '' },
        error: '',
      };
      regions.value =
        countries.value
          .find((e) => e.value === newVal.value.value)
          ?.regions.map((e) => {
            return {
              label: e.name,
              value: e.name,
            };
          }) || [];
    }
  },
);

const updateAccountDetails = async () => {
  const newAddress = {} as AddressInterface;

  newAddress.country = form.value.country.value.value;
  newAddress.region = form.value.region.value.label;
  newAddress.city = form.value.city.value;
  newAddress.name1 = form.value.name1.value;
  newAddress.name2 = form.value.name2?.value || '';
  newAddress.postcode = form.value.postcode?.value;

  const payload = {
    personalDetails: {} as PersonalDetails,
    contactDetails: {} as ContactDetails,
  };
  payload.personalDetails.firstName = form.value.firstName.value;
  payload.personalDetails.lastName = form.value.lastName.value;
  payload.contactDetails = { ...props.account?.contactDetails };
  payload.contactDetails.email = form.value.email.value;
  payload.contactDetails.phone = form.value.phone.value;
  payload.personalDetails.shippingAddress = props.account.personalDetails?.shippingAddress || [];
  payload.personalDetails.address = newAddress;
  if (!props.id || props.account.accountType === null || typeof props.account.accountType === 'undefined') {
    return;
  }
  await updateControlPanelAccountDetails(props.id, payload as UserInterface, props.account.accountType);
};
</script>
