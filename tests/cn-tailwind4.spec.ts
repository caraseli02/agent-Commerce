import { describe, expect, it } from 'vitest';
import { cn } from '~/lib/utils';

describe('cn Tailwind 4 conflict groups', () => {
  it.each([
    ['outline style', 'outline-hidden outline-none', 'outline-none'],
    ['custom width and numeric width', 'w-(--custom) w-4', 'w-4'],
    ['custom height and numeric height', 'h-(--custom) h-4', 'h-4'],
    ['custom max width and preset max width', 'max-w-(--custom) max-w-sm', 'max-w-sm'],
    ['inset shadow size', 'inset-shadow-sm inset-shadow-md', 'inset-shadow-md'],
    ['field sizing', 'field-sizing-content field-sizing-fixed', 'field-sizing-fixed'],
    ['z translate', 'translate-z-2 translate-z-4', 'translate-z-4'],
    ['linear mask stop', 'mask-linear-from-10% mask-linear-from-20%', 'mask-linear-from-20%'],
    ['linear background direction', 'bg-linear-to-r bg-linear-to-l', 'bg-linear-to-l'],
  ])('%s keeps the later utility', (_group, input, expected) => {
    expect(cn(input)).toBe(expected);
  });

  it('keeps modifier-scoped conflicts separate from base utilities', () => {
    expect(cn('w-8 hover:w-(--custom) hover:w-4')).toBe('w-8 hover:w-4');
  });

  it('composes clsx inputs before merging conflicts', () => {
    expect(cn('p-2', ['p-4', { hidden: true }])).toBe('p-4 hidden');
  });

  it('keeps utilities from independent groups together', () => {
    expect(cn('inset-shadow-sm shadow-md mask-linear-to-r bg-linear-to-r')).toBe(
      'inset-shadow-sm shadow-md mask-linear-to-r bg-linear-to-r',
    );
  });
});
