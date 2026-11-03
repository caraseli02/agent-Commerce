import { inventory, MAX_AVAILABILITY_BATCH } from '~~/server/domain/inventory';

const PRODUCT_ID = /^[\w-]{1,64}$/;

// Stock changes with every checkout. server/middleware/api-cache-policy.ts keeps browsers and
// CDNs from reusing a response; this handler deliberately skips the anonymous catalog cache.
export default defineEventHandler(async (event) => {
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
