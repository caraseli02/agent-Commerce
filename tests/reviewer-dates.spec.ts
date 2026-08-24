import { format, parseISO } from 'date-fns';
import { describe, expect, it } from 'vitest';

import { REVIEWER_DATE_FALLBACK, formatReviewerDate, formatReviewerDateTime } from '~/helpers/reviewer-dates';

describe('reviewer date formatting', () => {
  it('formats valid ISO timestamps for reviewer-facing date-time fields', () => {
    const iso = '2026-07-10T10:30:00.000Z';
    // Keep ISO-Z coverage without assuming the runner timezone is UTC.
    expect(formatReviewerDateTime(iso)).toBe(format(parseISO(iso), 'dd MMMM yyyy, HH:mm'));
  });

  it('formats valid ISO timestamps for reviewer-facing date-only fields', () => {
    const iso = '2026-03-31T00:00:00.000Z';
    expect(formatReviewerDate(iso)).toBe(format(parseISO(iso), 'dd MMMM yyyy'));
  });

  it('keeps date-only strings and Date inputs on the supported date-fns 4 path', () => {
    const dateOnly = '2026-08-24';
    const date = new Date(2026, 7, 24, 9, 45);

    expect(formatReviewerDate(dateOnly)).toBe(format(parseISO(dateOnly), 'dd MMMM yyyy'));
    expect(formatReviewerDateTime(date)).toBe(format(date, 'dd MMMM yyyy, HH:mm'));
  });

  it('returns a deliberate fallback for missing values', () => {
    expect(formatReviewerDate(null)).toBe(REVIEWER_DATE_FALLBACK);
    expect(formatReviewerDateTime(undefined)).toBe(REVIEWER_DATE_FALLBACK);
    expect(formatReviewerDate('')).toBe(REVIEWER_DATE_FALLBACK);
  });

  it('returns a deliberate fallback for invalid values without throwing', () => {
    expect(formatReviewerDate('not-a-date')).toBe(REVIEWER_DATE_FALLBACK);
    expect(formatReviewerDateTime('2026-13-40T99:99:99.000Z')).toBe(REVIEWER_DATE_FALLBACK);
  });
});
