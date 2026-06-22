<script setup lang="ts">
import { OrderStatus, PaymentStatusEnum } from '~/types';

const baseAddress = {
  _id: 'addr-demo',
  name1: '123 Demo Street, Suite 400',
  name2: 'Sector 2',
  city: 'Tech City',
  region: 'Ilfov Region',
  postcode: '020335',
  country: 'Romania',
};

const orders = [
  // New order - just received
  {
    _id: 'order-demo-1',
    shortId: 'S-241030007',
    total: 457.92,
    status: OrderStatus.Processing,
    createdAt: '2024-11-27T09:00:00.000Z',
    company: {
      name: 'Demo Company Inc.',
      initial: 'E',
    },
    user: {
      companyDetails: { name: 'Demo Company Inc.' },
    },
    shippingDetails: {
      address: baseAddress,
      statusTracking: {
        awb: null,
        history: [],
      },
    },
    paymentDetails: { status: PaymentStatusEnum.Pending },
  },
  // Order in packaging
  {
    _id: 'order-demo-2',
    shortId: 'S-241030008',
    total: 892.5,
    status: OrderStatus.Packaging,
    createdAt: '2024-11-26T09:00:00.000Z',
    company: {
      name: 'Tech Solutions Ltd',
      initial: 'T',
    },
    user: {
      companyDetails: { name: 'Tech Solutions Ltd' },
    },
    shippingDetails: {
      address: baseAddress,
      statusTracking: {
        awb: 'MOP524103008',
        history: [{ code: 100, dateTime: '', unixDateTime: 0, statusTextParts: { ro: { name: '', reason: '' } }, comment: { ro: '' } }],
      },
    },
    paymentDetails: { status: PaymentStatusEnum.Paid },
  },
  // Order shipped
  {
    _id: 'order-demo-3',
    shortId: 'S-241030009',
    total: 1250.0,
    status: OrderStatus.Processing,
    createdAt: '2024-11-25T09:00:00.000Z',
    company: {
      name: 'Global Imports Co',
      initial: 'G',
    },
    user: {
      companyDetails: { name: 'Global Imports Co' },
    },
    shippingDetails: {
      address: baseAddress,
      statusTracking: {
        awb: 'MOP524103009',
        history: [
          { code: 100, dateTime: '', unixDateTime: 0, statusTextParts: { ro: { name: '', reason: '' } }, comment: { ro: '' } },
          { code: 20050, dateTime: '', unixDateTime: 0, statusTextParts: { ro: { name: '', reason: '' } }, comment: { ro: '' } },
        ],
      },
    },
    paymentDetails: { status: PaymentStatusEnum.Paid },
  },
  // Delivered order
  {
    _id: 'order-demo-4',
    shortId: 'S-241030010',
    total: 678.25,
    status: OrderStatus.Processing,
    createdAt: '2024-11-24T09:00:00.000Z',
    company: {
      name: 'City Electronics',
      initial: 'C',
    },
    user: {
      companyDetails: { name: 'City Electronics' },
    },
    shippingDetails: {
      address: baseAddress,
      statusTracking: {
        awb: 'MOP524103010',
        history: [{ code: 0, dateTime: '', unixDateTime: 0, statusTextParts: { ro: { name: '', reason: '' } }, comment: { ro: '' } }],
      },
    },
    paymentDetails: { status: PaymentStatusEnum.Paid },
  },
];
</script>

<template>
  <div class="flex flex-col gap-6 pt-6 max-w-[1392px] mx-auto w-full container">
    <h1 class="text-2xl font-bold text-zinc-800">Order Tracking Examples</h1>

    <div class="grid gap-6">
      <OrderTracking v-for="order in orders" :key="order._id" :order="order" />
    </div>
  </div>
</template>
