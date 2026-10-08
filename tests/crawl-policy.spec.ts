import { describe, expect, it } from 'vitest';
import { CRAWL_PRIVATE_PATH_PREFIXES, buildPublicSitemapPaths, buildRobotsTxt, buildSitemapXml } from '../server/utils/crawlPolicy';
import { mockProducts } from '../server/utils/mockProducts';

const ORIGIN = 'https://shop.example.test';

describe('crawl policy private path prefixes', () => {
  it('uses the canonical private prefix list shared with the noindex policy', () => {
    expect([...CRAWL_PRIVATE_PATH_PREFIXES]).toEqual([
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
    ]);
  });
});

describe('buildRobotsTxt', () => {
  it('allows the public storefront and disallows every private prefix', () => {
    const robots = buildRobotsTxt(ORIGIN);
    const lines = robots.split('\n');

    expect(lines[0]).toBe('User-agent: *');
    expect(lines[1]).toBe('Allow: /');
    for (const prefix of CRAWL_PRIVATE_PATH_PREFIXES) {
      expect(lines, `robots.txt must contain "Disallow: ${prefix}" so crawlers skip that private route`).toContain(`Disallow: ${prefix}`);
    }
  });

  it('references the sitemap on the request origin', () => {
    expect(buildRobotsTxt(ORIGIN)).toContain(`Sitemap: ${ORIGIN}/sitemap.xml`);
  });

  it('does not disallow the public storefront root', () => {
    expect(buildRobotsTxt(ORIGIN).split('\n')).not.toContain('Disallow: /');
  });
});

describe('buildPublicSitemapPaths', () => {
  it('includes the home page, search, and every mock product by alias', () => {
    const paths = buildPublicSitemapPaths(mockProducts);

    expect(paths[0]).toBe('/');
    expect(paths[1]).toBe('/search');
    expect(paths).toContain('/product/stm32f407vgt6');
    expect(paths).toHaveLength(2 + mockProducts.length);
  });

  it('falls back to _id when a product has no alias', () => {
    const paths = buildPublicSitemapPaths([{ _id: 'prod-99', alias: '' }]);

    expect(paths).toEqual(['/', '/search', '/product/prod-99']);
  });

  it('omits private and checkout routes', () => {
    const paths = buildPublicSitemapPaths(mockProducts);
    const privatePaths = paths.filter((path) =>
      CRAWL_PRIVATE_PATH_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`)),
    );

    expect(privatePaths).toEqual([]);
    expect(paths.some((path) => path.startsWith('/dashboard'))).toBe(false);
    expect(paths.some((path) => path.startsWith('/checkout'))).toBe(false);
    expect(paths.some((path) => path.startsWith('/login'))).toBe(false);
  });
});

describe('buildSitemapXml', () => {
  it('starts with an XML prolog and a sitemaps.org urlset', () => {
    const xml = buildSitemapXml(ORIGIN, ['/']);

    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml.trimEnd().endsWith('</urlset>')).toBe(true);
  });

  it('emits absolute locations resolved against the origin', () => {
    const xml = buildSitemapXml(ORIGIN, ['/', '/search', '/product/stm32f407vgt6']);

    expect(xml).toContain(`<loc>${ORIGIN}/</loc>`);
    expect(xml).toContain(`<loc>${ORIGIN}/search</loc>`);
    expect(xml).toContain(`<loc>${ORIGIN}/product/stm32f407vgt6</loc>`);
  });

  it('escapes XML-significant characters in locations', () => {
    const xml = buildSitemapXml(ORIGIN, ['/search?q=a&b=<c>"d"\'e\'']);

    expect(xml).toContain('<loc>https://shop.example.test/search?q=a&amp;b=%3Cc%3E%22d%22%27e%27</loc>');
    expect(xml).not.toContain('&b=');
  });

  it('lists the mock product URLs', () => {
    const xml = buildSitemapXml(ORIGIN, buildPublicSitemapPaths(mockProducts));

    expect(xml.match(/<url>/g)).toHaveLength(2 + mockProducts.length);
    for (const product of mockProducts) {
      expect(xml).toContain(`<loc>${ORIGIN}/product/${product.alias || product._id}</loc>`);
    }
  });
});
