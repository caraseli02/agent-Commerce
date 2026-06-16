/**
 * Mock Mode Security Implementation
 *
 * This composable provides secure mock mode functionality with multiple
 * validation layers to prevent accidental activation in production.
 *
 * SECURITY CRITICAL: Never modify these validation checks without security review.
 */

export const useMockMode = () => {
  const config = useRuntimeConfig();

  /**
     * CRITICAL: Multiple validation layers to prevent production activation
     * Mock mode is ONLY enabled if ALL conditions are met:
     * 1. Environment variable explicitly set to 'true'
     * 2. Running in development mode
     * 3. On whitelisted domain (localhost, 127.0.0.1, dev domains)
     * 4. Not in CI environment
     */
  const isMockMode = computed(() => {
    // Layer 1: Environment variable check
    const envMockMode = Boolean(config.public.MOCK_MODE);

    // Layer 2: Runtime environment check
    const isDev = import.meta.env.MODE === 'development';

    // Layer 3: Domain/IP whitelist check
    const allowedDomains = ['localhost', '127.0.0.1', 'dev.demo.app'];
    const isAllowedDomain = allowedDomains.some((domain) => {
      if (typeof window === 'undefined') {
        return true;
      }

      return window.location.hostname.includes(domain);
    });

    // Layer 4: Process environment check (Node.js)
    const isCI = process.env.CI === 'true';
    // CRITICAL: Mock mode ONLY if ALL conditions are met
    return envMockMode && isDev && isAllowedDomain && !isCI;
  });

  /**
     * Development-safe mock mode getter with security assertions
     *
     * @throws {Error} If mock mode is attempted in production
     */
  const getMockMode = (): boolean => {
    if (!isMockMode.value) {
      return false;
    }

    // Security assertion: Verify we're NOT in production
    if (process.env.NODE_ENV === 'production') {
      console.error('SECURITY ALERT: Mock mode attempted in production!');
      console.error('Immediate action required: Review environment variables');
      console.error('Current NODE_ENV:', process.env.NODE_ENV);
      console.error('Current MOCK_MODE:', config.public.MOCK_MODE);

      throw new Error('Mock mode is disabled in production');
    }

    // Security: Log mock mode activation in development
    if (import.meta.dev) {
      console.warn('[MOCK MODE] Mock mode is active');
      console.warn('[MOCK MODE] Ensure this is NOT committed or deployed to production');
    }

    return true;
  };

  /**
     * Assert that mock mode is active
     *
     * @throws {Error} If mock mode is not enabled
     */
  const assertMockMode = (message = 'Mock mode is not enabled'): void => {
    if (!getMockMode()) {
      throw new Error(message);
    }
  };

  /**
     * Assert that mock mode is NOT active
     *
     * @throws {Error} If mock mode is enabled
     */
  const assertNotMockMode = (message = 'Mock mode should not be enabled'): void => {
    if (getMockMode()) {
      throw new Error(message);
    }
  };

  /**
     * Safe wrapper for mock mode dependent code
     *
     * @param fn - Function to execute if mock mode is enabled
     * @param defaultValue - Value to return if mock mode is disabled
     * @returns Result of fn or defaultValue
     */
  const withMockMode = <T>(fn: () => T, defaultValue: T): T => {
    if (getMockMode()) {
      return fn();
    }
    return defaultValue;
  };

  /**
     * Execute different code paths based on mock mode
     *
     * @param mockFn - Function to execute in mock mode
     * @param realFn - Function to execute in real mode
     * @returns Result of appropriate function
     */
  const mockModeBranch = <T>(mockFn: () => T, realFn: () => T): T => {
    return getMockMode() ? mockFn() : realFn();
  };

  return {
    isMockMode: readonly(isMockMode),
    getMockMode,
    assertMockMode,
    assertNotMockMode,
    withMockMode,
    mockModeBranch,
  };
};
