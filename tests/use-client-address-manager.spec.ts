import { ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const handleSubmit = vi.fn();
const setFieldValue = vi.fn();
const updateStoreDetails = vi.fn();
const toast = vi.fn();

vi.mock('vee-validate', () => ({
  useForm: () => ({ handleSubmit, setFieldValue }),
}));

vi.mock('~/components/ui/toast', () => ({
  useToast: () => ({ toast }),
}));

vi.mock('~/helpers/auth-store.helper', () => ({
  updateStoreDetails: () => updateStoreDetails(),
}));

import { useClientAddressManager } from '~/composables/useClientAddressManager';

const formValues = {
  addressAlias: 'Main office',
  addressLine1: '1 Test Street',
  addressLine2: 'Suite 2',
  city: 'Bucharest',
  country: 'RO',
  county: 'București',
  postcode: '010101',
};

describe('useClientAddressManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    handleSubmit.mockImplementation((callback) => () => callback(formValues));
    updateStoreDetails.mockResolvedValue(undefined);
  });

  it('updates an existing address, refreshes account details, and closes the dialog', async () => {
    const updateAddress = vi.fn().mockResolvedValue({ status: 'success', data: 'updated' });
    const onSuccess = vi.fn().mockResolvedValue(undefined);
    const isOpen = ref(true);

    const { onSubmit } = useClientAddressManager({
      address: ref({
        _id: 'address-1',
        alias: 'Old alias',
        default: true,
      }),
      isOpen,
      addAddress: vi.fn(),
      updateAddress,
      onSuccess,
    });

    await onSubmit();

    const expectedAddress = {
      _id: 'address-1',
      alias: 'Main office',
      name1: '1 Test Street',
      name2: 'Suite 2',
      city: 'Bucharest',
      country: 'RO',
      postcode: '010101',
      region: 'București',
      default: true,
    };
    expect(updateAddress).toHaveBeenCalledWith(expectedAddress);
    expect(onSuccess).toHaveBeenCalledWith(expectedAddress);
    expect(updateStoreDetails).toHaveBeenCalledOnce();
    expect(isOpen.value).toBe(false);
  });

  it('shows an error and keeps the dialog open when an address mutation fails', async () => {
    const addAddress = vi.fn().mockResolvedValue({ status: 'error', data: 'invalid' });
    const isOpen = ref(true);

    const { onSubmit } = useClientAddressManager({
      address: ref(null),
      isOpen,
      addAddress,
      updateAddress: vi.fn(),
    });

    await onSubmit();

    expect(addAddress).toHaveBeenCalledWith({
      _id: undefined,
      alias: 'Main office',
      name1: '1 Test Street',
      name2: 'Suite 2',
      city: 'Bucharest',
      country: 'RO',
      postcode: '010101',
      region: 'București',
      default: false,
    });
    expect(toast).toHaveBeenCalledWith({
      variant: 'destructive',
      title: 'Error',
      description: 'Invalid address',
    });
    expect(updateStoreDetails).not.toHaveBeenCalled();
    expect(isOpen.value).toBe(true);
  });
});
