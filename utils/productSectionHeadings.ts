export const PRODUCT_SECTION_HEADINGS: Record<string, string> = {
  featured: 'Featured Products',
  'best-sellers': 'Best-Selling Products',
  'hot-deals': 'Hot Deals',
  'top-searched': 'Top Searched Products',
};

export function getProductSectionHeading(slug: string): string {
  return PRODUCT_SECTION_HEADINGS[slug] ?? 'Products';
}
