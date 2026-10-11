/** @typedef {Headers | Record<string, string | undefined>} HeaderBag */

const SAFE_PRODUCT_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ISR_ROUTE_PARAM = '__isr_route';
export const IDENTITY_HEADERS = ['cookie', 'authorization', 'x-user-id', 'x-customer-id', 'x-session-id'];
const ROUTE_MATCHES_HEADER = 'x-now-route-matches';
const NO_STORE_HEADERS = {
  'Cache-Control': 'private, no-store',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
};

/** @param {URL} url */
export function isCatalogPage(url) {
  let pathname = url.pathname;
  if (pathname.includes('%')) return false;
  if (pathname.endsWith('/')) pathname = pathname.slice(0, -1);

  let isPayload = false;
  if (pathname.endsWith('/_payload.json')) {
    isPayload = true;
    pathname = pathname.slice(0, -'/_payload.json'.length);
  }

  const isSearch = pathname === '/search';
  const productParts = pathname.match(/^\/product\/([^/]+)$/);
  const isProduct = Boolean(productParts && productParts[1] !== 'categories' && SAFE_PRODUCT_SLUG.test(productParts[1]));
  if (!isSearch && !isProduct) return false;

  const query = Array.from(url.searchParams.entries());
  return url.search === '' || (isPayload && query.length === 1 && query[0][0] === '_b');
}

/** @param {URL} url @param {string} method @param {HeaderBag} headers */
export function isAnonymousCatalogPage(url, method, headers) {
  const normalizedMethod = method.toUpperCase();
  if (normalizedMethod !== 'GET' && normalizedMethod !== 'HEAD') return false;
  if (!isCatalogPage(url)) return false;
  if (IDENTITY_HEADERS.some((name) => hasHeader(headers, name))) return false;
  return true;
}

/** @param {HeaderBag} headers @param {string} name */
function hasHeader(headers, name) {
  if ('has' in headers && typeof headers.has === 'function') return headers.has(name);
  if ('get' in headers && typeof headers.get === 'function') return headers.get(name) !== null;
  return Object.keys(headers).some((key) => key.toLowerCase() === name && headers[key] !== undefined);
}

/** @param {string} message */
function badRequest(message) {
  return new Response(message, { status: 400, headers: NO_STORE_HEADERS });
}

/** @param {Request} request */
export default function middleware(request) {
  const originalUrl = new URL(request.url);
  if (originalUrl.searchParams.has(ISR_ROUTE_PARAM)) {
    return badRequest(`Reserved query parameter: ${ISR_ROUTE_PARAM}`);
  }
  if (request.headers.has(ROUTE_MATCHES_HEADER)) {
    return badRequest(`Reserved request header: ${ROUTE_MATCHES_HEADER}`);
  }

  let decodedPath;
  try {
    decodedPath = decodeURIComponent(originalUrl.pathname);
  } catch {
    return badRequest('Invalid path');
  }
  if (/(?:^|\/)[^/]*-isr(?:\/|$)/.test(decodedPath)) {
    return new Response('Not Found', { status: 404, headers: NO_STORE_HEADERS });
  }
  // Global guard protects metadata and aliases. Only ISR-matching catalog
  // paths are rewritten: private categories and all other routes stay direct.
  if (
    !/^\/search(?:\/_payload\.json)?\/?$/.test(originalUrl.pathname) &&
    !/^\/product\/[^/]+(?:\/_payload\.json)?\/?$/.test(originalUrl.pathname)
  ) {
    return new Response(null, { headers: { 'x-middleware-next': '1' } });
  }
  if (/^\/product\/categories(?:\/_payload\.json)?\/?$/.test(originalUrl.pathname)) {
    return new Response(null, { headers: { ...NO_STORE_HEADERS, 'x-middleware-next': '1' } });
  }

  if (isAnonymousCatalogPage(originalUrl, request.method, request.headers)) {
    return new Response(null, { headers: { 'x-middleware-next': '1' } });
  }

  const rewriteUrl = new URL(originalUrl);
  rewriteUrl.pathname = '/__fallback';
  rewriteUrl.searchParams.set(ISR_ROUTE_PARAM, originalUrl.pathname);

  const forwardedHeaders = new Headers(request.headers);
  forwardedHeaders.delete(ROUTE_MATCHES_HEADER);
  const overrideNames = [];
  const responseHeaders = new Headers({
    ...NO_STORE_HEADERS,
    'x-middleware-rewrite': rewriteUrl.toString(),
  });
  for (const [name, value] of forwardedHeaders.entries()) {
    overrideNames.push(name);
    responseHeaders.set(`x-middleware-request-${name}`, value);
  }
  responseHeaders.set('x-middleware-override-headers', overrideNames.join(','));

  return new Response(null, {
    headers: responseHeaders,
  });
}
