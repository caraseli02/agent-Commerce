<template>
  <div>
    <UiLabel v-if="label" :for="inputId" class="mb-1 block">
      {{ label }}
    </UiLabel>
    <div
      class="relative border w-full transition-colors duration-300"
      :class="[error ? 'border-rose-500' : 'border-border focus-within:border-blue-500', size === 'lg' ? 'rounded-lg' : 'rounded']"
    >
      <!-- The wrapper draws the border and focus state, so the input drops its own. -->
      <UiInput
        :id="inputId"
        :model-value="modelValue"
        :type="showPassword ? 'text' : 'password'"
        :placeholder="placeholder"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="error ? errorId : undefined"
        :class="['border-0 bg-transparent pl-3 pr-12 text-sm focus-visible:!outline-none', size === 'lg' ? 'h-auto py-2.5' : 'h-auto py-2']"
        @update:model-value="handleInput"
      />
      <UiButton
        type="button"
        variant="ghost"
        size="icon"
        class="absolute right-0 top-0 h-11 w-11 text-muted-foreground"
        :aria-label="showPassword ? 'Hide password' : 'Show password'"
        :aria-pressed="showPassword"
        @click="showPassword = !showPassword"
      >
        <EyeClosedIcon v-if="!showPassword" class="h-6 w-6" />
        <EyeIcon v-else class="h-6 w-6" />
      </UiButton>
      <div v-if="handleStrength" class="flex flex-col mt-[15px]">
        <div class="grid grid-cols-5 gap-2.5 mb-[5px]">
          <div
            v-for="num in 5"
            :key="num"
            class="rounded-lg h-[5px] transition-colors duration-300"
            :class="[passwordStrength >= num ? 'bg-green-500' : 'bg-[#E7E7EB]']"
          />
        </div>
        <div class="text-xs text-muted-foreground">Use 8 or more characters with a mix of letters, numbers & symbols.</div>
      </div>
    </div>
    <p v-if="error" :id="errorId" role="alert" class="mt-1 text-xs leading-normal text-rose-500">
      {{ error }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { useId } from 'vue';
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
  label: {
    type: String,
    default: undefined,
  },
  placeholder: {
    type: String,
    default: undefined,
  },
  handleStrength: Boolean,
  error: {
    type: String,
    default: undefined,
  },
});

const emits = defineEmits(['update:modelValue']);

const showPassword = ref(false);
const inputId = useId();
const errorId = `${inputId}-error`;
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

const handleInput = (value: string | number) => {
  emits('update:modelValue', String(value));
};
</script>
