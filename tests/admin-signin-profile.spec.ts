import { beforeAll, describe, expect, it, vi } from 'vitest';
import { withSessionAuthorization } from '../composables/api/authorization';

const installH3Mocks = () => {
  vi.stubGlobal('defineEventHandler', (handler: unknown) => handler);
  vi.stubGlobal('getHeaders', (event: { headers?: Record<string, string> }) => event.headers ?? {});
  vi.stubGlobal('getRouterParam', (event: { params?: Record<string, string> }, name: string) => event.params?.[name]);
  vi.stubGlobal('createError', (payload: { statusCode: number; statusMessage: string }) => {
    const error = new Error(payload.statusMessage) as Error & { statusCode?: number };
    error.statusCode = payload.statusCode;
    return error;
  });
};

type DetailsHandler = (event: unknown) => { status: string; data: { _id?: string; companyDetails?: { name?: string } } };

const loadDetailsHandler = async () => (await import('../server/api/user/[userId]/details.get')).default as unknown as DetailsHandler;

describe('Admin Preview sign-in profile', () => {
  beforeAll(installH3Mocks);

  it('keeps the freshly issued sign-in token when a stale session cookie exists', () => {
    const headers = withSessionAuthorization({ Authorization: 'Bearer demo-token::mock-admin-1::2' }, 'demo-token::mock-customer-1::1');

    expect(headers.get('Authorization')).toBe('Bearer demo-token::mock-admin-1::2');
  });

  it('adds the session token when the request has no explicit authorization', () => {
    const headers = withSessionAuthorization(undefined, 'demo-token::mock-admin-1::2');

    expect(headers.get('Authorization')).toBe('Bearer demo-token::mock-admin-1::2');
  });

  it('returns the admin profile for the admin sign-in token', async () => {
    const { createMockToken } = await import('../server/utils/mockUsers');
    const detailsHandler = await loadDetailsHandler();
    const headers = Object.fromEntries(withSessionAuthorization(undefined, createMockToken('mock-admin-1')).entries());

    const response = detailsHandler({ headers, params: { userId: 'mock-admin-1' } });

    expect(response.status).toBe('success');
    expect(response.data._id).toBe('mock-admin-1');
    expect(response.data.companyDetails?.name).toBe('Demo Company LLC');
  });

  it('rejects the admin profile for a customer token, the failure a stale cookie used to cause', async () => {
    const { createMockToken } = await import('../server/utils/mockUsers');
    const detailsHandler = await loadDetailsHandler();
    const headers = { authorization: `Bearer ${createMockToken('mock-customer-1')}` };

    expect(() => detailsHandler({ headers, params: { userId: 'mock-admin-1' } })).toThrow(expect.objectContaining({ statusCode: 403 }));
  });
});
