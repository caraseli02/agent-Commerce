import { createMockPricing, parseMockPricingInput, requireMockPricingPermission } from '~~/server/utils/mockPricing';
import { UserPermissionsEnum } from '~~/types/auth/permissions';

export default defineEventHandler(async (event) => {
  requireMockPricingPermission(event, UserPermissionsEnum.PriceSettingsWrite);
  const body = parseMockPricingInput(await readBody(event));
  const item = createMockPricing(event, body);
  return { status: 'success', data: { id: item._id } };
});
