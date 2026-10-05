import type { H3Event } from 'h3';
import { getExistingMockCartUserId } from './mockCart';
import { getMockUserFromAuthHeader } from './mockUsers';

// Recovery routes may use an existing mock guest session, but never mint one.
export const requireCheckoutOwner = (event: H3Event): string => {
  const authorization = getHeaders(event).authorization;
  const authenticatedUser = getMockUserFromAuthHeader(authorization);
  const mockModeEnabled = String(useRuntimeConfig(event).public.MOCK_MODE) === 'true';
  const ownerId = authenticatedUser?._id || (mockModeEnabled ? getExistingMockCartUserId(event, authorization) : '');
  if (!ownerId) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  return ownerId;
};
