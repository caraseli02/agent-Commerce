// Crawl policy for robots.txt and the public sitemap. Pure helpers so the route
// handlers stay thin and the rules are unit-testable without a Nitro server.

// Keep in sync with the noindex policy for private routes (#186).
export const CRAWL_PRIVATE_PATH_PREFIXES = [
  '/dashboard',
  '/checkout',
  '/cart',
  '/order-summary',
  '/order-tracking',
  '/login',
  '/signup',
  '/forgot-password',
  '/password-reset',
  '/verify-email',
  '/product/categories',
] as const;

type SitemapProduct = { _id?: string; alias?: string };

export const buildRobotsTxt = (origin: string): string =>
  [
    'User-agent: *',
    'Allow: /',
    ...CRAWL_PRIVATE_PATH_PREFIXES.map((prefix) => `Disallow: ${prefix}`),
    '',
    `Sitemap: ${origin}/sitemap.xml`,
    '',
  ].join('\n');

export const buildPublicSitemapPaths = (products: readonly SitemapProduct[]): string[] => [
  '/',
  '/search',
  ...products.flatMap((product) => {
    const slug = product.alias || product._id;
    return slug ? [`/product/${slug}`] : [];
  }),
];

const escapeXml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

export const buildSitemapXml = (origin: string, paths: readonly string[]): string => {
  const urls = paths.map((path) => `  <url>\n    <loc>${escapeXml(new URL(path, origin).href)}</loc>\n  </url>`);

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n');
};
