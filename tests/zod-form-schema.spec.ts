import { describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';
import type { TypedSchema } from 'vee-validate';
import { toTypedSchema } from '~/utils/zodFormSchema';

describe('Zod 4 form integration', () => {
  it('keeps typed input and transformed submission output', async () => {
    const schema = z.object({ name: z.string().trim(), quantity: z.coerce.number<string>() });
    const form = toTypedSchema(schema);
    expectTypeOf(form).toEqualTypeOf<TypedSchema<Partial<z.input<typeof schema>>, z.output<typeof schema>>>();
    expect(await form.parse({ name: '  mug  ', quantity: '3' })).toEqual({ value: { name: 'mug', quantity: 3 }, errors: [] });
  });

  it('preserves invalid blank prefills and prevents submitting them', async () => {
    const form = toTypedSchema(
      z.object({
        alias: z.string().min(1, 'Address Alias is required').prefault(''),
        country: z.string().min(1).prefault('US'),
        postcode: z.string().min(1, 'Postcode is required').prefault(''),
      }),
    );
    const values = form.cast!({ country: 'FR' });
    expect(values).toEqual({ alias: '', country: 'FR', postcode: '' });
    expect(await form.parse(values)).toEqual({
      errors: [
        { path: 'alias', errors: ['Address Alias is required'] },
        { path: 'postcode', errors: ['Postcode is required'] },
      ],
    });
  });

  it('uses existing address values without replacing user edits', async () => {
    const form = toTypedSchema(
      z.object({ city: z.string().min(1).prefault('Madrid'), addressLine2: z.string().optional().prefault('Floor 2') }),
    );
    expect(form.cast!({ city: 'Paris' })).toEqual({ city: 'Paris', addressLine2: 'Floor 2' });
    expect(await form.parse({ city: 'Paris' })).toEqual({ value: { city: 'Paris', addressLine2: 'Floor 2' }, errors: [] });
  });

  it('reports all same-field union failures and keeps array field paths', async () => {
    const form = toTypedSchema(
      z.object({
        iban: z.union([z.string().length(0), z.string().regex(/^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/, 'Invalid IBAN')]),
        items: z.array(z.object({ name: z.string().min(1, 'Name is required') })),
      }),
    );
    const result = await form.parse({ iban: 'bad', items: [{ name: '' }] });
    expect(result.value).toBeUndefined();
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'iban', errors: expect.arrayContaining(['Invalid IBAN']) }),
        { path: 'items[0].name', errors: ['Name is required'] },
      ]),
    );
  });

  it('runs async refinements and preserves explicit required messages', async () => {
    const form = toTypedSchema(
      z.object({
        email: z
          .string({ error: (issue) => (issue.input === undefined ? 'Email is required' : undefined) })
          .refine(async (email) => email !== 'taken@example.test', 'Email already used'),
        details: z.string().optional(),
      }),
    );
    expect((await form.parse({})).errors).toEqual([{ path: 'email', errors: ['Email is required'] }]);
    expect((await form.parse({ email: 'taken@example.test' })).errors).toEqual([{ path: 'email', errors: ['Email already used'] }]);
  });

  it('keeps Required for missing fields without schema-specific copy', async () => {
    const form = toTypedSchema(z.object({ email: z.string() }));
    expect(await form.parse({})).toEqual({ errors: [{ path: 'email', errors: ['Required'] }] });
  });

  it('describes required, optional and missing flat fields', () => {
    const form = toTypedSchema(z.object({ name: z.string(), nickname: z.string().optional() }));
    expect(form.describe!('name')).toEqual({ exists: true, required: true });
    expect(form.describe!('nickname')).toEqual({ exists: true, required: false });
    expect(form.describe!()).toEqual({ exists: true, required: true });
  });
});
