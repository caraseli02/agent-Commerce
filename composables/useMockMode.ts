/** Portfolio-demo mode backed only by this repository's sample Nitro routes. */

export const useMockMode = () => {
  const config = useRuntimeConfig();

  const isMockMode = computed(() => Boolean(config.public.MOCK_MODE));

  const getMockMode = (): boolean => isMockMode.value;

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
