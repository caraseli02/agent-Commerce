import { format, isValid, parseISO } from 'date-fns';

/** Reviewer-visible date-only fields (registration, due dates, pickup estimates). */
export const REVIEWER_DATE_FORMAT = 'dd MMMM yyyy';

/** Reviewer-visible date-time fields (orders, transactions, activity). */
export const REVIEWER_DATETIME_FORMAT = 'dd MMMM yyyy, HH:mm';

export const REVIEWER_DATE_FALLBACK = '—';

function toDate(value: string | Date | null | undefined): Date | null {
  if (value == null || value === '') {
    return null;
  }

  const date = value instanceof Date ? value : parseISO(value);

  return isValid(date) ? date : null;
}

export function formatReviewerDate(value: string | Date | null | undefined): string {
  const date = toDate(value);

  if (!date) {
    return REVIEWER_DATE_FALLBACK;
  }

  // Avoid date-fns/locale barrel imports — Nitro SSR rejects directory ESM resolution.
  return format(date, REVIEWER_DATE_FORMAT);
}

export function formatReviewerDateTime(value: string | Date | null | undefined): string {
  const date = toDate(value);

  if (!date) {
    return REVIEWER_DATE_FALLBACK;
  }

  return format(date, REVIEWER_DATETIME_FORMAT);
}
