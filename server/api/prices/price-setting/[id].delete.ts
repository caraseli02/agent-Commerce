import { deleteMockPricing, requireMockPricingPermission } from '~/server/utils/mockPricing';
import { UserPermissionsEnum } from '~/types/auth/permissions';

export default defineEventHandler((event) => {
  requireMockPricingPermission(event, UserPermissionsEnum.PriceSettingsDelete);
  const id = getRouterParam(event, 'id') || '';
  if (!deleteMockPricing(event, id)) throw createError({ statusCode: 404, statusMessage: 'Price setting not found' });
  return { status: 'success', data: id };
});
