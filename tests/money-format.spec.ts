import { describe, expect, it } from 'vitest';
import { formatLei } from '../helpers/money-format';

const NBSP = String.fromCharCode(160);

describe('formatLei', () => {
  it('always shows two decimals joined to the currency by a non-breaking space', () => {
    expect(formatLei(19.9)).toBe(`19.90${NBSP}Lei`);
    expect(formatLei(285)).toBe(`285.00${NBSP}Lei`);
    expect(formatLei('1499.99')).toBe(`1499.99${NBSP}Lei`);
  });

  it('falls back to zero for missing or invalid amounts', () => {
    expect(formatLei(undefined)).toBe(`0.00${NBSP}Lei`);
    expect(formatLei(Number.NaN)).toBe(`0.00${NBSP}Lei`);
  });
});
