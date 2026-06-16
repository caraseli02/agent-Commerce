import type { InputObject } from '~~/types';
import { resolveFormValue } from '~/types/global/form';

export const useFormValidation = () => {
  const checkForInputErrors = (obj: Array<InputObject>) => {
    let hasError = false;

    obj.forEach((e) => {
      if (e.type === 'email') {
        const emailRegex = /^[A-Za-z0-9_!#$%&'*+/=?`{|}~^.-]+@[A-Za-z0-9.-]+$/gm;
        const clientCodeRegex = /^[PBAS]-\d{6}$/;
        const value = resolveFormValue(e.value);

        if (!emailRegex.test(value) && !clientCodeRegex.test(value)) {
          e.error = 'Please provide a valid email address or a valid client code';
        }
        else {
          e.error = '';
        }
      }
      else if (!e.value) {
        e.error = 'Please fill out this field';
      }
      else {
        e.error = '';
      }
    });

    if (obj.find(e => e.error)) {
      hasError = true;
    }

    return hasError;
  };

  const checkContactConfirmationEmail = (obj: { email: InputObject; confirmEmail: InputObject }) => {
    let hasError = false;

    if (obj.email.value != obj.confirmEmail.value) {
      obj.confirmEmail.error = 'Confirmation email value should same';
    }

    if (obj.email.error || obj.confirmEmail.error) {
      hasError = true;
    }

    return hasError;
  };

  const checkProfileConfirmationEmail = (obj: { accountEmail: InputObject; confirmAccountEmail: InputObject }) => {
    let hasError = false;

    if (obj.accountEmail.value != obj.confirmAccountEmail.value) {
      obj.confirmAccountEmail.error = 'Confirmation email value should same';
    }

    if (obj.accountEmail.error || obj.confirmAccountEmail.error) {
      hasError = true;
    }

    return hasError;
  };

  return {
    checkForInputErrors,
    checkContactConfirmationEmail,
    checkProfileConfirmationEmail,
  };
};
