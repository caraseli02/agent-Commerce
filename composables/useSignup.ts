import { registerClassic, registerFirebase } from '~/composables/api/auth';
import { validateAddress as validateAddressApi } from '~/composables/api/orders';
import type { ShippingAddressInterface } from '~/types/auth/user-interface';
import type { FirebaseBusinessAccount as SignupBusinessPayload, FirebasePersonalAccount as SignupPersonalPayload } from '~~/types';

type SignupPayload = SignupPersonalPayload | SignupBusinessPayload;

export type SignupRegisterMode = 'classic' | 'firebase';

export interface RegisterSignupAccountInput {
  mode: SignupRegisterMode;
  payload: SignupPayload;
  firebaseId?: string;
}

function isAddressValidationResult(value: unknown): value is { data: { valid: boolean } } {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const data = (value as { data?: unknown }).data;
  return Boolean(data && typeof data === 'object' && typeof (data as { valid?: unknown }).valid === 'boolean');
}

export function useSignup() {
  const isSignupAddressValid = async (address: ShippingAddressInterface): Promise<boolean> => {
    const result = await validateAddressApi(address);

    if (!isAddressValidationResult(result)) {
      return false;
    }

    return result.data.valid;
  };

  const registerSignupAccount = async ({ mode, payload, firebaseId }: RegisterSignupAccountInput) => {
    const accountPayload = structuredClone(payload) as SignupPayload;

    if (mode === 'firebase') {
      delete accountPayload.account.profileDetails.password;
      accountPayload.account.firebaseId = firebaseId;
      accountPayload.isAlreadyRegisteredWithFirebase = true;
      return await registerFirebase(accountPayload);
    }

    accountPayload.isAlreadyRegisteredWithFirebase = false;
    return await registerClassic(accountPayload);
  };

  return {
    isSignupAddressValid,
    registerSignupAccount,
  };
}
