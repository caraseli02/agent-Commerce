import { defineEventHandler, getRequestURL, setResponseHeader } from 'h3';

export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname;
  if (path !== '/api' && !path.startsWith('/api/')) return;

  // Catalog SWR is server-only. An edge cache looks up before middleware and
  // cannot safely rely on an origin identity check (or universal Vary support).
  event.context.privateApiCachePolicy = true;
  setResponseHeader(event, 'Cache-Control', 'private, no-store, max-age=0, must-revalidate');
  // CDN-specific directives take precedence over Cache-Control at the edge.
  setResponseHeader(event, 'CDN-Cache-Control', 'no-store');
  setResponseHeader(event, 'Vercel-CDN-Cache-Control', 'no-store');
});
