import type { z } from 'zod';

/**
 * Validates a request body already read with `readBody`. Invalid bodies become a 400
 * whose `data.fieldErrors` maps each field to its messages (pricing `safeParse` style).
 */
export const parseZodBody = <T extends z.ZodTypeAny>(schema: T, body: unknown): z.infer<T> => {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const { formErrors, fieldErrors } = parsed.error.flatten();
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid request body',
      data: { formErrors, fieldErrors },
    });
  }
  return parsed.data;
};
