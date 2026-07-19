import { parseMockPricingInput, requireMockPricingPermission, updateMockPricing } from '~/server/utils/mockPricing';
import { UserPermissionsEnum } from '~/types/auth/permissions';

export default defineEventHandler(async (event) => {
  requireMockPricingPermission(event, UserPermissionsEnum.PriceSettingsWrite);
  const id = getRouterParam(event, 'id') || '';
  const body = parseMockPricingInput(await readBody(event));
  const item = updateMockPricing(event, id, body);
  if (!item) throw createError({ statusCode: 404, statusMessage: 'Price setting not found' });
  return { status: 'success', data: { id: item._id } };
});
