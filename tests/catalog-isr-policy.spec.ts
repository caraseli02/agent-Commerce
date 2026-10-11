import { describe, expect, it } from 'vitest';
import middleware, { isAnonymousCatalogPage, isCatalogPage } from '~~/server/catalog-isr-policy.mjs';
import { rewrite } from '@vercel/functions/middleware';

const anonymousHeaders = () => new Headers();

describe('catalog ISR edge policy', () => {
  it('allows anonymous GET and HEAD catalog requests', () => {
    const url = new URL('https://shop.example/search');
    expect(isAnonymousCatalogPage(url, 'GET', anonymousHeaders())).toBe(true);
    expect(isAnonymousCatalogPage(url, 'HEAD', anonymousHeaders())).toBe(true);
    expect(isCatalogPage(new URL('https://shop.example/search/'))).toBe(true);
    expect(isCatalogPage(new URL('https://shop.example/product/red-shoes/'))).toBe(true);
    expect(isCatalogPage(new URL('https://shop.example/search/_payload.json/?_b=1'))).toBe(false);
  });

  it.each([
    ['empty Cookie header', new Headers({ Cookie: '' })],
    ['empty Authorization header', new Headers({ Authorization: '' })],
  ])('blocks requests with an %s', (_label, headers) => {
    expect(isAnonymousCatalogPage(new URL('https://shop.example/search'), 'GET', headers)).toBe(false);
  });

  it('guards aliases globally and leaves private routes direct', () => {
    for (const path of ['/search-isr', '/search%2Disr', '/product/[slug]-isr', '/search/_payload.json-isr']) {
      expect(middleware(new Request(`https://shop.example${path}`)).status).toBe(404);
    }
    for (const path of ['/account', '/cart', '/checkout', '/dashboard', '/product/categories']) {
      const response = middleware(new Request(`https://shop.example${path}`));
      expect(response.headers.get('x-middleware-next')).toBe('1');
      expect(response.headers.has('x-middleware-rewrite')).toBe(false);
    }
    expect(isCatalogPage(new URL('https://shop.example/search?&'))).toBe(false);
    for (const name of ['x-user-id', 'x-customer-id', 'x-session-id']) {
      expect(isAnonymousCatalogPage(new URL('https://shop.example/search'), 'GET', new Headers({ [name]: '' }))).toBe(false);
    }
  });

  it('rejects unrelated query parameters for page routes and accepts one _b on payloads', () => {
    expect(isCatalogPage(new URL('https://shop.example/search?sort=price'))).toBe(false);
    expect(isCatalogPage(new URL('https://shop.example/search?_b=1'))).toBe(false);
    expect(isCatalogPage(new URL('https://shop.example/search/_payload.json?_b=1'))).toBe(true);
    expect(isCatalogPage(new URL('https://shop.example/search/_payload.json?_b=1&_b=2'))).toBe(false);
    expect(isCatalogPage(new URL('https://shop.example/search/_payload.json?_b=1&sort=price'))).toBe(false);
  });

  it('keeps private routes, category paths, unsafe slugs, and non-GET requests out', () => {
    for (const path of [
      '/account',
      '/category/shoes',
      '/categories/shoes',
      '/product/categories',
      '/product/Two-words',
      '/product/a%2Db',
      '/product/shoes/details',
    ]) {
      expect(isCatalogPage(new URL(`https://shop.example${path}`))).toBe(false);
    }
    expect(isAnonymousCatalogPage(new URL('https://shop.example/search'), 'POST', anonymousHeaders())).toBe(false);
  });

  it('rejects encoded catalog prefixes and separators before routing', () => {
    for (const path of ['/%73earch', '/%70roduct/red-shoes', '/product%2Fred-shoes', '/product/a%2Db', '/search%2F_payload.json']) {
      const response = middleware(new Request(`https://shop.example${path}`));
      expect(response.status).toBe(400);
      expect(response.headers.get('cdn-cache-control')).toBe('no-store');
    }
  });

  it('rejects attempts to supply reserved routing metadata', () => {
    const reservedQuery = middleware(new Request('https://shop.example/account?__isr_route=%2Fsearch'));
    const reservedHeader = middleware(
      new Request('https://shop.example/account', {
        headers: { 'x-now-route-matches': 'spoofed' },
      }),
    );
    expect(reservedQuery.status).toBe(400);
    expect(reservedHeader.status).toBe(400);
    expect(reservedHeader.headers.get('cache-control')).toBe('private, no-store');
  });

  it('rewrites private requests with the original path and query and forwards Cookie and Authorization', () => {
    const response = middleware(
      new Request('https://shop.example/search?next=%2Forders&tab=recent', {
        headers: { Cookie: 'session=abc', Authorization: 'Bearer secret' },
      }),
    );
    const rewrite = new URL(response.headers.get('x-middleware-rewrite')!);
    const overrides = response.headers.get('x-middleware-override-headers')!.split(',');

    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('cdn-cache-control')).toBe('no-store');
    expect(rewrite.pathname).toBe('/__fallback');
    expect(rewrite.searchParams.get('__isr_route')).toBe('/search');
    expect(rewrite.searchParams.get('next')).toBe('/orders');
    expect(rewrite.searchParams.get('tab')).toBe('recent');
    expect(overrides).toContain('cookie');
    expect(overrides).toContain('authorization');
    expect(response.headers.get('x-middleware-request-cookie')).toBe('session=abc');
    expect(response.headers.get('x-middleware-request-authorization')).toBe('Bearer secret');
    expect(overrides).not.toContain('x-now-route-matches');
  });

  it('routes catalog requests with unsupported query strings through the fallback', () => {
    const response = middleware(new Request('https://shop.example/search?sort=price'));
    expect(response.headers.get('x-middleware-next')).toBeNull();
    expect(new URL(response.headers.get('x-middleware-rewrite')!).pathname).toBe('/__fallback');
  });

  it('matches the installed Vercel rewrite helper protocol including empty identity headers', () => {
    const request = new Request('https://shop.example/search?keyword=stm32', { headers: { Cookie: '', Authorization: '' } });
    const actual = middleware(request);
    const destination = new URL('/__fallback?keyword=stm32&__isr_route=%2Fsearch', request.url);
    const expected = rewrite(destination, {
      request: { headers: request.headers },
      headers: {
        'Cache-Control': 'private, no-store',
        'CDN-Cache-Control': 'no-store',
        'Vercel-CDN-Cache-Control': 'no-store',
      },
    });
    expect([...actual.headers]).toEqual([...expected.headers]);
  });
});
