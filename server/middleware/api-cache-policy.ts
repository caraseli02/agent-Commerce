import { defineEventHandler, getRequestHeader, getRequestURL, setResponseHeader } from 'h3';

// Public catalog caching is a separate policy. Unknown API reads stay private,
// so adding a personalized endpoint cannot silently opt into shared caching.
const anonymousCatalogRead = /^\/api\/(?:categories|products\/[^/]+)\/?$/;

export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname;
  if (path !== '/api' && !path.startsWith('/api/')) return;

  const readOnly = event.method === 'GET' || event.method === 'HEAD';
  const carriesIdentity = !!getRequestHeader(event, 'authorization') || !!getRequestHeader(event, 'cookie');
  if (readOnly && !carriesIdentity && anonymousCatalogRead.test(path)) return;

  event.context.privateApiCachePolicy = true;
  setResponseHeader(event, 'Cache-Control', 'private, no-store, max-age=0, must-revalidate');
  // CDN-specific directives take precedence over Cache-Control at the edge.
  setResponseHeader(event, 'CDN-Cache-Control', 'no-store');
  setResponseHeader(event, 'Vercel-CDN-Cache-Control', 'no-store');
});
