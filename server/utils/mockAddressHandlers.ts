import { getMockUserFromAuthHeader } from '~/server/utils/mockUsers';
import { addRuntimeAddress, deleteRuntimeAddress, updateRuntimeAddress } from '~/server/utils/mockRuntimeAddresses';
import { UserPermissionsEnum } from '~/types/auth/permissions';
import type { BillingAddressInterface, ShippingAddressInterface } from '~/types/auth/user-interface';

type AddressKind = 'shipping' | 'billing';

interface AddressMutationBody {
  address?: ShippingAddressInterface | BillingAddressInterface;
}

const requireAddressActor = (event: Parameters<typeof getHeaders>[0], targetUserId?: string | null) => {
  const headers = getHeaders(event);
  const requester = getMockUserFromAuthHeader(headers.authorization);

  if (!requester) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    });
  }

  const normalizedTargetUserId = String(targetUserId || requester._id || '');
  const isSelfRequest = requester._id === normalizedTargetUserId;
  const isAdmin = requester.permissions?.includes(UserPermissionsEnum.AdminDashboardRead);

  if (!isSelfRequest && !isAdmin) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
    });
  }

  return normalizedTargetUserId;
};

const readAddressBody = async (event: Parameters<typeof readBody>[0]) => {
  const body = (await readBody(event)) as AddressMutationBody;
  const address = body?.address;

  if (!address) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Address payload is required',
    });
  }

  return address;
};

export const handleAddAddress = async (event: Parameters<typeof readBody>[0], kind: AddressKind, targetUserId?: string | null) => {
  const customerId = requireAddressActor(event, targetUserId);
  const address = await readAddressBody(event);
  const savedAddress = addRuntimeAddress(customerId, kind, address);

  return {
    status: 'success',
    data: savedAddress._id || 'ok',
  };
};

export const handleUpdateAddress = async (event: Parameters<typeof readBody>[0], kind: AddressKind, targetUserId?: string | null) => {
  const customerId = requireAddressActor(event, targetUserId);
  const address = await readAddressBody(event);
  const updatedAddress = updateRuntimeAddress(customerId, kind, address);

  if (!updatedAddress) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Address not found',
    });
  }

  return {
    status: 'success',
    data: updatedAddress._id || 'ok',
  };
};

export const handleDeleteAddress = async (
  event: Parameters<typeof getRouterParam>[0],
  kind: AddressKind,
  addressId?: string | null,
  targetUserId?: string | null,
) => {
  const customerId = requireAddressActor(event, targetUserId);
  const deleted = deleteRuntimeAddress(customerId, kind, addressId);

  if (!deleted) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Address not found',
    });
  }

  return {
    status: 'success',
    data: 'ok',
  };
};
