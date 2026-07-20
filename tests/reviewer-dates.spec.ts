import { describe, expect, it } from 'vitest';

import { REVIEWER_DATE_FALLBACK, formatReviewerDate, formatReviewerDateTime } from '~/helpers/reviewer-dates';

describe('reviewer date formatting', () => {
  it('formats valid ISO timestamps for reviewer-facing date-time fields', () => {
    expect(formatReviewerDateTime('2026-07-10T10:30:00.000Z')).toBe('10 July 2026, 10:30');
  });

  it('formats valid ISO timestamps for reviewer-facing date-only fields', () => {
    expect(formatReviewerDate('2026-03-31T00:00:00.000Z')).toBe('31 March 2026');
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
