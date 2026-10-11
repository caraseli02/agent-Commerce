import { send, setResponseHeaders, setResponseStatus } from 'h3';
import type { NitroErrorHandler } from 'nitropack/types';

// Nitro sends formatter fallbacks before beforeResponse and overwrites 404
// Cache-Control. Restore the catalog contract after formatting, before send.
const handler: NitroErrorHandler = async (error, event, { defaultHandler }) => {
  if (event.handled || event.context.catalogPageCachePolicy !== true) return;
  const response = await defaultHandler(error, event, { json: true });
  setResponseHeaders(event, response.headers);
  setResponseStatus(event, response.status, response.statusText);
  setResponseHeaders(event, {
    'Cache-Control': 'private, no-store',
    'CDN-Cache-Control': 'no-store',
    'Vercel-CDN-Cache-Control': 'no-store',
  });
  await send(event, JSON.stringify(response.body, null, 2));
};
export default handler;
