<script setup lang="ts">
import { Building2Icon, PlusCircleIcon } from 'lucide-vue-next';

import { useForm } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';
import { z } from 'zod';
import { countries } from '@/data/countries';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { AccountType } from '~/types';
import type { ShippingAddressInterface } from '~/types/auth/user-interface';
import { updateStoreDetails } from '~/helpers/auth-store.helper';
import { useToast } from '~/components/ui/toast';
import { addShippingAsCustomer, updateShippingAsCustomer } from '~/composables/api/user';

const props = defineProps<{
  address: ShippingAddressInterface | null;
  accountType: AccountType;
}>();

const isOpen = defineModel<boolean>();

const emit = defineEmits(['addShippingAddress']);

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

const formSchema = toTypedSchema(
  z.object({
    addressAlias: z
      .string()
      .min(1, 'Address Alias is required')
      .default(props.address?.alias || ''),
    city: z
      .string()
      .min(1, 'City is required')
      .default(props.address?.city || ''),
    country: z
      .string()
      .min(1, 'Country is required')
      .default(props.address?.country || ''),
    county: z
      .string()
      .min(1, 'Region is required')
      .default(props.address?.region || ''),
    addressLine1: z
      .string()
      .min(1, 'Address Line 1 is required')
      .default(props.address?.name1 || ''),
    addressLine2: z
      .string()
      .optional()
      .default(props.address?.name2 || ''),
    postcode: z
      .string()
      .min(1, 'Postcode is required')
      .default(props.address?.postcode || ''),
  }),
);

const { handleSubmit, setFieldValue } = useForm({
  validationSchema: formSchema,
});
const { toast } = useToast();

watch(
  () => props.address,
  (newAddress) => {
    setFieldValue('addressAlias', newAddress?.alias || '');
    setFieldValue('city', newAddress?.city || '');
    setFieldValue('country', newAddress?.country || '');
    setFieldValue('county', newAddress?.region || '');
    setFieldValue('addressLine1', newAddress?.name1 || '');
    setFieldValue('addressLine2', newAddress?.name2 || '');
    setFieldValue('postcode', newAddress?.postcode || '');
  },
);

const onSubmit = handleSubmit(async (values) => {
  const payload: ShippingAddressInterface = {
    _id: props.address?._id,
    alias: values.addressAlias,
    name1: values.addressLine1,
    name2: values.addressLine2,
    city: values.city,
    country: values.country,
    postcode: values.postcode,
    region: values.county,
    default: props.address?.default || false,
  };
  const response = props.address ? await updateShippingAsCustomer(payload) : await addShippingAsCustomer(payload);

  if (response.status === 'success') {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    !props.address && emit('addShippingAddress', payload);
    await updateStoreDetails();
    onCloseDialog();
  }
  else {
    toast({
      variant: 'destructive',
      title: 'Error',
      description: 'Invalid address',
    });
  }
});

const findRegionByName = (regions: Country['regions'], name: string) => {
  const region = regions?.find(region => region?.name === name);
  if (region) {
    return {
      label: region.name,
      value: region.shortCode,
    };
  }
  return undefined;
};

const country = ref<undefined | Country>(undefined);

const region = ref<undefined | Region>(undefined);

const regions = ref<Region[]>([]);

const showErrorMsg = ref(true);

watch(country, (newCountry) => {
  if (newCountry) {
    setFieldValue('country', newCountry.value);
    country.value = countries.find(c => c.value === newCountry.value) as Country;
    regions.value
            = newCountry.regions.map((e) => {
        return {
          label: e.name,
          value: e.name,
        };
      }) || [];
    region.value = { label: props.address?.city ?? '', value: props.address?.city ?? '' };
  }
  else {
    region.value = undefined;
  }
});

watch(region, (newRegion) => {
  if (newRegion) {
    setFieldValue('county', newRegion.value);
  }
  else {
    region.value = undefined;
  }
});

const onCloseDialog = () => {
  showErrorMsg.value = false;
  isOpen.value = false;
};

watch(isOpen, (newVla) => {
  if (newVla) {
    country.value = countries.find(c => c.value === (props.address?.country || 'US')) as Country;
    region.value = findRegionByName(country.value?.regions, props.address?.region ?? '');
    regions.value = country.value?.regions.map(e => ({ label: e.name, value: e.name })) || [];
  }
});
</script>

