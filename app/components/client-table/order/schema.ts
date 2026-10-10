import { z } from 'zod';

const addressSchema = z.object({
  name1: z.string(),
  country: z.string(),
  region: z.string(),
  city: z.string(),
  postcode: z.string(),
  _id: z.string(),
});

const shippingDetailsSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  country: z.string(),
  city: z.string(),
  phone: z.number(),
  address: addressSchema,
  billingAddress: addressSchema,
  _id: z.string(),
});

const paymentDetailsSchema = z.object({
  status: z.number(),
  type: z.number(),
  invoiceId: z.string(),
  _id: z.string(),
});

export const orderSchema = z.object({
  _id: z.string(),
  userId: z.string(),
  shortId: z.string(),
  businessId: z.null().or(z.string()),
  shippingDetails: shippingDetailsSchema,
  total: z.number(),
  currency: z.string(),
  status: z.string(),
  type: z.number(),
  paymentDetails: paymentDetailsSchema,
  createdAt: z.string(),
  userName: z.string(),
  userEmail: z.string().optional(),
});

export type Order = z.infer<typeof orderSchema>;
