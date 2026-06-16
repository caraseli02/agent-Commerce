<template>
  <section class="flex flex-col w-full">
    <header class="flex flex-wrap gap-10 justify-between items-center w-full max-md:max-w-full">
      <h2 class="self-stretch my-auto text-base font-semibold text-zinc-800">
        Bank Details
      </h2>
      <OrderConfirmBankSelect @bank-select="onBankSelect" />
    </header>
    <div
      v-if="selectedBank"
      class="flex flex-col mt-4 w-full text-sm leading-6 max-md:max-w-full"
    >
      <dl>
        <div class="flex flex-col md:flex-row flex-wrap gap-0.5 md:gap-3 items-center w-full max-md:max-w-full">
          <dt class="self-stretch my-auto text-gray-500">
            Bank Name:
          </dt>
          <dd class="flex-1 shrink self-stretch my-auto basis-0 text-zinc-800 max-md:max-w-full">
            {{ selectedBank.bankName }}
          </dd>
        </div>
        <div class="flex flex-col md:flex-row flex-wrap gap-0.5 md:gap-3 items-center mt-2 md:mt-1 max-w-full w-[506px]">
          <dt class="self-stretch my-auto text-gray-500">
            Bank Address:
          </dt>
          <dd class="flex-1 shrink self-stretch my-auto basis-0 text-zinc-800">
            {{ selectedBank.bankAddress }}
          </dd>
        </div>
        <div class="flex flex-col md:flex-row flex-wrap gap-0.5 md:gap-3 items-center mt-2 md:mt-1 w-full max-md:max-w-full">
          <dt class="self-stretch my-auto text-gray-500">
            Account Number:
          </dt>
          <dd class="flex-1 shrink self-stretch my-auto basis-0 text-zinc-800 max-md:max-w-full">
            {{ selectedBank.accountNumber }}
          </dd>
        </div>
        <div
          class="flex flex-col md:flex-row flex-wrap gap-0.5 md:gap-3 items-center mt-2 md:mt-1 w-full whitespace-nowrap max-md:max-w-full"
        >
          <dt class="self-stretch my-auto text-gray-500">
            SWIFT/BIC:
          </dt>
          <dd class="flex-1 shrink self-stretch my-auto basis-0 text-zinc-800 max-md:max-w-full">
            {{ selectedBank.swift }}
          </dd>
        </div>
        <div class="flex flex-col md:flex-row flex-wrap gap-0.5 md:gap-3 items-center mt-2 md:mt-1 w-full max-md:max-w-full">
          <dt class="self-stretch my-auto text-gray-500">
            IBAN:
          </dt>
          <dd class="flex-1 shrink self-stretch my-auto basis-0 text-zinc-800 max-md:max-w-full">
            {{ selectedBank.iban }}
          </dd>
        </div>
      </dl>
    </div>
    <div
      v-else
      class="text-gray-500"
    >
      Please select a bank to view its details.
    </div>
  </section>
</template>

<script setup lang="ts">
interface BankDetails {
  bankName: string;
  bankAddress: string;
  accountNumber: string;
  swift: string;
  iban: string;
}

type BankKey = 'bcr_ron' | 'bcr_usd' | 'uni_ron' | 'patria_ron' | 'patria_usd';

const bankData = ref({
  bcr_ron: {
    bankName: 'BANCA COMERCIALA ROMANA SA',
    bankAddress: '456 Bank Street, Tech City',
    accountNumber: '72049717300001',
    swift: 'RNCBROBU',
    iban: 'RO58 RNCB 0072 0497 1730 0001',
  },
  bcr_usd: {
    bankName: 'BANCA COMERCIALA ROMANA SA',
    bankAddress: '456 Bank Street, Tech City',
    accountNumber: '72049717300002',
    swift: 'RNCBROBU',
    iban: 'RO59 RNCB 0072 0497 1730 0002',
  },
  uni_ron: {
    bankName: 'UNICREDIT BANK',
    bankAddress: '789 Financial Ave, Tech City',
    accountNumber: '3159330',
    swift: 'BACXROBU',
    iban: 'RO33 BACX 0000 0000 3159 330',
  },
  patria_ron: {
    bankName: 'PATRIA BANK',
    bankAddress: '321 Money Market, Tech City',
    accountNumber: '1002500489401',
    swift: 'CARPRO22',
    iban: 'RO58 CARP 0255 0255 5688 RON',
  },
  patria_usd: {
    bankName: 'PATRIA BANK',
    bankAddress: '321 Money Market, Tech City',
    accountNumber: '1002500489402',
    swift: 'CARPRO22',
    iban: 'RO55 CARP 0255 0255 5688 USD',
  },
});

const selectedBank = ref<BankDetails>(bankData.value.bcr_ron);

const onBankSelect = (bankKey: BankKey) => {
  selectedBank.value = bankData.value[bankKey];
};
</script>
