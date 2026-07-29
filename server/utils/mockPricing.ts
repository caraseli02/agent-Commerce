import { z } from 'zod';
import type { H3Event } from 'h3';
import { PriceSettingsTypeEnum, type PriceSettingsInterface } from '~/model/prices/price-settings.interface';
import { getMockUserFromAuthHeader } from '~/server/utils/mockUsers';
import { deleteSession, loadSession, purgeExpiredSessions, saveSession } from '~/server/utils/mockSessionStore';
import type { UserPermissionsEnum } from '~/types/auth/permissions';

const PRICING_SESSION_COOKIE = 'ecas_pricing_session';
const PRICING_SESSION_NAMESPACE = 'pricing';
const PRICING_TTL_MS = 60 * 60 * 1000;
const MAX_PRICING_SESSIONS = 200;
export const PRICING_SEED_SEQUENCE = 4;

type PricingState = {
  pricing: PriceSettingsInterface[];
  sequence: number;
};

type StoredPricingState = {
  state: PricingState;
  updatedAt: number;
};

export const getSeedPricing = (): PriceSettingsInterface[] => [
  { _id: 'price-range-1', type: PriceSettingsTypeEnum.Range, range: { min: 0, max: 99 }, linked: false, label: 'Entry' },
  { _id: 'quantity-range-1', type: PriceSettingsTypeEnum.Quantity, values: [10, 50, 100], linked: false, label: 'Volume' },
  { _id: 'margin-range-1', type: PriceSettingsTypeEnum.Margins, values: [10, 20, 30], linked: false, label: 'Standard' },
];

const sessions = new Map<string, StoredPricingState>();

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
  values: valuesSchema.refine((values) => values.every((value, index) => index === 0 || value > values[index - 1]), {
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

const clonePricingState = (state: PricingState): PricingState => ({
  sequence: state.sequence,
  pricing: state.pricing.map(clonePricing),
});

const nowMs = () => Date.now();

const persistStoredPricing = (sessionId: string, stored: StoredPricingState) => {
  sessions.set(sessionId, stored);
  saveSession(PRICING_SESSION_NAMESPACE, sessionId, clonePricingState(stored.state), stored.updatedAt);
};

const removeStoredPricing = (sessionId: string) => {
  sessions.delete(sessionId);
  deleteSession(PRICING_SESSION_NAMESPACE, sessionId);
};

const loadStoredPricingFromDisk = (sessionId: string): StoredPricingState | null => {
  const envelope = loadSession<PricingState>(PRICING_SESSION_NAMESPACE, sessionId);
  if (!envelope?.value) {
    return null;
  }

  const stored = { state: clonePricingState(envelope.value), updatedAt: envelope.updatedAt };
  sessions.set(sessionId, stored);
  return stored;
};

const purgeExpiredPricingSessions = () => {
  const cutoff = nowMs() - PRICING_TTL_MS;
  for (const [sessionId, stored] of sessions.entries()) {
    if (stored.updatedAt < cutoff) {
      removeStoredPricing(sessionId);
    }
  }

  if (sessions.size > MAX_PRICING_SESSIONS) {
    const byOldest = [...sessions.entries()].sort((a, b) => a[1].updatedAt - b[1].updatedAt);
    const overflow = byOldest.length - MAX_PRICING_SESSIONS;
    for (let i = 0; i < overflow; i++) {
      removeStoredPricing(byOldest[i][0]);
    }
  }

  purgeExpiredSessions(PRICING_SESSION_NAMESPACE, PRICING_TTL_MS, MAX_PRICING_SESSIONS);
};

const getPricingState = (event: H3Event) => {
  purgeExpiredPricingSessions();

  let sessionId = getCookie(event, PRICING_SESSION_COOKIE);

  if (!sessionId) {
    sessionId = crypto.randomUUID();
    setCookie(event, PRICING_SESSION_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });
  }

  const existing = sessions.get(sessionId) || loadStoredPricingFromDisk(sessionId);
  if (existing) {
    existing.updatedAt = nowMs();
    return existing.state;
  }

  if (sessions.size >= MAX_PRICING_SESSIONS) {
    removeStoredPricing(sessions.keys().next().value as string);
  }

  const state = { pricing: getSeedPricing(), sequence: PRICING_SEED_SEQUENCE };
  persistStoredPricing(sessionId, { state, updatedAt: nowMs() });
  return state;
};

const touchPricingState = (event: H3Event, state: PricingState) => {
  const sessionId = getCookie(event, PRICING_SESSION_COOKIE);
  if (!sessionId) {
    return;
  }

  persistStoredPricing(sessionId, { state, updatedAt: nowMs() });
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
  const item: PriceSettingsInterface = { ...input, _id: `price-setting-${state.sequence++}`, linked: false };
  state.pricing.push(item);
  touchPricingState(event, state);
  return clonePricing(item);
};

export const updateMockPricing = (event: H3Event, id: string, input: ReturnType<typeof parseMockPricingInput>) => {
  const state = getPricingState(event);
  const index = state.pricing.findIndex((item) => item._id === id);
  if (index < 0) return null;
  state.pricing[index] = { ...input, _id: id, linked: state.pricing[index].linked };
  touchPricingState(event, state);
  return clonePricing(state.pricing[index]);
};

export const deleteMockPricing = (event: H3Event, id: string) => {
  const state = getPricingState(event);
  const index = state.pricing.findIndex((item) => item._id === id);
  if (index < 0) return false;
  state.pricing.splice(index, 1);
  touchPricingState(event, state);
  return true;
};

export const resetMockPricingSession = (event: H3Event) => {
  const sessionId = getCookie(event, PRICING_SESSION_COOKIE);
  if (sessionId) {
    removeStoredPricing(sessionId);
  }

  return getMockPricing(event);
};
