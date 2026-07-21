/** Lightweight path/category index for demo taxonomy product counts (mirrors mockProducts). */
export const demoProductTaxonomy = [
  { path: 'accessories/backpack', category: 'Accessories' },
  { path: 'accessories/cable', category: 'Accessories' },
  { path: 'accessories/stand', category: 'Accessories' },
  { path: 'audio/headphones', category: 'Audio' },
  { path: 'audio/microphone', category: 'Audio' },
  { path: 'audio/speaker', category: 'Audio' },
  { path: 'components/headset', category: 'Components' },
  { path: 'components/mouse', category: 'Components' },
  { path: 'components/ssd', category: 'Components' },
  { path: 'electronics/camera', category: 'Electronics' },
  { path: 'electronics/monitor', category: 'Electronics' },
  { path: 'electronics/router', category: 'Electronics' },
  { path: 'electronics/tablet', category: 'Electronics' },
  { path: 'home/air-purifier', category: 'Home' },
  { path: 'home/coffee-maker', category: 'Home' },
  { path: 'office/desk-lamp', category: 'Office' },
  { path: 'passives/diodes', category: 'Passives' },
  { path: 'semiconductors/interface-ics', category: 'Semiconductors' },
  { path: 'semiconductors/microcontrollers', category: 'Semiconductors' },
  { path: 'tools/drill', category: 'Tools' },
  { path: 'tools/saw', category: 'Tools' },
  { path: 'tools/wrench-set', category: 'Tools' },
  { path: 'wearables/earbuds', category: 'Wearables' },
  { path: 'wearables/smartwatch', category: 'Wearables' },
] as const;

export function slugifyCategoryName(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Count demo products that match a category name via top-level category or path segment. */
export function countDemoProductsForCategory(name: string): number {
  const lower = name.toLowerCase();
  const slug = slugifyCategoryName(name);
  if (!slug) return 0;

  return demoProductTaxonomy.filter((entry) => {
    if (entry.category.toLowerCase() === lower) return true;
    return entry.path.split('/').includes(slug);
  }).length;
}
