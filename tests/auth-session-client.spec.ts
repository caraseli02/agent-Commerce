import { beforeEach, describe, expect, it, vi } from 'vitest';

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

const mockToken = (userId: string) => `demo-token::${userId}::${Date.now()}`;

const runPlugin = async () => {
  const { default: plugin } = await import('../app/plugins/auth-session.client');
  await (plugin as unknown as (nuxtApp: unknown) => Promise<void>)({ $config: { public: { MOCK_MODE: true } } });
};

describe('auth session client plugin', () => {
  beforeEach(() => {
    authStore.userDetails = null;
    authStore.getToken.mockReset();
    authStore.addUserDetail.mockClear();
    fetchUserDetails.mockReset();
  });

  it('reloads the user when the token cookie survives but local storage is empty', async () => {
    const token = mockToken('mock-customer-1');
    const user = { _id: 'mock-customer-1', contactDetails: { firstName: 'Demo' } };
    authStore.getToken.mockReturnValue(token);
    fetchUserDetails.mockResolvedValue({ status: 'success', data: user });

    await runPlugin();

    expect(fetchUserDetails).toHaveBeenCalledWith('mock-customer-1', token);
    expect(authStore.userDetails).toEqual(user);
  });

  it('keeps persisted details and skips guests', async () => {
    authStore.getToken.mockReturnValue(mockToken('mock-customer-1'));
    authStore.userDetails = { _id: 'mock-customer-1' };
    await runPlugin();
    authStore.userDetails = null;
    authStore.getToken.mockReturnValue(null);
    await runPlugin();

    expect(fetchUserDetails).not.toHaveBeenCalled();
  });

  it('leaves the store empty when the request fails', async () => {
    authStore.getToken.mockReturnValue(mockToken('mock-customer-1'));
    fetchUserDetails.mockRejectedValue(new Error('401'));

    await runPlugin();

    expect(authStore.addUserDetail).not.toHaveBeenCalled();
  });
});
