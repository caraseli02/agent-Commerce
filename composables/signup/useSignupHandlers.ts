import { useSignupState } from './useSignupState';
import { useToast } from '@/components/ui/toast/use-toast';
import { registerClassic, registerFirebase } from '~/composables/api/auth';
import {
  AccountType,
  type FirebaseBusinessAccount,
  type FirebasePersonalAccount,
  type SignupAccountType,
  getCountryTypeValue,
  getInputStringValue,
  toInputObject,
} from '@/types';

interface ValidateAddressResult {
  data: { valid: boolean };
}

const { $api } = useNuxtApp();

export const useSignupHandlers = () => {
  const {
    currentStep,
    selectedType,
    selectedBusinessType,
    vatPayer,
    businessDetails,
    personalDetails,
    contactDetails,
    profileDetails,
    clearFormData,
  } = useSignupState();

  const { toast } = useToast();
  const { validateAddress } = $api.orders;
  const { checkForInputErrors, checkContactConfirmationEmail, checkProfileConfirmationEmail } = useFormValidation();
  const { logout } = useFirebaseAuth();
  const firebaseToken = null; // Implement retrieval of Firebase token

  const nextStep = () => currentStep.value++;
  const previousStep = () => currentStep.value--;

  const setType = (type: SignupAccountType) => {
    selectedType.value = type;
  };

  const setBusinessType = (type: string) => {
    selectedBusinessType.value = type;
  };

  const mapType = (selected: string): AccountType => {
    switch (selected) {
      case 'personal':
        return AccountType.Personal;
      case 'sole-trader':
        return AccountType.SoleTrader;
      case 'business':
        return selectedBusinessType.value === 'agent' ? AccountType.Agent : AccountType.Business;
      default:
        throw new Error('Invalid account type selection');
    }
  };

  const handleBusinessDetailsContinue = async () => {
    let hasError = false;

    const fieldsToValidate = [
      businessDetails.value.fullCompanyName,
      businessDetails.value.companyRegistrationNumber,
      toInputObject(businessDetails.value.country.value),
      toInputObject(businessDetails.value.region.value),
      businessDetails.value.city,
      businessDetails.value.postcode,
      businessDetails.value.addressLine1,
    ];

    if (vatPayer.value && businessDetails.value.vatNumber) {
      fieldsToValidate.push(businessDetails.value.vatNumber);
    }

    hasError = checkForInputErrors(fieldsToValidate);

    const addressResult = (await $api.orders.validateAddress({
      country: getCountryTypeValue(businessDetails.value.country),
      region: getCountryTypeValue(businessDetails.value.region),
      city: businessDetails.value.city.value,
      postcode: businessDetails.value.postcode.value,
      name1: businessDetails.value.addressLine1.value,
      name2: businessDetails.value.addressLine2.value,
      default: false,
    })) as ValidateAddressResult;

    if (!addressResult.data.valid) {
      hasError = true;
      toast({ variant: 'destructive', title: 'Error', description: 'Invalid address' });
    }

    if (!hasError) {
      nextStep();
    }
  };

  const handlePersonalDetailsContinue = async () => {
    let hasError = false;

    const fieldsToValidate = [
      personalDetails.value.firstName,
      personalDetails.value.lastName,
      toInputObject(personalDetails.value.country),
      toInputObject(personalDetails.value.region),
      personalDetails.value.city,
      personalDetails.value.postcode,
      personalDetails.value.addressLine1,
    ];

    hasError = checkForInputErrors(fieldsToValidate);

    const addressResult = (await validateAddress({
      country: getInputStringValue(personalDetails.value.country),
      region: getInputStringValue(personalDetails.value.region),
      city: personalDetails.value.city.value,
      postcode: personalDetails.value.postcode.value,
      name1: personalDetails.value.addressLine1.value,
      name2: personalDetails.value.addressLine2.value,
      default: false,
    })) as ValidateAddressResult;

    if (!addressResult.data.valid) {
      hasError = true;
      toast({ variant: 'destructive', title: 'Error', description: 'Invalid address' });
    }

    if (!hasError) {
      nextStep();
    }
  };

  const handleContactDetailsContinue = () => {
    let hasError = false;

    const fieldsToValidate = [contactDetails.value.phone];

    if (selectedType.value === 'personal') {
      fieldsToValidate.push(contactDetails.value.email, contactDetails.value.confirmEmail);
      hasError = checkContactConfirmationEmail({
        email: contactDetails.value.email,
        confirmEmail: contactDetails.value.confirmEmail,
      });
    } else {
      fieldsToValidate.push(
        contactDetails.value.firstName,
        contactDetails.value.lastName,
        contactDetails.value.companyEmail,
        contactDetails.value.confirmCompanyEmail
      );
      hasError = checkContactConfirmationEmail({
        email: contactDetails.value.companyEmail,
        confirmEmail: contactDetails.value.confirmCompanyEmail,
      });
    }

    hasError = hasError || checkForInputErrors(fieldsToValidate);

    if (!hasError) {
      nextStep();
    }
  };

  const handleSubmit = async () => {
    let hasError = false;

    const fieldsToValidate = [profileDetails.value.accountEmail, profileDetails.value.confirmAccountEmail];

    if (!firebaseToken) {
      fieldsToValidate.push(profileDetails.value.password, profileDetails.value.repeatPassword);
    }

    hasError = checkProfileConfirmationEmail({
      accountEmail: profileDetails.value.accountEmail,
      confirmAccountEmail: profileDetails.value.confirmAccountEmail,
    });

    hasError = hasError || checkForInputErrors(fieldsToValidate);

    if (!hasError) {
      let payload: FirebasePersonalAccount | FirebaseBusinessAccount;

      if (selectedType.value === 'personal') {
        payload = {
          account: {
            accountType: mapType(selectedType.value),
            role: 2,
            profileDetails: {
              email: profileDetails.value.accountEmail.value,
              password: profileDetails.value.password.value,
            },
            contactDetails: {
              firstName: personalDetails.value.firstName.value,
              lastName: personalDetails.value.lastName.value,
              phone: contactDetails.value.phone.value,
              email: contactDetails.value.email.value,
            },
            personalDetails: {
              firstName: personalDetails.value.firstName.value,
              lastName: personalDetails.value.lastName.value,
              address: {
                _id: '',
                name1: personalDetails.value.addressLine1.value,
                name2: personalDetails.value.addressLine2.value,
                country: getInputStringValue(personalDetails.value.country),
                region: getInputStringValue(personalDetails.value.region),
                city: personalDetails.value.city.value,
                postcode: personalDetails.value.postcode.value,
              },
              shippingAddress: [
                {
                  name1: personalDetails.value.addressLine1.value,
                  name2: personalDetails.value.addressLine2.value,
                  country: getInputStringValue(personalDetails.value.country),
                  region: getInputStringValue(personalDetails.value.region),
                  city: personalDetails.value.city.value,
                  postcode: personalDetails.value.postcode.value,
                  default: true,
                },
              ],
              billingAddress: [
                {
                  name1: personalDetails.value.addressLine1.value,
                  name2: personalDetails.value.addressLine2.value,
                  country: getInputStringValue(personalDetails.value.country),
                  region: getInputStringValue(personalDetails.value.region),
                  city: personalDetails.value.city.value,
                  postcode: personalDetails.value.postcode.value,
                  default: true,
                },
              ],
            },
            adminSettings: {
              marketingPreferences: {
                newsletter: { email: profileDetails.value.subscribeToNewsletter },
                cookiesPolicy: { email: profileDetails.value.agreeToTerms },
              },
            },
          },
        };
      } else {
        payload = {
          account: {
            accountType: mapType(selectedType.value),
            role: 2,
            profileDetails: {
              email: profileDetails.value.accountEmail.value,
              password: profileDetails.value.password.value,
            },
            companyDetails: {
              name: businessDetails.value.fullCompanyName.value,
              registrationNumber: businessDetails.value.companyRegistrationNumber.value,
              vat: businessDetails.value.vatNumber?.value,
              address: {
                _id: '',
                name1: businessDetails.value.addressLine1.value,
                name2: businessDetails.value.addressLine2.value,
                country: getCountryTypeValue(businessDetails.value.country),
                region: getCountryTypeValue(businessDetails.value.region),
                city: businessDetails.value.city.value,
                postcode: businessDetails.value.postcode.value,
              },
              shippingAddress: [
                {
                  name1: businessDetails.value.addressLine1.value,
                  name2: businessDetails.value.addressLine2.value,
                  country: getCountryTypeValue(businessDetails.value.country),
                  region: getCountryTypeValue(businessDetails.value.region),
                  city: businessDetails.value.city.value,
                  postcode: businessDetails.value.postcode.value,
                  default: true,
                },
              ],
              billingAddress: [
                {
                  name1: businessDetails.value.addressLine1.value,
                  name2: businessDetails.value.addressLine2.value,
                  country: getCountryTypeValue(businessDetails.value.country),
                  region: getCountryTypeValue(businessDetails.value.region),
                  city: businessDetails.value.city.value,
                  postcode: businessDetails.value.postcode.value,
                  default: true,
                },
              ],
            },
            contactDetails: {
              firstName: contactDetails.value.firstName.value,
              lastName: contactDetails.value.lastName.value,
              phone: contactDetails.value.phone.value,
              email: contactDetails.value.companyEmail.value,
            },
            adminSettings: {
              marketingPreferences: {
                newsletter: { email: profileDetails.value.subscribeToNewsletter },
                cookiesPolicy: { email: profileDetails.value.agreeToTerms },
              },
            },
          },
        };
      }

      try {
        if (firebaseToken) {
          await registerFirebase(payload);
        } else {
          await registerClassic(payload);
        }

        toast({ variant: 'success', title: 'Success', description: 'Account created successfully' });

        await logout();
        nextStep();
      } catch {
        toast({ variant: 'destructive', title: 'Error', description: 'Registration failed' });
      } finally {
        clearFormData();
      }
    }
  };

  return {
    setType,
    setBusinessType,
    nextStep,
    previousStep,
    handleBusinessDetailsContinue,
    handlePersonalDetailsContinue,
    handleContactDetailsContinue,
    handleSubmit,
  };
};
