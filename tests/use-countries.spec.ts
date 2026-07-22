import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CountryReference } from '~/types/geo';

const countries: CountryReference[] = [
  {
    label: 'Spain',
    value: 'ES',
    icon: 'es',
    regions: [{ name: 'Madrid', shortCode: 'MD' }],
  },
];

describe('country reference loader', () => {
  beforeEach(() => {
    vi.resetModules();

    const state = new Map<string, { value: unknown }>();
    vi.stubGlobal('useState', <T>(key: string, init: () => T) => {
      if (!state.has(key)) {
        state.set(key, { value: init() });
      }

      return state.get(key);
    });
  });

  it('lets concurrent consumers await the same in-flight country request', async () => {
    let resolveRequest: (value: CountryReference[]) => void = () => undefined;
    const request = new Promise<CountryReference[]>((resolve) => {
      resolveRequest = resolve;
    });
    const fetchMock = vi.fn(() => request);
    vi.stubGlobal('$fetch', fetchMock);

    const { useCountries } = await import('../composables/useCountries');
    const firstConsumer = useCountries();
    const secondConsumer = useCountries();

    const firstLoad = firstConsumer.load();
    const secondLoad = secondConsumer.load();
    resolveRequest(countries);

    await expect(firstLoad).resolves.toEqual(countries);
    await expect(secondLoad).resolves.toEqual(countries);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries a country request after a transient failure', async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new Error('temporary failure')).mockResolvedValueOnce(countries);
    vi.stubGlobal('$fetch', fetchMock);

    const { useCountries } = await import('../composables/useCountries');
    const { load } = useCountries();

    await expect(load()).rejects.toThrow('temporary failure');
    await expect(load()).resolves.toEqual(countries);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
