import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearSessionNamespace } from '../server/utils/mockSessionStore';

const installH3Mocks = () => {
  vi.stubGlobal('defineEventHandler', (handler: unknown) => handler);
  vi.stubGlobal('readBody', async (event: { body?: unknown }) => event.body ?? {});
  vi.stubGlobal('getHeaders', (event: { headers?: Record<string, string> }) => event.headers ?? {});
  vi.stubGlobal('getRouterParam', (event: { params?: Record<string, string> }, name: string) => event.params?.[name]);
  vi.stubGlobal('getCookie', (event: { cookies?: Record<string, string> }, name: string) => event.cookies?.[name]);
  vi.stubGlobal('setCookie', (event: { cookies?: Record<string, string> }, name: string, value: string) => {
    event.cookies ??= {};
    event.cookies[name] = value;
  });
  vi.stubGlobal('createError', (payload: { statusCode: number; statusMessage: string }) => {
    const error = new Error(payload.statusMessage) as Error & { statusCode?: number; statusMessage?: string };
    error.statusCode = payload.statusCode;
    error.statusMessage = payload.statusMessage;
    return error;
  });
};

const createEvent = (
  overrides: {
    headers?: Record<string, string>;
    body?: unknown;
    cookies?: Record<string, string>;
    params?: Record<string, string>;
  } = {}
) => ({
  headers: overrides.headers || {},
  body: overrides.body || {},
  cookies: overrides.cookies || {},
  params: overrides.params || {},
});

let tempStoreDir = '';

describe('smart-pricing session persistence', () => {
  beforeAll(() => {
    installH3Mocks();
  });

  beforeEach(() => {
    tempStoreDir = mkdtempSync(join(tmpdir(), 'ecas-pricing-session-'));
    process.env.NUXT_PUBLIC_MOCK_MODE = 'true';
    process.env.MOCK_SESSION_STORE_DIR = tempStoreDir;
    clearSessionNamespace('pricing');
    vi.resetModules();
    installH3Mocks();
  });

  afterEach(() => {
    if (tempStoreDir) {
      rmSync(tempStoreDir, { recursive: true, force: true });
    }
    delete process.env.MOCK_SESSION_STORE_DIR;
  });

  it('survives a simulated server restart for the same reviewer session', async () => {
    const { createMockToken } = await import('../server/utils/mockUsers');
    const adminToken = createMockToken('mock-admin-1');
    const getPricing = (await import('../server/api/prices/price-settings.get')).default as unknown as (event: unknown) => {
      status: string;
      data: Array<{ _id: string; label: string }>;
    };
    const createPricing = (await import('../server/api/prices/price-setting.post')).default as (event: unknown) => Promise<{
      status: string;
      data: { id: string };
    }>;

    const browserSession = createEvent({
      headers: { authorization: `Bearer ${adminToken}` },
    });

    await getPricing(browserSession);
    const created = await createPricing({
      ...browserSession,
      body: { type: 0, range: { min: 100, max: 250 }, label: 'Restart range' },
    });

    const pricingSessionId = browserSession.cookies.ecas_pricing_session;
    expect(pricingSessionId).toBeDefined();

    vi.resetModules();
    installH3Mocks();

    const restartedGetPricing = (await import('../server/api/prices/price-settings.get')).default as unknown as (event: unknown) => {
      status: string;
      data: Array<{ _id: string; label: string }>;
    };

    const restartedPricing = restartedGetPricing({
      headers: { authorization: `Bearer ${adminToken}` },
      cookies: { ecas_pricing_session: pricingSessionId },
    });

    expect(restartedPricing.data.some((item) => item._id === created.data.id && item.label === 'Restart range')).toBe(true);
  });

  it('keeps pricing state isolated across browser sessions', async () => {
    const { createMockToken } = await import('../server/utils/mockUsers');
    const adminToken = createMockToken('mock-admin-1');
    const getPricing = (await import('../server/api/prices/price-settings.get')).default as unknown as (event: unknown) => {
      status: string;
      data: Array<{ _id: string }>;
    };
    const createPricing = (await import('../server/api/prices/price-setting.post')).default as (event: unknown) => Promise<{
      status: string;
      data: { id: string };
    }>;

    const sessionOne = createEvent({ headers: { authorization: `Bearer ${adminToken}` } });
    const sessionTwo = createEvent({ headers: { authorization: `Bearer ${adminToken}` } });

    await getPricing(sessionOne);
    await getPricing(sessionTwo);

    const created = await createPricing({
      ...sessionOne,
      body: { type: 0, range: { min: 50, max: 150 }, label: 'Isolated range' },
    });

    const isolatedPricing = getPricing(sessionTwo);
    expect(isolatedPricing.data).toHaveLength(3);
    expect(isolatedPricing.data.some((item) => item._id === created.data.id)).toBe(false);
  });
});
