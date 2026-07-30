import { slugifyCategoryName, toCategorySlugSegments } from '~/helpers/categoryPath.helper';

/**
 * Lightweight path/category index for demo taxonomy product counts (mirrors mockProducts).
 * `taxonomyPath` mirrors `details.SummaryData.TaxonomyPath` so deep taxonomy leaves can be counted too.
 */
export const demoProductTaxonomy = [
  { path: 'accessories/backpack', category: 'Accessories', taxonomyPath: 'Accessories > Bags > Backpacks' },
  { path: 'accessories/cable', category: 'Accessories', taxonomyPath: 'Accessories > Cables > USB-C' },
  { path: 'accessories/stand', category: 'Accessories', taxonomyPath: 'Accessories > Stands > Laptop' },
  { path: 'audio/headphones', category: 'Audio', taxonomyPath: 'Audio > Headphones > Wireless' },
  { path: 'audio/microphone', category: 'Audio', taxonomyPath: 'Audio > Microphone > USB' },
  { path: 'audio/speaker', category: 'Audio', taxonomyPath: 'Audio > Speaker > Bluetooth' },
  { path: 'components/headset', category: 'Components', taxonomyPath: 'Components > Headset > Gaming' },
  { path: 'components/mouse', category: 'Components', taxonomyPath: 'Components > Mouse > Gaming' },
  { path: 'components/ssd', category: 'Components', taxonomyPath: 'Components > Storage > SSD' },
  { path: 'electronics/camera', category: 'Electronics', taxonomyPath: 'Electronics > Camera > Mirrorless' },
  { path: 'electronics/monitor', category: 'Electronics', taxonomyPath: 'Electronics > Monitor > 4K' },
  { path: 'electronics/router', category: 'Electronics', taxonomyPath: 'Electronics > Networking > Router' },
  { path: 'electronics/tablet', category: 'Electronics', taxonomyPath: 'Electronics > Tablet > Premium' },
  { path: 'home/air-purifier', category: 'Home', taxonomyPath: 'Home > Air Quality > Purifier' },
  { path: 'home/coffee-maker', category: 'Home', taxonomyPath: 'Home > Kitchen > Coffee Maker' },
  { path: 'office/desk-lamp', category: 'Office', taxonomyPath: 'Office > Lighting > Desk Lamp' },
  { path: 'passives/diodes', category: 'Passives', taxonomyPath: 'Passives > Diodes > Schottky' },
  { path: 'semiconductors/interface-ics', category: 'Semiconductors', taxonomyPath: 'Semiconductors > Interface ICs > RS-485' },
  {
    path: 'semiconductors/microcontrollers',
    category: 'Semiconductors',
    taxonomyPath: 'Semiconductors > Microcontrollers > ARM Cortex-M4',
  },
  { path: 'tools/drill', category: 'Tools', taxonomyPath: 'Tools > Power Tools > Drill' },
  { path: 'tools/saw', category: 'Tools', taxonomyPath: 'Tools > Power Tools > Saw' },
  { path: 'tools/wrench-set', category: 'Tools', taxonomyPath: 'Tools > Hand Tools > Mechanic Set' },
  { path: 'wearables/earbuds', category: 'Wearables', taxonomyPath: 'Wearables > Earbuds > Premium' },
  { path: 'wearables/smartwatch', category: 'Wearables', taxonomyPath: 'Wearables > Smartwatch > Premium' },
] as const;

export { slugifyCategoryName };

/** Count demo products that match a category name via top-level category or any taxonomy path segment. */
export function countDemoProductsForCategory(name: string): number {
  const lower = name.toLowerCase();
  const slug = slugifyCategoryName(name);
  if (!slug) return 0;

  return demoProductTaxonomy.filter((entry) => {
    if (entry.category.toLowerCase() === lower) return true;
    return [...toCategorySlugSegments(entry.path), ...toCategorySlugSegments(entry.taxonomyPath)].includes(slug);
  }).length;
}
