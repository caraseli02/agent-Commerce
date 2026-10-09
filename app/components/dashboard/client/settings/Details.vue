<script setup lang="ts">
import { CopyIcon, FilePenLineIcon } from '@lucide/vue';
import { onMounted, ref, watch } from 'vue';
import { useForm } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';
import { z } from 'zod';
import { storeToRefs } from 'pinia';
import { Button } from '@/components/ui/button';
import { useCountries } from '~/composables/useCountries';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useClientAccount } from '~/composables/useClientAccount';
import { useAuthStore } from '~/store/authStore';
import { AccountType } from '~~/types';
import { updateStoreDetails } from '~~/helpers/auth-store.helper';

const { countries, load: loadCountries } = useCountries();
const { saveAccountDetails } = useClientAccount();

const authStore = useAuthStore();
const { getUserDetails } = storeToRefs(authStore);
const hasUserDetails = computed(() => Boolean(getUserDetails.value));
const accountType = computed(() => getUserDetails.value?.accountType ?? AccountType.Business);
const isPersonalAccount = computed(() => accountType.value === AccountType.Personal);
const activeAddress = computed(() =>
  isPersonalAccount.value ? getUserDetails.value?.personalDetails?.address : getUserDetails.value?.companyDetails?.address,
);

interface Country {
  label: string;
  value: string;
  icon: string;
  regions: {
    name: string;
    shortCode: string;
  }[];
}

interface Region {
  label: string;
  value: string;
}

const openEdit = ref(false);
const country = ref<undefined | Country>(undefined);
const region = ref<undefined | Region>(undefined);
const regions = ref<Region[]>([]);

const syncAddressCountry = () => {
  if (!activeAddress.value?.country || countries.value.length === 0) {
    return;
  }

  const selectedCountry = countries.value.find((c) => c.value === activeAddress.value?.country) as Country | undefined;
  country.value = selectedCountry;
  region.value = findRegionByName(selectedCountry?.regions, activeAddress.value?.region);
  regions.value = selectedCountry?.regions.map((e) => ({ label: e.name, value: e.name })) || [];
};

onMounted(async () => {
  await loadCountries();
  syncAddressCountry();
});

watch(countries, () => {
  syncAddressCountry();
});

const findRegionByName = (countryRegions: Country['regions'] | undefined, name: string | undefined) => {
  const matchedRegion = countryRegions?.find((item) => item.name === name);
  if (matchedRegion) {
    return {
      label: matchedRegion.name,
      value: matchedRegion.shortCode,
    };
  }
  return undefined;
};

