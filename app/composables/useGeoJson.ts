import type { LeafletMapDataType } from '~~/types/geo';

let geoJsonCache: LeafletMapDataType | null = null;
let geoJsonPromise: Promise<LeafletMapDataType> | null = null;

export function fetchGeoJson(): Promise<LeafletMapDataType> {
  if (geoJsonCache) {
    return Promise.resolve(geoJsonCache);
  }

  if (!geoJsonPromise) {
    geoJsonPromise = $fetch<LeafletMapDataType>('/data/geojson.json')
      .then((data) => {
        geoJsonCache = data;
        return data;
      })
      .catch((requestError) => {
        geoJsonPromise = null;
        throw requestError;
      });
  }

  return geoJsonPromise;
}

export function useGeoJson() {
  const geoJson = useState<LeafletMapDataType | null>('geo-json-reference', () => null);
  const pending = useState('geo-json-reference-pending', () => false);
  const error = useState<Error | null>('geo-json-reference-error', () => null);

  const load = async () => {
    if (geoJson.value) {
      return geoJson.value;
    }

    pending.value = true;
    error.value = null;

    try {
      geoJson.value = await fetchGeoJson();
      return geoJson.value;
    } catch (loadError) {
      error.value = loadError instanceof Error ? loadError : new Error('Failed to load geojson');
      throw error.value;
    } finally {
      pending.value = false;
    }
  };

  if (import.meta.client) {
    void load().catch(() => undefined);
  }

  return {
    geoJson,
    pending,
    error,
    load,
  };
}
