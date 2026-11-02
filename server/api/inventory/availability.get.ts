import { inventory, MAX_AVAILABILITY_BATCH } from '~~/server/domain/inventory';

const PRODUCT_ID = /^[\w-]{1,64}$/;

// Stock changes with every checkout, so no browser, CDN or server cache may reuse a response.
export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store');

  const raw = getQuery(event).ids;
  const ids = (Array.isArray(raw) ? raw.join(',') : String(raw ?? ''))
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

  if (!ids.length || ids.length > MAX_AVAILABILITY_BATCH || !ids.every((id) => PRODUCT_ID.test(id))) {
    throw createError({
      statusCode: 400,
      statusMessage: `Provide 1 to ${MAX_AVAILABILITY_BATCH} comma-separated product IDs in ids.`,
    });
  }

  try {
    return { status: 'success', data: await inventory.readAvailability(ids) };
  } catch {
    throw createError({ statusCode: 503, statusMessage: 'Stock availability is temporarily unavailable.' });
  }
});