<template>
  <UiDialog v-model:open="isOpen">
    <UiDialogTrigger as-child>
      <UiButton
        size="icon"
        class="rounded-full"
        variant="ghost"
      >
        <PlusCircleIcon class="aspect-square w-10 h-10 stroke-1 text-blue-500" />
      </UiButton>
    </UiDialogTrigger>
    <UiDialogContent
      ref="dialog"
      class="max-w-[350px] sm:max-w-[640px] rounded-xl"
    >
      <UiDialogHeader>
        <UiDialogTitle>{{ (address?._id ? 'Edit ' : 'Add ') + 'Shipping Address' }}</UiDialogTitle>
      </UiDialogHeader>
      <section class="flex flex-col self-stretch bg-white rounded-xl shadow-sm max-md:px-5 max-h-[85vh] overflow-y-auto">
        <form
          class="mt-5 flex flex-col gap-y-6 gap-x-9"
          @submit="onSubmit"
        >
          <FormField
            v-slot="{ componentField }"
            name="addressAlias"
          >
            <FormItem>
              <FormLabel>Address Alias</FormLabel>
              <FormControl>
                <section class="flex items-center">
                  <div class="flex items-center justify-center w-11 h-11 rounded-l-lg bg-stone-50 border border-grey-300">
                    <Building2Icon class="w-5 h-5" />
                  </div>
                  <UiInput
                    class="rounded-l-[0px] border-l-0"
                    type="text"
                    v-bind="componentField"
                    placeholder="Address Alias 1"
                  />
                </section>
              </FormControl>
              <FormMessage v-if="showErrorMsg" />
            </FormItem>
          </FormField>
          <section class="flex flex-col md:flex-row justify-between gap-6">
            <FormField name="country">
              <FormItem class="flex flex-col w-full">
                <FormControl>
                  <FormSelect
                    v-model="country"
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
              <FormItem class="flex flex-col w-full">
                <FormControl>
                  <FormSelect
                    v-model="region"
                    :options="regions"
                    :show-disabled-styles="false"
                    label="Region"
                    placeholder="New York"
                    search
                    size="lg"
                    class="relative z-20"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>
          </section>

          <FormField
            v-slot="{ componentField }"
            name="city"
          >
            <FormItem>
              <FormLabel>City</FormLabel>
              <FormControl>
                <UiInput
                  type="text"
                  placeholder="Bucharest"
                  v-bind="componentField"
                />
              </FormControl>
              <FormMessage v-if="showErrorMsg" />
            </FormItem>
          </FormField>

          <FormField
            v-slot="{ componentField }"
            name="addressLine1"
          >
            <FormItem>
              <FormLabel>Address Line 1</FormLabel>
              <FormControl>
                <UiInput
                  type="text"
                  placeholder="Address Line 1"
                  v-bind="componentField"
                />
              </FormControl>
              <FormMessage v-if="showErrorMsg" />
            </FormItem>
          </FormField>

          <FormField
            v-slot="{ componentField }"
            name="addressLine2"
          >
            <FormItem>
              <FormLabel>Address Line 2</FormLabel>
              <FormControl>
                <UiInput
                  type="text"
                  placeholder="Address Line 2"
                  v-bind="componentField"
                />
              </FormControl>
              <FormMessage v-if="showErrorMsg" />
            </FormItem>
          </FormField>

          <FormField
            v-slot="{ componentField }"
            name="postcode"
          >
            <FormItem>
              <FormLabel>Postcode</FormLabel>
              <FormControl>
                <UiInput
                  type="text"
                  placeholder="Postcode"
                  v-bind="componentField"
                />
              </FormControl>
              <FormMessage v-if="showErrorMsg" />
            </FormItem>
          </FormField>

          <div class="flex justify-end gap-4 col-span-2 sticky bottom-0 bg-white pt-2">
            <UiButton
              variant="secondary"
              type="reset"
              @click="onCloseDialog()"
            >
              Cancel
            </UiButton>
            <UiButton
              type="submit"
              class="w-60"
            >
              Save
            </UiButton>
          </div>
        </form>
      </section>
    </UiDialogContent>
  </UiDialog>
</template>

<style scoped lang="postcss">
label {
    @apply text-slate-500;
}
</style>
