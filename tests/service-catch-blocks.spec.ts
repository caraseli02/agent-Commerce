import { afterEach, describe, expect, it, vi } from 'vitest';
import { __setMockApiClient, __setMockRuntimeConfig } from './mocks/nuxt-app';

describe('service catch blocks', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    __setMockRuntimeConfig({ public: {} });
  });

  it('propagates API client rejections from auth and user helpers', async () => {
    const error = new Error('mock failure');
    __setMockApiClient(async () => {
      throw error;
    });
    __setMockRuntimeConfig({ public: { MOCK_MODE: true, BASE_URL_API: 'https://api.example.com' } });
    vi.stubGlobal('$fetch', async () => {
      throw error;
    });

    const { login } = await import('../composables/api/auth');
    const { resetPasswordLink, resetPassword } = await import('../composables/api/user');

    await expect(login({} as never)).rejects.toThrow('mock failure');
    await expect(resetPasswordLink('user@example.com')).rejects.toThrow('mock failure');
    await expect(resetPassword('user@example.com', 'new-password', 'code-123')).rejects.toThrow('mock failure');
  });
});
