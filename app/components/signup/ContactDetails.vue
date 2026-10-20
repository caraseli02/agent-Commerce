<template>
  <div class="pt-[30px] pb-10 md:flex-1 lg:pt-[60px]">
    <div class="container h-full">
      <div class="flex flex-col h-full md:max-w-[410px] md:mx-auto">
        <div class="flex items-center mb-5">
          <div class="font-medium mr-2 md:text-xl">Contact Details</div>
          <QuestionIcon class="w-5 h-5 text-muted-foreground" />
        </div>
        <div class="mb-[30px]">
          <div class="grid grid-cols-1 gap-[15px] mb-10">
            <BuyerFormInput
              v-if="selectedType !== 'personal'"
              v-model="details.firstName.value"
              :error="details.firstName.error"
              label="First Name"
              placeholder="First Name"
            />
            <BuyerFormInput
              v-if="selectedType !== 'personal'"
              v-model="details.lastName.value"
              :error="details.lastName.error"
              label="Last Name"
              placeholder="Last Name"
            />
            <BuyerFormInput
              v-model="details.phone.value"
              :error="details.phone.error"
              type="tel"
              label="Phone"
              placeholder="Phone Number"
            />
            <BuyerFormInput v-model="details.mobile.value" type="tel" label="Mobile" placeholder="Mobile Number" />
            <template v-if="selectedType !== 'personal'">
              <BuyerFormInput
                v-model="details.companyEmail.value"
                :error="details.companyEmail.error"
                type="email"
                label="Company E-mail"
                placeholder="Company E-mail"
              />
              <BuyerFormInput
                v-model="details.confirmCompanyEmail.value"
                :error="details.confirmCompanyEmail.error"
                type="email"
                label="Confirm Company E-mail"
                placeholder="Confirm Company E-mail"
              />
            </template>
            <template v-if="selectedType === 'personal'">
              <BuyerFormInput v-model="details.email.value" :error="details.email.error" type="email" label="E-mail" placeholder="E-mail" />
              <BuyerFormInput
                v-model="details.confirmEmail.value"
                :error="details.confirmEmail.error"
                type="email"
                label="Confirm E-mail"
                placeholder="Confirm E-mail"
              />
            </template>
          </div>
          <div class="flex items-center justify-between">
            <button class="flex items-center rounded bg-muted px-[22px] py-[11px] text-muted-foreground" @click="$emit('back')">
              <ChevronRightIcon class="w-3 h-3 mr-2 rotate-180" />
              <span class="text-sm font-medium">Back</span>
            </button>
            <button class="flex items-center rounded bg-blue-500 px-[22px] py-[11px] text-white" @click="$emit('continue')">
              <span class="text-sm font-medium mr-2">Continue</span>
              <ChevronRightIcon class="w-3 h-3" />
            </button>
          </div>
        </div>
        <div class="text-xs text-center text-muted-foreground mt-auto">
          For assistance please contact
          <a href="mailto:support@demo.app" class="text-blue-500">support@demo.app</a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import QuestionIcon from '@/assets/icons/question-circle.svg';
import ChevronRightIcon from '@/assets/icons/chevron-right.svg';
import type { SignupAccountType, SignupContactDetails } from '~~/types';

defineEmits(['continue', 'back']);

const selectedType = useState<SignupAccountType>('signup-account-type');

const details = useState<SignupContactDetails>('signup-contact-details');
</script>
