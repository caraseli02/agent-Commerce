export type StripeEnvironment = 'development' | 'preview' | 'production';

export const isStripeEnvironment = (value: unknown): value is StripeEnvironment =>
  value === 'development' || value === 'preview' || value === 'production';

export const stripeEnvironment = (): StripeEnvironment => {
  const environment = process.env.VERCEL_ENV ?? 'development';
  if (!isStripeEnvironment(environment)) throw new Error('Unknown Stripe deployment environment.');
  return environment;
};
