import { registerClassic, registerFirebase } from '~/composables/api/auth';
import { validateAddress as validateAddressApi } from '~/composables/api/orders';

export function useSignup() {
  const validateSignupAddress = async (address: Parameters<typeof validateAddressApi>[0]) => {
    return await validateAddressApi(address);
  };

  const registerWithClassic = async (payload: Parameters<typeof registerClassic>[0]) => {
    return await registerClassic(payload);
  };

  const registerWithFirebase = async (payload: Parameters<typeof registerFirebase>[0]) => {
    return await registerFirebase(payload);
  };

  return {
    validateSignupAddress,
    registerWithClassic,
    registerWithFirebase,
  };
}
