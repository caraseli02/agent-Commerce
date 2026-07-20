import { describe, expect, it } from 'vitest';

import { REVIEWER_DATE_FALLBACK, formatReviewerDate, formatReviewerDateTime } from '~/helpers/reviewer-dates';

describe('reviewer date formatting', () => {
  it('formats valid timestamps for reviewer-facing date-time fields', () => {
    // Local Date avoids CI/local timezone drift on absolute ISO-Z strings.
    expect(formatReviewerDateTime(new Date(2026, 6, 10, 10, 30, 0))).toBe('10 July 2026, 10:30');
  });

  it('formats valid timestamps for reviewer-facing date-only fields', () => {
    expect(formatReviewerDate(new Date(2026, 2, 31, 0, 0, 0))).toBe('31 March 2026');
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
