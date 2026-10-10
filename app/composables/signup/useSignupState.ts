import { ref } from 'vue';
import { useState } from '#app';
import type {
  CountryType,
  SelectInputObject,
  SignupAccountType,
  SignupBusinessDetails,
  SignupContactDetails,
  SignupPersonalDetails,
  SignupProfileDetails,
  StringInputObject,
} from '~~/types';

const emptyCountryType = (): CountryType => ({
  value: {
    value: undefined,
    error: '',
  },
  label: '',
  icon: '',
});

const clearStringInputObject = (field: StringInputObject) => {
  field.value = '';
  field.error = '';
};

const clearSelectInputObject = (field: SelectInputObject) => {
  field.value = undefined;
  field.error = '';
};

const clearCountryType = (field: CountryType) => {
  clearSelectInputObject(field.value);
  field.label = '';
  field.icon = '';
};

export const useSignupState = () => {
  const currentStep = ref(0);
  const selectedType = useState<SignupAccountType | ''>('signup-account-type', () => '');
  const selectedBusinessType = ref('');
  const vatPayer = ref(false);

  const businessDetails = useState<SignupBusinessDetails>('signup-business-details', () => {
    return {
      fullCompanyName: {
        value: '',
        error: '',
      },
      companyRegistrationNumber: {
        value: '',
        error: '',
      },
      vatNumber: {
        value: '',
        error: '',
      },
      country: emptyCountryType(),
      region: emptyCountryType(),
      city: {
        value: '',
        error: '',
      },
      postcode: {
        value: '',
        error: '',
      },
      addressLine1: {
        value: '',
        error: '',
      },
      addressLine2: {
        value: '',
        error: '',
      },
    };
  });

  const personalDetails = useState<SignupPersonalDetails>('signup-personal-details', () => {
    return {
      firstName: {
        value: '',
        error: '',
      },
      lastName: {
        value: '',
        error: '',
      },
      country: {
        value: undefined,
        error: '',
      },
      region: {
        value: undefined,
        error: '',
      },
      city: {
        value: '',
        error: '',
      },
      postcode: {
        value: '',
        error: '',
      },
      addressLine1: {
        value: '',
        error: '',
      },
      addressLine2: {
        value: '',
        error: '',
      },
    };
  });

  const contactDetails = useState<SignupContactDetails>('signup-contact-details', () => {
    return {
      firstName: {
        value: '',
        error: '',
      },
      lastName: {
        value: '',
        error: '',
      },
      phone: {
        value: '',
        error: '',
      },
      mobile: {
        value: '',
        error: '',
      },
      companyEmail: {
        value: '',
        error: '',
        type: 'email',
      },
      confirmCompanyEmail: {
        value: '',
        error: '',
        type: 'email',
      },
      email: {
        value: '',
        error: '',
        type: 'email',
      },
      confirmEmail: {
        value: '',
        error: '',
        type: 'email',
      },
    };
  });

  const profileDetails = useState<SignupProfileDetails>('signup-profile-details', () => {
    return {
      useContactEmail: false,
      accountEmail: {
        value: '',
        error: '',
        type: 'email',
      },
      confirmAccountEmail: {
        value: '',
        error: '',
        type: 'email',
      },
      password: {
        value: '',
        error: '',
      },
      repeatPassword: {
        value: '',
        error: '',
      },
      subscribeToNewsletter: true,
      agreeToTerms: false,
    };
  });

  const clearFormData = () => {
    (Object.keys(personalDetails.value) as Array<keyof SignupPersonalDetails>).forEach((key) => {
      if (key === 'country' || key === 'region') {
        clearSelectInputObject(personalDetails.value[key]);
      } else {
        clearStringInputObject(personalDetails.value[key]);
      }
    });

    (Object.keys(businessDetails.value) as Array<keyof SignupBusinessDetails>).forEach((key) => {
      if (key === 'country' || key === 'region') {
        clearCountryType(businessDetails.value[key]);
      } else if (key === 'vatNumber') {
        const vatNumber = businessDetails.value.vatNumber;
        if (vatNumber) {
          clearStringInputObject(vatNumber);
        }
      } else {
        clearStringInputObject(businessDetails.value[key]);
      }
    });

    (Object.keys(contactDetails.value) as Array<keyof SignupContactDetails>).forEach((key) => {
      clearStringInputObject(contactDetails.value[key]);
    });

    clearStringInputObject(profileDetails.value.accountEmail);
    clearStringInputObject(profileDetails.value.confirmAccountEmail);
    clearStringInputObject(profileDetails.value.password);
    clearStringInputObject(profileDetails.value.repeatPassword);
    profileDetails.value.useContactEmail = false;
    profileDetails.value.subscribeToNewsletter = true;
    profileDetails.value.agreeToTerms = false;
  };

  return {
    currentStep,
    selectedType,
    selectedBusinessType,
    vatPayer,
    businessDetails,
    personalDetails,
    contactDetails,
    profileDetails,
    clearFormData,
  };
};
