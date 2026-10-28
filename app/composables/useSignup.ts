import { register, type RegisterRequest } from '~/composables/api/auth';
import { useSessionSignIn } from '~/composables/useSessionSignIn';
import type { UserInterface } from '~~/types/auth/user-interface';

export type { RegisterRequest as SignupInput };

/** Creates a persistent customer account and signs the new customer in. */
export function useSignup() {
  const { startSession } = useSessionSignIn();

  const registerCustomer = async (input: RegisterRequest): Promise<UserInterface> => {
    const response = await register(input);
    const user = await startSession(response.token, response.user as UserInterface);
    if (!user) throw new Error('Account created but the session could not start');
    return user;
  };

  return { registerCustomer };
}
