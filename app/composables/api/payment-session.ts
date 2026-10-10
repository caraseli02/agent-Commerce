import { useNuxtApp } from '#app';
import type { $Fetch } from 'ofetch';
import { refreshPaymentSchema, restartPaymentSchema, resumePaymentSchema } from '~~/types/order/payment-session';

const request = async (id: string, action: string, apiClient?: $Fetch) => {
  if (!id.trim()) throw new Error('Missing order');
  return (apiClient ?? useNuxtApp().$apiClient)(`/orders/${encodeURIComponent(id)}/${action}`, { method: 'POST' });
};
export const resumePaymentSession = async (id: string, apiClient?: $Fetch) =>
  resumePaymentSchema.parse(await request(id, 'resume-payment', apiClient)).data;
export const refreshPaymentSession = async (id: string, apiClient?: $Fetch) =>
  refreshPaymentSchema.parse(await request(id, 'refresh-payment', apiClient)).data;
export const restartPaymentSession = async (id: string, apiClient?: $Fetch) =>
  restartPaymentSchema.parse(await request(id, 'restart', apiClient)).data;
