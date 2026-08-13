import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const homeMerchSurfaces = [
  {
    path: 'components/global/Manufacturers.vue',
    layoutMarker: 'md:justify-between',
    reason: 'seven static logos fit a responsive flex row without carousel JS',
  },
  {
    path: 'components/global/News.vue',
    layoutMarker: 'xl:grid-cols-4',
    reason: 'four news cards fit a responsive CSS grid without pagination',
  },
];

describe('home merchandising swiper reduction (#399)', () => {
  homeMerchSurfaces.forEach(({ path, layoutMarker, reason }) => {
    it(`${path} no longer depends on Swiper (${reason})`, () => {
      const source = readFileSync(resolve(path), 'utf8');

      expect(source).not.toContain('Swiper');
      expect(source).not.toContain("from 'swiper'");
      expect(source).toContain(layoutMarker);
    });
  });

  it('home page still lazy-loads merchandising sections that retain Swiper carousels', () => {
    const source = readFileSync(resolve('pages/index.vue'), 'utf8');

    expect(source).toContain('LazyEcxlusiveOffer');
    expect(source).toContain('LazyNews');
    expect(source).toContain('LazyManufacturers');
  });
});
