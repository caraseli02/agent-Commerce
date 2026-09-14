import { createHash } from 'node:crypto';

const normalize = (value: unknown): unknown =>
  Array.isArray(value)
    ? value.map(normalize)
    : value && typeof value === 'object'
      ? Object.fromEntries(
          Object.entries(value as Record<string, unknown>)
            .filter(([key, entry]) => key !== 'quotedAt' && entry !== undefined)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, entry]) => [key, normalize(entry)]),
        )
      : value;

/** Identifies the server quote a buyer reviewed without trusting browser money fields. */
export const createCheckoutReviewFingerprint = (cartRevision: string, quote: unknown) =>
  createHash('sha256')
    .update(JSON.stringify(normalize({ cartRevision, quote })))
    .digest('hex');
