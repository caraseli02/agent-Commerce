import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveSessionUserId } from '../app/utils/sessionUser';

const authStore = {
  userDetails: null as unknown,
  getToken: vi.fn<() => string | null>(),
  addUserDetail: vi.fn((user: unknown) => {
    authStore.userDetails = user;
  }),
};
const fetchUserDetails = vi.fn();

vi.mock('#app', () => ({
  defineNuxtPlugin: (setup: (nuxtApp: unknown) => unknown) => setup,
}));
vi.mock('~/store/authStore', () => ({ useAuthStore: () => authStore }));
vi.mock('~/composables/api/auth', () => ({ fetchUserDetails: (...args: unknown[]) => fetchUserDetails(...args) }));

const mockToken = (userId: string, issuedAt = Date.now()) => `demo-token::${userId}::${issuedAt}`;
const jwt = (payload: Record<string, unknown>) => `header.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.signature`;

const runPlugin = async (mockMode = true) => {
  const { default: plugin } = await import('../app/plugins/auth-session.server');
  await (plugin as unknown as (nuxtApp: unknown) => Promise<void>)({ $config: { public: { MOCK_MODE: mockMode } } });
};

describe('resolveSessionUserId', () => {
  it('reads the user id from a live mock token', () => {
    expect(resolveSessionUserId(mockToken('mock-customer-1'), true)).toBe('mock-customer-1');
  });

  it('identifies nobody for missing, expired or unknown mock tokens', () => {
    expect(resolveSessionUserId(null, true)).toBeNull();
    expect(resolveSessionUserId(mockToken('mock-customer-1', Date.now() - 2 * 60 * 60 * 1000), true)).toBeNull();
    expect(resolveSessionUserId(mockToken('someone-else'), true)).toBeNull();
  });

  it('reads user_id from a JWT payload outside mock mode', () => {
    expect(resolveSessionUserId(jwt({ user_id: 'uid-ü' }), false)).toBe('uid-ü');
    expect(resolveSessionUserId(jwt({ sub: 'uid' }), false)).toBeNull();
    expect(resolveSessionUserId('not-a-jwt', false)).toBeNull();
  });
});

describe('auth session SSR plugin', () => {
  beforeEach(() => {
    authStore.userDetails = null;
    authStore.getToken.mockReset();
    authStore.addUserDetail.mockClear();
    fetchUserDetails.mockReset();
  });

  it('loads the signed-in user details so SSR prices match the hydrated client', async () => {
    const token = mockToken('mock-customer-1');
    const user = { _id: 'mock-customer-1', adminSettings: { discount: { value: 5 } } };
    authStore.getToken.mockReturnValue(token);
    fetchUserDetails.mockResolvedValue({ status: 'success', data: user });

    await runPlugin();

    expect(fetchUserDetails).toHaveBeenCalledWith('mock-customer-1', token);
    expect(authStore.userDetails).toEqual(user);
  });

  it('does nothing for guests or tokens that identify nobody', async () => {
    authStore.getToken.mockReturnValue(null);
    await runPlugin();
    authStore.getToken.mockReturnValue('garbage');
    await runPlugin();

    expect(fetchUserDetails).not.toHaveBeenCalled();
    expect(authStore.addUserDetail).not.toHaveBeenCalled();
  });

  it('keeps guest pricing when the details request fails', async () => {
    authStore.getToken.mockReturnValue(mockToken('mock-customer-1'));
    fetchUserDetails.mockRejectedValue(new Error('401'));

    await expect(runPlugin()).resolves.toBeUndefined();
    expect(authStore.userDetails).toBeNull();
  });
});
