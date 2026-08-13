import { getDemoAddresses, resolveCustomerId } from '~/server/utils/mockDashboardDemo';
import type { BillingAddressInterface, ShippingAddressInterface } from '~/types/auth/user-interface';

type AddressKind = 'shipping' | 'billing';

interface RuntimeAddressStore {
  shippingAddress: ShippingAddressInterface[];
  billingAddress: BillingAddressInterface[];
}

const addressesByCustomerId = new Map<string, RuntimeAddressStore>();

const cloneAddresses = (store: RuntimeAddressStore): RuntimeAddressStore => ({
  shippingAddress: store.shippingAddress.map((address) => ({ ...address })),
  billingAddress: store.billingAddress.map((address) => ({ ...address })),
});

const normalizeCustomerId = (customerId?: string | null) => resolveCustomerId(customerId || undefined);

const createAddressId = (kind: AddressKind) => `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const getAddressList = (store: RuntimeAddressStore, kind: AddressKind) => {
  return kind === 'shipping' ? store.shippingAddress : store.billingAddress;
};

const ensureDefaultAddress = <T extends { default: boolean }>(addresses: T[]) => {
  if (!addresses.length) {
    return;
  }

  const hasDefault = addresses.some((address) => address.default);

  if (!hasDefault) {
    addresses[0].default = true;
  }
};

export const getRuntimeAddresses = (customerId?: string | null) => {
  const resolvedId = normalizeCustomerId(customerId);
  const existing = addressesByCustomerId.get(resolvedId);

  if (existing) {
    return cloneAddresses(existing);
  }

  const demoAddresses = getDemoAddresses(resolvedId);

  return {
    shippingAddress: demoAddresses.shippingAddress.map((address) => ({ ...address })),
    billingAddress: demoAddresses.billingAddress.map((address) => ({ ...address })),
  };
};

export const getMutableRuntimeAddresses = (customerId?: string | null) => {
  const resolvedId = normalizeCustomerId(customerId);
  const existing = addressesByCustomerId.get(resolvedId);

  if (existing) {
    return existing;
  }

  const demoAddresses = getDemoAddresses(resolvedId);
  const store: RuntimeAddressStore = {
    shippingAddress: demoAddresses.shippingAddress.map((address) => ({ ...address })),
    billingAddress: demoAddresses.billingAddress.map((address) => ({ ...address })),
  };

  addressesByCustomerId.set(resolvedId, store);

  return store;
};

export const addRuntimeAddress = (
  customerId: string | null | undefined,
  kind: AddressKind,
  address: ShippingAddressInterface | BillingAddressInterface,
) => {
  const store = getMutableRuntimeAddresses(customerId);
  const addresses = getAddressList(store, kind);
  const nextAddress = {
    ...address,
    _id: address._id || createAddressId(kind),
    default: address.default ?? addresses.length === 0,
  };

  if (nextAddress.default) {
    addresses.forEach((entry) => {
      entry.default = false;
    });
  }

  addresses.push(nextAddress);
  ensureDefaultAddress(addresses);

  return nextAddress;
};

export const updateRuntimeAddress = (
  customerId: string | null | undefined,
  kind: AddressKind,
  address: ShippingAddressInterface | BillingAddressInterface,
) => {
  const store = getMutableRuntimeAddresses(customerId);
  const addresses = getAddressList(store, kind);
  const index = addresses.findIndex((entry) => entry._id && entry._id === address._id);

  if (index < 0) {
    return null;
  }

  const updatedAddress = {
    ...addresses[index],
    ...address,
    _id: addresses[index]._id,
  };

  if (updatedAddress.default) {
    addresses.forEach((entry, entryIndex) => {
      entry.default = entryIndex === index;
    });
  }

  addresses[index] = updatedAddress;
  ensureDefaultAddress(addresses);

  return updatedAddress;
};

export const deleteRuntimeAddress = (customerId: string | null | undefined, kind: AddressKind, addressId?: string | null) => {
  const store = getMutableRuntimeAddresses(customerId);
  const addresses = getAddressList(store, kind);
  const index = addresses.findIndex((entry) => entry._id === addressId);

  if (index < 0) {
    return false;
  }

  const wasDefault = addresses[index].default;
  addresses.splice(index, 1);

  if (wasDefault && addresses.length) {
    addresses[0].default = true;
  }

  ensureDefaultAddress(addresses);

  return true;
};
