import { resetMockCartForUser, requireMockCartUserId } from '~/server/utils/mockCart';
import { resetMockPricingSession } from '~/server/utils/mockPricing';
import { isMockSessionPersistenceEnabled } from '~/server/utils/mockSessionStore';

export default defineEventHandler(async (event) => {
  if (!isMockSessionPersistenceEnabled()) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' });
  }

  const headers = getHeaders(event);
  const userId = requireMockCartUserId(event, headers.authorization);

  try {
    const cart = resetMockCartForUser(userId);
    const pricing = resetMockPricingSession(event);

    return {
      status: 'success',
      data: {
        cart,
        pricing,
      },
    };
  } catch {
    throw createError({ statusCode: 500, statusMessage: 'Failed to reset demo data' });
  }
});
