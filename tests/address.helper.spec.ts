import { describe, expect, it } from 'vitest';

import { isCompleteGuestContact, isCompleteSavedAddress, isPlaceholderAddressValue } from '../helpers/address.helper';

describe('address.helper', () => {
  it('treats N/A and empty values as placeholders', () => {
    expect(isPlaceholderAddressValue('N/A')).toBe(true);
    expect(isPlaceholderAddressValue(' n/a ')).toBe(true);
    expect(isPlaceholderAddressValue('')).toBe(true);
    expect(isPlaceholderAddressValue(null)).toBe(true);
    expect(isPlaceholderAddressValue('San Francisco')).toBe(false);
  });

  it('requires core address fields for a complete saved address', () => {
    expect(
      isCompleteSavedAddress({
        alias: 'Main Address',
        name1: '100 Demo Way',
        name2: '',
        country: 'US',
        region: 'California',
        city: 'San Francisco',
        postcode: '94105',
        default: true,
      })
    ).toBe(true);

    expect(
      isCompleteSavedAddress({
        alias: 'N/A',
        name1: 'N/A',
        name2: 'N/A',
        country: 'N/A',
        region: 'N/A',
        city: 'N/A',
        postcode: 'N/A',
        default: false,
      })
    ).toBe(false);

    expect(isCompleteSavedAddress(null)).toBe(false);
    expect(isCompleteSavedAddress(undefined)).toBe(false);
  });

  it('requires valid guest contact details', () => {
    expect(
      isCompleteGuestContact({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        phone: '+15550100',
      })
    ).toBe(true);

    expect(
      isCompleteGuestContact({
        firstName: '',
        lastName: 'Doe',
        email: 'jane@example.com',
        phone: '+15550100',
      })
    ).toBe(false);

    expect(
      isCompleteGuestContact({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'not-an-email',
        phone: '+15550100',
      })
    ).toBe(false);
  });
});
