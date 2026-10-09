import { z } from 'zod';

// Browser wire boundaries are validated before they can enable Stripe.
export const resumePaymentSchema = z.object({
  status: z.literal('success'),
  data: z.discriminatedUnion('kind', [
    z.object({
      kind: z.literal('requires-action'),
      nextAction: z.object({ type: z.literal('client-secret'), clientSecret: z.string().min(1) }),
    }),
    z.object({ kind: z.literal('processing') }),
  ]),
});
export const refreshPaymentSchema = z.object({
  status: z.literal('success'),
  data: z.union([
    z.object({ kind: z.enum(['pending', 'processing', 'paid-finalizing', 'completed', 'canceled', 'recovery-required', 'not-found']) }),
    z.object({ kind: z.literal('compensation'), recoveryRequired: z.boolean() }),
  ]),
});
export const restartPaymentSchema = z.object({
  status: z.literal('success'),
  data: z.object({ reviewRequired: z.literal(true), cartId: z.string().min(1), cartRevision: z.string().min(1) }),
});
