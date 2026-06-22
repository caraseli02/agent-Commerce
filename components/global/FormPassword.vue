<template>
  <div class="relative" :class="[error ? 'mb-4' : '']">
    <label class="flex flex-col relative !focus:rounded-lg">
      <div v-if="label" class="text-sm text-gray-500 mb-1">
        {{ label }}
      </div>
      <div
        class="relative border w-full transition-colors duration-300 !focus:rounded-lg"
        :class="[error ? 'border-rose-500' : 'border-border focus-within:border-blue-500', size === 'lg' ? 'rounded-lg' : 'rounded']"
      >
        <input
          :value="modelValue"
          :type="showPassword ? 'text' : 'password'"
          :placeholder="placeholder"
          class="bg-transparent pl-3 pr-10 text-sm !placeholder:text-gray-500 w-full focus:outline-none !focus:rounded-lg active:rounded-lg"
          :class="[size === 'lg' ? 'py-2.5' : 'py-2']"
          @input="handleInput"
        />
        <div class="flex cursor-pointer" @click="showPassword = !showPassword">
          <EyeClosedIcon v-if="!showPassword" class="absolute top-1/2 -translate-y-1/2 right-2.5 w-6 h-6 text-gray-500" />
          <EyeIcon v-else class="absolute top-1/2 -translate-y-1/2 right-2.5 w-6 h-6 text-gray-500" />
        </div>
        <div v-if="handleStrength" class="flex flex-col mt-[15px]">
          <div class="grid grid-cols-5 gap-2.5 mb-[5px]">
            <div
              v-for="num in 5"
              :key="num"
              class="rounded-lg h-[5px] transition-colors duration-300"
              :class="[passwordStrength >= num ? 'bg-green-500' : 'bg-[#E7E7EB]']"
            />
          </div>
          <div class="text-xs text-gray-500">Use 8 or more characters with a mix of letters, numbers & symbols.</div>
        </div>
      </div>
    </label>
    <Transition name="fade">
      <div v-if="error" class="absolute -bottom-1 left-0 translate-y-full pointer-events-none text-xs leading-normal text-rose-500">
        {{ error }}
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import EyeIcon from '@/assets/icons/eye.svg';
import EyeClosedIcon from '@/assets/icons/eye-closed.svg';

const props = defineProps({
  modelValue: {
    type: String,
    required: true,
  },
  size: {
    type: String as PropType<'default' | 'lg'>,
    required: false,
    default: 'default',
  },
  label: String,
  placeholder: String,
  handleStrength: Boolean,
  error: String,
});

const emits = defineEmits(['update:modelValue']);

const showPassword = ref(false);
const passwordStrength = computed(() => {
  let score = 0;
  let length = 0;
  let specialChar = 0;
  let caseMix = 0;
  let numCharMix = 0;

  const password = props.modelValue;

  const specialCharRegex = /[^A-Za-z0-9]/g;
  const lowercaseRegex = /(.*[a-z].*)/g;
  const uppercaseRegex = /(.*[A-Z].*)/g;
  const numberRegex = /(.*[0-9].*)/g;
  const repeatCharRegex = /(\w)(\1+\1+\1+\1+)/g;

  const hasSpecialChar = specialCharRegex.test(password);
  const hasLowerCase = lowercaseRegex.test(password);
  const hasUpperCase = uppercaseRegex.test(password);
  // const upperCaseLength = password.match(/[A-Z]/g)?.length || 0;
  const hasNumber = numberRegex.test(password);
  const hasRepeatChars = repeatCharRegex.test(password);

  if (password.length > 4) {
    if ((hasLowerCase || hasUpperCase) && hasNumber) {
      numCharMix = 1;
    }

    if (hasUpperCase && hasLowerCase) {
      caseMix = 1;
    }

    if ((hasLowerCase || hasUpperCase || hasNumber) && hasSpecialChar) {
      specialChar = 1;
    }

    if (password.length > 8) {
      length = 1;
    }

    if (password.length > 12 && !hasRepeatChars) {
      length = 2;
    }

    if (password.length > 25 && !hasRepeatChars) {
      length = 3;
    }

    score = length + specialChar + caseMix + numCharMix;

    if (score > 4) {
      score = 4;
    }
  }

  return score;
});

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement;

  emits('update:modelValue', target.value);
};
</script>
