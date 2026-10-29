import { z } from 'zod';
import type { TypedSchema, TypedSchemaError } from 'vee-validate';

/**
 * Our flat forms use vee-validate 4's public TypedSchema contract. The upstream
 * Zod adapter requires Zod 3; this bridge keeps stable vee-validate on patched
 * Zod 4, including the existing prefills and field error paths.
 */
export function toTypedSchema<T extends z.ZodObject>(schema: T): TypedSchema<Partial<z.input<T>>, z.output<T>> {
  return {
    __type: 'VVTypedSchema',
    async parse(values) {
      const parsed = await schema.safeParseAsync(values, {
        error: (issue) => (issue.code === 'invalid_type' && issue.input === undefined ? 'Required' : undefined),
      });
      if (parsed.success) return { value: parsed.data, errors: [] };

      const errors = new Map<string, TypedSchemaError>();
      const collect = (issues: z.ZodError['issues'], prefix: PropertyKey[] = []) => {
        for (const issue of issues) {
          const fullPath = [...prefix, ...issue.path];
          const path = fullPath.reduce<string>(
            (path, segment) =>
              typeof segment === 'number' ? `${path}[${segment}]` : path ? `${path}.${String(segment)}` : String(segment),
            '',
          );
          if (issue.code === 'invalid_union') {
            collect(issue.errors.flat(), fullPath);
            if (!path) continue;
          }
          const field = errors.get(path) ?? { path, errors: [] };
          field.errors.push(issue.message);
          errors.set(path, field);
        }
      };
      collect(parsed.error.issues);
      return { errors: [...errors.values()] };
    },
    cast(values) {
      try {
        const parsed = schema.safeParse(values);
        if (parsed.success) return parsed.data as Partial<z.input<T>>;
      } catch {
        // Async refinements are validated by parse(), not form initialization.
      }
      // Flat prefaults initialize even invalid blank fields, as the old adapter
      // did. Submission still parses them, so an empty required field fails.
      const defaults = Object.fromEntries(
        Object.entries(schema.shape).map(([key, field]) => [key, field instanceof z.ZodPrefault ? field.def.defaultValue : undefined]),
      );
      return { ...defaults, ...values } as Partial<z.input<T>>;
    },
    describe(path) {
      if (!path) return { exists: true, required: !schema.isOptional() };
      const field = schema.shape[path];
      return field ? { exists: true, required: !field.isOptional() } : { exists: false, required: false };
    },
  };
}
