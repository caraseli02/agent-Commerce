import type { H3Event } from 'h3';
import { orders } from '~~/server/domain/orders';
import { AccountRole } from '~~/types/signup/form';
import { getExistingMockCartUserId } from './mockCart';
import { getMockUserFromAuthHeader } from './mockUsers';

export type Requester = { userId: string; isAdmin: boolean };

// Resolves who is asking: the signed-in mock user or, when allowed in mock mode,
// an existing guest session. It never mints a guest session.
export const requireRequester = (event: H3Event, options: { allowGuest?: boolean } = {}): Requester => {
  const authorization = getHeaders(event).authorization;
  const user = getMockUserFromAuthHeader(authorization);
  if (user?._id) return { userId: user._id, isAdmin: user.role === AccountRole.Admin };

  const mockModeEnabled = String(useRuntimeConfig(event).public.MOCK_MODE) === 'true';
  const guestOwnerId = options.allowGuest && mockModeEnabled ? getExistingMockCartUserId(event, authorization) : '';
  if (!guestOwnerId) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  return { userId: guestOwnerId, isAdmin: false };
};

export const requireSelfOrAdmin = (event: H3Event, userId?: string | null): Requester => {
  const requester = requireRequester(event);
  if (!requester.isAdmin && requester.userId !== userId) throw createError({ statusCode: 403, statusMessage: 'Forbidden' });
  return requester;
};

// Unknown order → 404; an order owned by someone else → 403 unless the requester is an admin.
export const requireOwnedOrder = async (event: H3Event, id?: string | null) => {
  const requester = requireRequester(event, { allowGuest: true });
  const order = await orders.findById(id, requester.isAdmin ? undefined : requester.userId);
  if (order) return order;

  if (!requester.isAdmin && (await orders.findById(id))) throw createError({ statusCode: 403, statusMessage: 'Forbidden' });
  throw createError({ statusCode: 404, statusMessage: 'Order not found' });
};