const baseSchema = z.object({
  country: z
    .string({
      required_error: 'Country is required',
    })
    .min(1)
    .default(activeAddress.value?.country || ''),
  county: z
    .string({
      required_error: 'County/Region is required',
    })
    .min(1)
    .default(activeAddress.value?.region || ''),
  city: z
    .string({
      required_error: 'City is required',
    })
    .min(1)
    .default(activeAddress.value?.city || ''),
  addressLine1: z
    .string({
      required_error: 'Address Line 1 is required',
    })
    .min(1)
    .default(activeAddress.value?.name1 || ''),
  addressLine2: z
    .string()
    .optional()
    .default(activeAddress.value?.name2 || ''),
  postcode: z
    .string({
      required_error: 'Postcode is required',
    })
    .min(1)
    .default(activeAddress.value?.postcode || ''),
  phoneNumber: z
    .string({
      required_error: 'Mobile is required',
    })
    .min(1)
    .regex(/^\+?\d{1,4}[\s-]?\(?\d{1,3}\)?[\s-]?\d{1,4}[\s-]?\d{1,4}[\s-]?\d{1,9}$/, 'Invalid phone number')
    .default(String(getUserDetails.value?.contactDetails?.phone || '')),
  mobile: z
    .string({
      required_error: 'Mobile is required',
    })
    .min(1)
    .regex(/^\+?\d{1,4}[\s-]?\(?\d{1,3}\)?[\s-]?\d{1,4}[\s-]?\d{1,4}[\s-]?\d{1,9}$/, 'Invalid mobile number')
    .default(String(getUserDetails.value?.contactDetails?.mobile || '')),
  email: z
    .string({
      required_error: 'Email is required',
    })
    .min(1)
    .regex(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Invalid email')
    .default(getUserDetails.value?.contactDetails?.email || ''),
});

const formSchema = toTypedSchema(
  baseSchema.extend({
    firstName: z
      .string({
        required_error: 'First name is required',
      })
      .min(1)
      .default(getUserDetails.value?.personalDetails?.firstName || ''),
    lastName: z
      .string({
        required_error: 'Last name is required',
      })
      .min(1)
      .default(getUserDetails.value?.personalDetails?.lastName || ''),
  }),
);

const formBusinessSchema = toTypedSchema(
  baseSchema.extend({
    companyName: z
      .string({
        required_error: 'Company Name is required',
      })
      .min(1)
      .default(getUserDetails.value?.companyDetails?.name || ''),
    registrationNumber: z
      .string({
        required_error: 'Company Registration Number is required',
      })
      .min(1)
      .default(getUserDetails.value?.companyDetails?.registrationNumber || ''),
    companyEmail: z
      .string({
        required_error: 'Email is required',
      })
      .min(1)
      .regex(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Invalid email')
      .default(getUserDetails.value?.contactDetails?.email || ''),
    taxId: z
      .string({
        required_error: 'Tax ID is required',
      })
      .default(getUserDetails.value?.companyDetails?.taxId || '')
      .optional(),
    vatNumber: z
      .string({
        required_error: 'V.A.T Number is required',
      })
      .default(getUserDetails.value?.companyDetails?.vat || '')
      .optional(),
    bankName: z
      .string()
      .optional()
      .default(getUserDetails.value?.companyDetails?.bank_name || '')
      .or(z.literal('')),
    iban: z
      .union([z.string().length(0), z.string().regex(/^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/, 'Invalid IBAN')])
      .default(getUserDetails.value?.companyDetails?.bank_iban || '')
      .transform((e: string) => (e === '' ? undefined : e))
      .optional(),
  }),
);

const { handleSubmit, setFieldValue, meta } = useForm({
  validationSchema: isPersonalAccount.value ? formSchema : formBusinessSchema,
});

const onSubmit = handleSubmit(async (values) => {
  if (!meta.value.dirty) {
    return (openEdit.value = !openEdit.value);
  }

  if (isPersonalAccount.value) {
    const personalValues = values as z.infer<typeof baseSchema> & { firstName: string; lastName: string };
    const payloadPersonal = {
      personalDetails: {
        firstName: personalValues.firstName,
        lastName: personalValues.lastName,
        address: {
          country: personalValues.country,
          region: personalValues.county,
          city: personalValues.city,
          name1: personalValues.addressLine1,
          name2: personalValues.addressLine2,
          postcode: personalValues.postcode,
          _id: getUserDetails.value.personalDetails?.address._id,
        },
      },
      contactDetails: {
        phone: personalValues.phoneNumber,
        email: personalValues.email,
        mobile: personalValues.mobile,
      },
    };
    const responseOk = await saveAccountDetails(payloadPersonal);
    if (responseOk) {
      // noop
    }
  } else {
    const businessValues = values as unknown as z.infer<typeof baseSchema> & {
      companyName: string;
      registrationNumber: string;
      vatNumber?: string;
      companyEmail: string;
    };
    const payloadBusiness = {
      companyDetails: {
        name: businessValues.companyName,
        registrationNumber: businessValues.registrationNumber,
        vat: businessValues.vatNumber,
        address: {
          country: businessValues.country,
          region: businessValues.county,
          city: businessValues.city,
          name1: businessValues.addressLine1,
          name2: businessValues.addressLine2,
          postcode: businessValues.postcode,
          _id: getUserDetails.value.companyDetails?.address._id,
        },
      },
      contactDetails: {
        phone: businessValues.phoneNumber,
        email: businessValues.companyEmail,
        mobile: businessValues.mobile,
      },
    };
    const responseOk = await saveAccountDetails(payloadBusiness);
    if (responseOk) {
      // noop
    }
  }

  await updateStoreDetails();
  openEdit.value = !openEdit.value;
});

// Watch for changes to the country and update values.country
watch(country, (newCountry) => {
  if (newCountry) {
    setFieldValue('country', newCountry.value);
    country.value = countries.value.find((c) => c.value === newCountry.value) as Country;
    regions.value =
      newCountry.regions.map((e) => {
        return {
          label: e.name,
          value: e.name,
        };
      }) || [];
    region.value = findRegionByName(country.value?.regions, activeAddress.value?.region);
  } else {
    region.value = undefined;
  }
});

watch(region, (newRegion) => {
  if (newRegion) {
    setFieldValue('county', newRegion.value);
  } else {
    region.value = undefined;
  }
});
</script>

<template>
  <div v-if="hasUserDetails" class="bg-white shadow-l rounded-xl">
    <section class="flex flex-col self-stretch p-4 md:p-6 bg-white rounded-xl shadow-sm">
      <header class="flex flex-col md:flex-row gap-2.5 justify-between w-full max-md:flex-wrap max-md:max-w-full">
        <h2 class="self-start text-xl font-semibold leading-7 text-neutral-700">Account Details</h2>
        <div class="flex flex-col md:flex-row gap-3 text-sm font-medium leading-6 text-gray-500">
          <UiButton
            :class="openEdit ? 'text-white' : 'text-slate-500'"
            :variant="openEdit ? 'default' : 'secondary'"
            :disabled="getUserDetails.accountType === AccountType.Agent"
          >
            <FilePenLineIcon class="w-5 h-5 stroke-1.5 mr-2" />
            <span>Edit</span>
          </UiButton>
          <UiButton class="text-slate-500" variant="secondary">
            <CopyIcon class="w-5 h-5 stroke-1.5 mr-2" />
            <span>Copy Details</span>
          </UiButton>
        </div>
      </header>
      <form class="mt-9 grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-9" @submit="onSubmit">
        <FormField v-if="getUserDetails.accountType !== AccountType.Personal" v-slot="{ componentField }" name="companyName">
          <FormItem>
            <FormLabel>Company Name</FormLabel>
            <FormControl>
              <Input type="text" placeholder="Company Name" v-bind="componentField" :disabled="!openEdit" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-if="getUserDetails.accountType !== AccountType.Personal" v-slot="{ componentField }" name="registrationNumber">
          <FormItem>
            <FormLabel>Company Registration Number</FormLabel>
            <FormControl>
              <Input type="text" placeholder="ABC123456" v-bind="componentField" :disabled="true" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-if="getUserDetails.accountType !== AccountType.Personal" v-slot="{ componentField }" name="taxId">
          <FormItem>
            <FormLabel>Tax ID</FormLabel>
            <FormControl>
              <Input type="text" placeholder="ABC123456" v-bind="componentField" :disabled="!openEdit" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-if="getUserDetails.accountType !== AccountType.Personal" v-slot="{ componentField }" name="vatNumber">
          <FormItem>
            <FormLabel>V.A.T Number</FormLabel>
            <FormControl>
              <Input type="text" placeholder="ABC123456" v-bind="componentField" :disabled="!openEdit" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-if="getUserDetails.accountType === AccountType.Personal" v-slot="{ componentField }" name="firstName">
          <FormItem>
            <FormLabel>First Name</FormLabel>
            <FormControl>
              <Input type="text" placeholder="First Name" v-bind="componentField" :disabled="!openEdit" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-if="getUserDetails.accountType === AccountType.Personal" v-slot="{ componentField }" name="lastName">
          <FormItem>
            <FormLabel>Last Name</FormLabel>
            <FormControl>
              <Input type="text" placeholder="Last Name" v-bind="componentField" :disabled="!openEdit" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField name="country">
          <FormItem class="flex flex-col">
            <FormControl>
              <FormSelect
                v-model="country"
                :disabled="!openEdit"
                :options="countries"
                :show-disabled-styles="false"
                label="Country"
                placeholder="United States"
                search
                size="lg"
                class="relative z-20"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField name="county">
          <FormItem class="flex flex-col">
            <FormControl>
              <FormSelect
                v-model="region"
                type="button"
                :disabled="!openEdit"
                :options="regions"
                :show-disabled-styles="false"
                label="County"
                placeholder="New York"
                search
                size="lg"
                class="relative z-20"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-slot="{ componentField }" name="city">
          <FormItem>
            <FormLabel>City</FormLabel>
            <FormControl>
              <Input type="text" placeholder="City" v-bind="componentField" :disabled="!openEdit" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-slot="{ componentField }" name="addressLine1">
          <FormItem>
            <FormLabel>Address Line 1</FormLabel>
            <FormControl>
              <Input type="text" placeholder="Address Line 1" v-bind="componentField" :disabled="!openEdit" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-slot="{ componentField }" name="addressLine2">
          <FormItem>
            <FormLabel>Address Line 2</FormLabel>
            <FormControl>
              <Input type="text" placeholder="Address Line 2" v-bind="componentField" :disabled="!openEdit" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-slot="{ componentField }" name="postcode">
          <FormItem>
            <FormLabel>Postcode</FormLabel>
            <FormControl>
              <Input type="text" placeholder="Postcode" v-bind="componentField" :disabled="!openEdit" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-slot="{ componentField }" name="phoneNumber">
          <FormItem>
            <FormLabel>Phone Number</FormLabel>
            <FormControl>
              <Input type="text" placeholder="+1 (555) 867-5309" v-bind="componentField" :disabled="!openEdit" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>
        <FormField v-slot="{ componentField }" name="mobile">
          <FormItem>
            <FormLabel>Mobile Number</FormLabel>
            <FormControl>
              <Input type="text" placeholder="+1 (555) 867-5309" v-bind="componentField" :disabled="!openEdit" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>
        <FormField v-if="getUserDetails.accountType !== AccountType.Personal" v-slot="{ componentField }" name="bankName">
          <FormItem>
            <FormLabel>Bank Name</FormLabel>
            <FormControl>
              <Input type="text" v-bind="componentField" placeholder="Bank Name" :disabled="!openEdit" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-if="getUserDetails.accountType !== AccountType.Personal" v-slot="{ componentField }" name="iban">
          <FormItem>
            <FormLabel>IBAN</FormLabel>
            <FormControl>
              <Input type="text" placeholder="ABCD 1234 5678 9012 3456 78" v-bind="componentField" :disabled="!openEdit" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-slot="{ componentField }" name="email">
          <FormItem>
            <FormLabel>{{ getUserDetails.accountType !== AccountType.Personal ? 'Company Email' : 'Email' }}</FormLabel>
            <FormControl>
              <Input type="email" placeholder="youremail@gmail.com" v-bind="componentField" :disabled="!openEdit" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>
        <div v-if="openEdit" class="flex flex-col md:flex-row justify-end gap-4 md:col-span-2">
          <Button variant="secondary" type="reset" @click="openEdit = !openEdit"> Cancel </Button>
          <Button type="submit" class="md:w-60"> Save </Button>
        </div>
      </form>
    </section>
  </div>
  <div v-else class="bg-white shadow-l rounded-xl p-6 text-sm text-slate-500">Loading account details...</div>
</template>

<style scoped>
@reference "../../../../assets/css/main.css";
label {
  @apply text-slate-500;
}
</style>
