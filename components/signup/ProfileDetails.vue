<template>
  <div class="pt-[30px] pb-10 md:flex-1 lg:pt-[60px]">
    <div class="container h-full">
      <div class="flex flex-col h-full md:max-w-[410px] md:mx-auto">
        <div class="flex items-center mb-5">
          <div class="font-medium mr-2 md:text-xl">Profile Details</div>
          <QuestionIcon class="w-5 h-5 text-gray-500" />
        </div>
        <div class="mb-[30px]">
          <div class="grid grid-cols-1 gap-[15px] mb-10">
            <label class="flex items-center cursor-pointer">
              <input :value="details.useContactEmail" type="checkbox" class="sr-only" @change="useContactEmailCheck" />
              <div
                class="flex items-center justify-center flex-shrink-0 w-[18px] h-[18px] rounded border transition-colors duration-300 mr-2.5"
                :class="[
                  details.useContactEmail
                    ? 'bg-blue-500 border-blue-500 group-hover:bg-white'
                    : 'bg-white  border-border group-hover:border-gray-300',
                ]"
              >
                <CheckIcon v-if="details.useContactEmail" class="w-4 text-white transition-colors duration-300 group-hover:text-blue-500" />
              </div>
              <span class="text-sm text-slate-500"> Use Contact E-mail </span>
            </label>
            <BuyerFormInput
              v-model="details.accountEmail.value"
              :error="details.accountEmail.error"
              type="email"
              label="Account E-mail"
              placeholder="Account E-mail"
            />
            <BuyerFormInput
              v-model="details.confirmAccountEmail.value"
              :error="details.confirmAccountEmail.error"
              type="email"
              label="Confirm Account E-mail"
              placeholder="Confirm Account E-mail"
            />
            <FormPassword
              v-model="details.password.value"
              :error="details.password.error"
              label="Password"
              placeholder="Password"
              handle-strength
            />
            <FormPassword
              v-model="details.repeatPassword.value"
              :error="details.repeatPassword.error"
              label="Repeat Password"
              placeholder="Repeat Password"
            />
            <div class="flex items-center justify-between my-[15px]">
              <div class="text-sm leading-tight text-slate-500">Subscribe to our newsletter</div>
              <button
                class="relative w-10 h-[22px] rounded-[25px] transition-colors duration-300"
                :class="[details.subscribeToNewsletter ? 'bg-blue-500 ' : 'bg-border']"
                @click="details.subscribeToNewsletter = !details.subscribeToNewsletter"
              >
                <div
                  class="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full transition-all duration-300"
                  :class="[details.subscribeToNewsletter ? ' right-1' : 'right-5']"
                />
              </button>
            </div>
            <label class="flex items-start cursor-pointer">
              <input :value="details.agreeToTerms" type="checkbox" class="sr-only" @change="details.agreeToTerms = !details.agreeToTerms" />
              <div
                class="flex items-center justify-center flex-shrink-0 w-[18px] h-[18px] rounded border transition-colors duration-300 mr-2.5"
                :class="[
                  details.agreeToTerms
                    ? 'bg-blue-500 border-blue-500 group-hover:bg-white'
                    : 'bg-white  border-border group-hover:border-gray-300',
                ]"
              >
                <CheckIcon v-if="details.agreeToTerms" class="w-4 text-white transition-colors duration-300 group-hover:text-blue-500" />
              </div>
              <span class="text-xs text-slate-500">
                I have read and agreed to Demo's
                <NuxtLink to="/" class="text-blue-500 font-medium">Terms of Service</NuxtLink>,
                <NuxtLink to="/" class="text-blue-500 font-medium">Privacy Policy</NuxtLink>
                and
                <NuxtLink to="/" class="text-blue-500 font-medium">Cookie Policy</NuxtLink>.
              </span>
            </label>
          </div>
          <!-- <div class="bg-rose-600 p-2 my-3 rounded">
                        <p class="text-white">
                            {{ errorResponse.description }}
                        </p>
                    </div> -->
          <div class="flex items-center justify-between">
            <button class="flex items-center rounded bg-gray-100 px-[22px] py-[11px] text-slate-500" @click="$emit('back')">
              <ChevronRightIcon class="w-3 h-3 mr-2 rotate-180" />
              <span class="text-sm font-medium">Back</span>
            </button>
            <UiButton
              :disabled="isSubmitDisabled"
              class="flex items-center rounded bg-blue-500 px-[22px] py-[11px] text-white"
              @click="$emit('continue')"
            >
              <span class="text-sm font-medium mr-2"> Continue </span>
              <ChevronRightIcon class="w-3 h-3" />
            </UiButton>
          </div>
        </div>
        <div class="text-xs text-center text-slate-500 mt-auto">
          For assistance please contact
          <a href="mailto:support@demo.app" class="text-blue-500"> support@demo.app </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import QuestionIcon from '@/assets/icons/question-circle.svg';
import ChevronRightIcon from '@/assets/icons/chevron-right.svg';
import CheckIcon from '@/assets/icons/check.svg';
import type { SignupProfileDetails, SignupContactDetails, SignupAccountType } from '~~/types';

defineEmits(['continue', 'back']);

const details = useState<SignupProfileDetails>('signup-profile-details');
const contact = useState<SignupContactDetails>('signup-contact-details');
const selectedType = useState<SignupAccountType>('signup-account-type');
const useContactEmailCheck = () => {
  details.value.useContactEmail = !details.value.useContactEmail;

  if (selectedType.value === 'business' || selectedType.value === 'sole-trader') {
    details.value.accountEmail.value = details.value.useContactEmail ? contact.value.companyEmail.value : '';
    details.value.confirmAccountEmail.value = details.value.useContactEmail ? contact.value.companyEmail.value : '';
  } else {
    details.value.accountEmail.value = details.value.useContactEmail ? contact.value.email.value : '';
    details.value.confirmAccountEmail.value = details.value.useContactEmail ? contact.value.email.value : '';
  }
};

const isSubmitDisabled = computed(() => !details.value.agreeToTerms);
</script>
