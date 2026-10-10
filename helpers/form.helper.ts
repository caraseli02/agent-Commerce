import type { CountryReference } from '~~/types/geo';
import type { CountryInterface, RegionInterface } from '~~/types/dashboard/control-panel';

export const getRegionByCountry = (countriesList: CountryReference[], country: unknown, region: unknown) => {
  const countryToFind = countriesList.find((obj) => obj.value === country) as CountryInterface;

  if (!countryToFind) {
    return null;
  }

  const regionToFind = countryToFind?.regions.find((obj) => obj.name === region) as RegionInterface;
  const formRegion = {} as {
    value: string;
    label: string;
  };

  formRegion.value = regionToFind?.name;
  formRegion.label = regionToFind?.name;

  const regions =
    countryToFind.regions.map((e) => {
      return {
        label: e.name,
        value: e.name,
      };
    }) || [];
  return { country: countryToFind, region: formRegion, regions: regions };
};
