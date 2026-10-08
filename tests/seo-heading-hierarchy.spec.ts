import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(path), 'utf8');
const h1Count = (source: string) => (source.match(/<h1[\s>]/g) ?? []).length;

describe('heading hierarchy (#189)', () => {
  it('keeps the home hero as the single home page h1', () => {
    expect(h1Count(read('components/home/Hero.vue'))).toBe(1);
    expect(h1Count(read('pages/index.vue'))).toBe(0);
  });

  it('does not render an h1 inside the global header mega-menu banner', () => {
    const source = read('components/layout/header/main-menu/BannerNew.vue');

    expect(h1Count(source)).toBe(0);
    expect(source).toContain('<h2 id="hero-title"');
    expect(source).toContain('aria-labelledby="hero-title"');
  });

  it('gives search exactly one page-level h1 that is independent of result state', () => {
    const heading = read('components/search/Heading.vue');
    const page = read('pages/search.vue');

    expect(h1Count(heading)).toBe(1);
    expect(heading).toContain('Search results for');
    expect(heading).toContain('Browse products');
    expect(page).toContain('<SearchHeading :keyword="keyword" />');
    expect(h1Count(page)).toBe(0);
    expect(h1Count(read('components/search/Products.vue'))).toBe(0);
    expect(h1Count(read('components/global/Banner.vue'))).toBe(0);
  });

  it('keeps the product name as the product page h1', () => {
    const source = read('components/product/Details.vue');

    expect(h1Count(source)).toBe(1);
    expect(source).toMatch(/<h1[^>]*>[\s\S]*?<\/h1>/);
  });
});
