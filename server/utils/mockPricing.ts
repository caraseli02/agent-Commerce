import { z } from 'zod';
import type { H3Event } from 'h3';
import { PriceSettingsTypeEnum, type PriceSettingsInterface } from '~/model/prices/price-settings.interface';
import { getMockUserFromAuthHeader } from '~/server/utils/mockUsers';
import type { UserPermissionsEnum } from '~/types/auth/permissions';

const PRICING_SESSION_COOKIE = 'components_marketplace_pricing_session';
const MAX_PRICING_SESSIONS = 200;

type PricingState = {
  pricing: PriceSettingsInterface[];
  sequence: number;
};

const seedPricing = (): PriceSettingsInterface[] => [
  { _id: 'price-range-1', type: PriceSettingsTypeEnum.Range, range: { min: 0, max: 99 }, linked: false, label: 'Entry' },
  { _id: 'quantity-range-1', type: PriceSettingsTypeEnum.Quantity, values: [10, 50, 100], linked: false, label: 'Volume' },
  { _id: 'margin-range-1', type: PriceSettingsTypeEnum.Margins, values: [10, 20, 30], linked: false, label: 'Standard' },
];

const sessions = new Map<string, PricingState>();

const rangeSchema = z
  .object({
    type: z.literal(PriceSettingsTypeEnum.Range),
    range: z.object({ min: z.number().finite().nonnegative(), max: z.number().finite().positive() }),
    label: z.string().trim().min(1).max(80),
  })
  .refine((value) => value.range.min < value.range.max, { message: 'Range minimum must be lower than maximum' });

const valuesSchema = z.array(z.number().finite().int().positive()).min(1).max(20);
const quantitySchema = z.object({
  type: z.literal(PriceSettingsTypeEnum.Quantity),
  values: valuesSchema.refine((values) => values.every((value, index) => index === 0 || value > (values[index - 1] ?? value)), {
    message: 'Quantity values must be strictly increasing',
  }),
  label: z.string().trim().min(1).max(80),
});
const marginSchema = z.object({
  type: z.literal(PriceSettingsTypeEnum.Margins),
  values: valuesSchema.refine((values) => values.every((value) => value <= 100), { message: 'Margins cannot exceed 100' }),
  label: z.string().trim().min(1).max(80),
});

const pricingInputSchema = z.union([rangeSchema, quantitySchema, marginSchema]);

const clonePricing = (item: PriceSettingsInterface): PriceSettingsInterface => ({
  ...item,
  range: item.range ? { ...item.range } : undefined,
  values: item.values ? [...item.values] : undefined,
});

const getPricingState = (event: H3Event) => {
  let sessionId = getCookie(event, PRICING_SESSION_COOKIE);

  if (!sessionId) {
    sessionId = crypto.randomUUID();
    setCookie(event, PRICING_SESSION_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });
  }

  let state = sessions.get(sessionId);
  if (!state) {
    if (sessions.size >= MAX_PRICING_SESSIONS) {
      sessions.delete(sessions.keys().next().value as string);
    }
    state = { pricing: seedPricing(), sequence: 4 };
    sessions.set(sessionId, state);
  }

  return state;
};

export const requireMockPricingPermission = (event: H3Event, permission: UserPermissionsEnum) => {
  const user = getMockUserFromAuthHeader(getHeaders(event).authorization);

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required' });
  }

  if (!user.permissions?.includes(permission)) {
    throw createError({ statusCode: 403, statusMessage: 'Insufficient permissions' });
  }
};

export const parseMockPricingInput = (input: unknown) => {
  const parsed = pricingInputSchema.safeParse(input);
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: parsed.error.issues[0]?.message || 'Invalid price setting' });
  }
  return parsed.data;
};

export const getMockPricing = (event: H3Event) => getPricingState(event).pricing.map(clonePricing);

export const createMockPricing = (event: H3Event, input: ReturnType<typeof parseMockPricingInput>) => {
  const state = getPricingState(event);
  const item = { ...input, _id: `price-setting-${state.sequence++}`, linked: false } as PriceSettingsInterface;
  state.pricing.push(item);
  return clonePricing(item);
};

export const updateMockPricing = (event: H3Event, id: string, input: ReturnType<typeof parseMockPricingInput>) => {
  const state = getPricingState(event);
  const index = state.pricing.findIndex((item) => item._id === id);
  if (index < 0) return null;
  const existing = state.pricing[index];
  if (!existing) return null;
  const updated = { ...input, _id: id, linked: existing.linked } as PriceSettingsInterface;
  state.pricing[index] = updated;
  return clonePricing(updated);
};

export const deleteMockPricing = (event: H3Event, id: string) => {
  const state = getPricingState(event);
  const index = state.pricing.findIndex((item) => item._id === id);
  if (index < 0) return false;
  state.pricing.splice(index, 1);
  return true;
};
