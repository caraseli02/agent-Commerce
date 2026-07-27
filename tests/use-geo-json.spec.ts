import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { LeafletMapDataType } from '~/types/geo';

const geoJson: LeafletMapDataType = {
  type: 'FeatureCollection',
  features: [],
};

describe('GeoJSON reference loader', () => {
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

  it('lets concurrent consumers await the same in-flight map request', async () => {
    let resolveRequest: (value: LeafletMapDataType) => void = () => undefined;
    const request = new Promise<LeafletMapDataType>((resolve) => {
      resolveRequest = resolve;
    });
    const fetchMock = vi.fn(() => request);
    vi.stubGlobal('$fetch', fetchMock);

    const { useGeoJson } = await import('../composables/useGeoJson');
    const firstConsumer = useGeoJson();
    const secondConsumer = useGeoJson();

    const firstLoad = firstConsumer.load();
    const secondLoad = secondConsumer.load();
    resolveRequest(geoJson);

    await expect(firstLoad).resolves.toEqual(geoJson);
    await expect(secondLoad).resolves.toEqual(geoJson);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries a map request after a transient failure', async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new Error('temporary failure')).mockResolvedValueOnce(geoJson);
    vi.stubGlobal('$fetch', fetchMock);

    const { useGeoJson } = await import('../composables/useGeoJson');
    const { load } = useGeoJson();

    await expect(load()).rejects.toThrow('temporary failure');
    await expect(load()).resolves.toEqual(geoJson);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('reuses successfully loaded map data without another request', async () => {
    const fetchMock = vi.fn().mockResolvedValue(geoJson);
    vi.stubGlobal('$fetch', fetchMock);

    const { fetchGeoJson } = await import('../composables/useGeoJson');

    await expect(fetchGeoJson()).resolves.toEqual(geoJson);
    await expect(fetchGeoJson()).resolves.toEqual(geoJson);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
