import { toTypedSchema } from '@vee-validate/zod';
import { useForm } from 'vee-validate';
import { ref, watch, type Ref } from 'vue';
import { z } from 'zod';

import { countries } from '@/data/countries';
import { useToast } from '~/components/ui/toast';
import { updateStoreDetails } from '~/helpers/auth-store.helper';
import type { ShippingAddressInterface } from '~/types/auth/user-interface';

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

interface AddressMutationResponse {
  status: string;
  data: string;
}

interface UseClientAddressManagerOptions<TAddress extends ShippingAddressInterface> {
  address: Ref<TAddress | null>;
  isOpen: Ref<boolean | undefined>;
  addAddress: (address: ShippingAddressInterface) => Promise<AddressMutationResponse>;
  updateAddress: (address: ShippingAddressInterface) => Promise<AddressMutationResponse>;
  onSuccess?: (address: ShippingAddressInterface) => void | Promise<void>;
}

export function useClientAddressManager<TAddress extends ShippingAddressInterface>(options: UseClientAddressManagerOptions<TAddress>) {
  const { toast } = useToast();
  const showErrorMsg = ref(true);
  const country = ref<undefined | Country>(undefined);
  const region = ref<undefined | Region>(undefined);
  const regions = ref<Region[]>([]);

  const formSchema = toTypedSchema(
    z.object({
      addressAlias: z
        .string()
        .min(1, 'Address Alias is required')
        .default(options.address.value?.alias || ''),
      city: z
        .string()
        .min(1, 'City is required')
        .default(options.address.value?.city || ''),
      country: z
        .string()
        .min(1, 'Country is required')
        .default(options.address.value?.country || ''),
      county: z
        .string()
        .min(1, 'Region is required')
        .default(options.address.value?.region || ''),
      addressLine1: z
        .string()
        .min(1, 'Address Line 1 is required')
        .default(options.address.value?.name1 || ''),
      addressLine2: z
        .string()
        .optional()
        .default(options.address.value?.name2 || ''),
      postcode: z
        .string()
        .min(1, 'Postcode is required')
        .default(options.address.value?.postcode || ''),
    })
  );

  const { handleSubmit, setFieldValue } = useForm({
    validationSchema: formSchema,
  });

  const findRegionByName = (selectedRegions: Country['regions'] | undefined, name: string | undefined) => {
    const selectedRegion = selectedRegions?.find((item) => item.name === name);

    if (selectedRegion) {
      return {
        label: selectedRegion.name,
        value: selectedRegion.shortCode,
      };
    }

    return undefined;
  };

  watch(options.address, (newAddress) => {
    setFieldValue('addressAlias', newAddress?.alias || '');
    setFieldValue('city', newAddress?.city || '');
    setFieldValue('country', newAddress?.country || '');
    setFieldValue('county', newAddress?.region || '');
    setFieldValue('addressLine1', newAddress?.name1 || '');
    setFieldValue('addressLine2', newAddress?.name2 || '');
    setFieldValue('postcode', newAddress?.postcode || '');
  });

  watch(country, (newCountry) => {
    if (newCountry) {
      setFieldValue('country', newCountry.value);
      country.value = countries.find((item) => item.value === newCountry.value) as Country;
      regions.value =
        newCountry.regions.map((item) => ({
          label: item.name,
          value: item.name,
        })) || [];
      region.value = { label: options.address.value?.city ?? '', value: options.address.value?.city ?? '' };
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

  watch(options.isOpen, (newValue) => {
    if (newValue) {
      country.value = countries.find((item) => item.value === (options.address.value?.country || 'US')) as Country;
      region.value = findRegionByName(country.value?.regions, options.address.value?.region ?? '');
      regions.value = country.value?.regions.map((item) => ({ label: item.name, value: item.name })) || [];
    }
  });

  const onCloseDialog = () => {
    showErrorMsg.value = false;
    options.isOpen.value = false;
  };

  const onSubmit = handleSubmit(async (values) => {
    const payload: ShippingAddressInterface = {
      _id: options.address.value?._id,
      alias: values.addressAlias,
      name1: values.addressLine1,
      name2: values.addressLine2,
      city: values.city,
      country: values.country,
      postcode: values.postcode,
      region: values.county,
      default: options.address.value?.default || false,
    };

    const response = options.address.value ? await options.updateAddress(payload) : await options.addAddress(payload);

    if (response.status === 'success') {
      if (options.onSuccess) {
        await options.onSuccess(payload);
      }
      await updateStoreDetails();
      onCloseDialog();
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Invalid address',
      });
    }
  });

  return {
    countries,
    country,
    region,
    regions,
    showErrorMsg,
    onCloseDialog,
    onSubmit,
  };
}
