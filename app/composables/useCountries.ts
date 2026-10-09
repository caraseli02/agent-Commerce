import type { CountryReference } from '~~/types/geo';

let countriesCache: CountryReference[] | null = null;
let countriesPromise: Promise<CountryReference[]> | null = null;

export function fetchCountries(): Promise<CountryReference[]> {
  if (countriesCache) {
    return Promise.resolve(countriesCache);
  }

  if (!countriesPromise) {
    countriesPromise = $fetch<CountryReference[]>('/data/countries.json')
      .then((data) => {
        countriesCache = data;
        return data;
      })
      .catch((requestError) => {
        countriesPromise = null;
        throw requestError;
      });
  }

  return countriesPromise;
}

export function useCountries() {
  const countries = useState<CountryReference[]>('geo-countries-reference', () => []);
  const pending = useState('geo-countries-reference-pending', () => false);
  const error = useState<Error | null>('geo-countries-reference-error', () => null);

  const load = async () => {
    if (countries.value.length > 0) {
      return countries.value;
    }

    pending.value = true;
    error.value = null;

    try {
      countries.value = await fetchCountries();
      return countries.value;
    } catch (loadError) {
      error.value = loadError instanceof Error ? loadError : new Error('Failed to load countries');
      throw error.value;
    } finally {
      pending.value = false;
    }
  };

  if (import.meta.client) {
    void load().catch(() => undefined);
  }

  return {
    countries,
    pending,
    error,
    load,
  };
}
