<template>
    <div class="min-h-screen md:flex">
        <SignupSteps :current-step="currentStep" :selected-type="selectedType" />
        <SignupSelectMenu
            v-if="currentStep === 0"
            :selected-type="selectedType"
            @set-type="setSelectedType"
            @set-business-type="setSelectedBusinessType"
            @continue="continueFromSelectMenu"
        />
        <SignupBusinessDetails
            v-if="currentStep === 1 && (selectedType === 'business' || selectedType === 'sole-trader')"
            v-model="vatPayer"
            :selected-type="selectedType === 'sole-trader' ? '' : selectedBusinessType"
            @back="backToSelectMenu()"
            @continue="handleBusinessDetailsContinue"
        />
        <SignupPersonalDetails
            v-else-if="currentStep === 1 && selectedType === 'personal'"
            @back="backToSelectMenu()"
            @continue="handlePersonalDetailsContinue"
        />
        <SignupContactDetails v-if="currentStep === 2" @back="currentStep--" @continue="handleContactDetailsContinue" />
        <SignupProfileDetails v-if="currentStep === 3" @back="currentStep--" @continue="handleSubmit" />
        <SignupFinish v-if="currentStep === 4" />
    </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~~/store/authStore';
import {
    AccountType,
    type FirebaseBusinessAccount as SignupBusinessPayload,
    type FirebasePersonalAccount as SignupPersonalPayload,
    type InputObject,
    type SignupAccountType,
    type CountryType,
    type SignupBusinessDetails as SignupBusinessDetailsType,
    type SignupPersonalDetails as SignupPersonalDetailsType,
    type StringInputObject,
    getCountryTypeValue,
    getInputStringValue,
    toInputObject,
} from '~~/types';
import { useToast } from '@/components/ui/toast/use-toast';
import { registerClassic, registerFirebase } from '~/composables/api/auth';
import { useSignupState } from '@/composables/signup/useSignupState';

interface ValidateAddressResult {
    data: { valid: boolean };
}


const { checkForInputErrors, checkContactConfirmationEmail, checkProfileConfirmationEmail } = useFormValidation();

const authStore = useAuthStore();

const { toast } = useToast();

const { logout } = useFirebaseAuth();

const firebaseToken = authStore.token?.value;
const userInfo = authStore.loggedInUser;

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

const setSelectedType = (value: SignupAccountType | '') => {
    selectedType.value = value;
};

const setSelectedBusinessType = (value: string) => {
    selectedBusinessType.value = value;
};

const continueFromSelectMenu = () => {
    if (!selectedType.value) {
        return;
    }

    currentStep.value++;
};

const handleBusinessDetailsContinue = async () => {
    let hasError = false;
    if (selectedType.value === 'business') {
        hasError = checkForInputErrors([
            businessDetails.value.fullCompanyName,
            businessDetails.value.companyRegistrationNumber,
            toInputObject(businessDetails.value.country.value),
            toInputObject(businessDetails.value.region.value),
            businessDetails.value.city,
            businessDetails.value.postcode,
            businessDetails.value.addressLine1,
        ]);
        if (selectedBusinessType.value !== 'agent') {
            if (vatPayer.value && businessDetails.value.vatNumber) {
                hasError = checkForInputErrors([businessDetails.value.vatNumber]);
            }
        }
    } else if (selectedType.value === 'sole-trader') {
        hasError = checkForInputErrors([
            businessDetails.value.fullCompanyName,
            businessDetails.value.companyRegistrationNumber,
            toInputObject(businessDetails.value.country.value),
            toInputObject(businessDetails.value.region.value),
            businessDetails.value.city,
            businessDetails.value.postcode,
            businessDetails.value.addressLine1,
        ]);
    }

    const result = (await $api.orders.validateAddress({
        country: getCountryTypeValue(businessDetails.value.country),
        region: getCountryTypeValue(businessDetails.value.region),
        city: businessDetails.value.city.value,
        postcode: businessDetails.value.postcode.value,
        name1: businessDetails.value.addressLine1.value,
        name2: businessDetails.value.addressLine2.value,
        default: false,
    })) as ValidateAddressResult;

    if (!result.data.valid) {
        hasError = true;
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Invalid address',
        });
        return;
    }

    if (!hasError) {
        currentStep.value++;
    }
};

const handlePersonalDetailsContinue = async () => {
    let hasError = checkForInputErrors([
        personalDetails.value.firstName,
        personalDetails.value.lastName,
        toInputObject(personalDetails.value.country),
        toInputObject(personalDetails.value.region),
        personalDetails.value.city,
        personalDetails.value.postcode,
        personalDetails.value.addressLine1,
    ]);

    const result = (await $api.orders.validateAddress({
        country: getInputStringValue(personalDetails.value.country),
        region: getInputStringValue(personalDetails.value.region),
        city: personalDetails.value.city.value,
        postcode: personalDetails.value.postcode.value,
        name1: personalDetails.value.addressLine1.value,
        name2: personalDetails.value.addressLine2.value,
        default: false,
    })) as ValidateAddressResult;

    if (!result.data.valid) {
        hasError = true;
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Invalid address',
        });
        return;
    }

    if (!hasError) {
        currentStep.value++;
    }
};

const handleContactDetailsContinue = () => {
    let inputsToCheck = [contactDetails.value.phone];

    if (selectedType.value === 'personal') {
        inputsToCheck.push(contactDetails.value.email, contactDetails.value.confirmEmail);
    } else if (selectedType.value === 'business' || selectedType.value === 'sole-trader') {
        inputsToCheck.push(
            contactDetails.value.firstName,
            contactDetails.value.lastName,
            contactDetails.value.companyEmail,
            contactDetails.value.confirmCompanyEmail
        );
    }

    const hasError =
        checkForInputErrors(inputsToCheck) ||
        checkContactConfirmationEmail({
            email: contactDetails.value.email,
            confirmEmail: contactDetails.value.confirmEmail,
        });

    if (!hasError) {
        currentStep.value++;
        inputsToCheck = [];
    }
};

function mapType(selected: string): AccountType {
    switch (selected) {
        case 'personal':
            return AccountType.Personal;
        case 'sole-trader':
            return AccountType.SoleTrader;
        case 'business':
            if (selectedBusinessType.value === 'executive') {
                return AccountType.Business;
            } else if (selectedBusinessType.value === 'agent') {
                return AccountType.Agent;
            }
            break;
        default:
            break;
    }
    // Return a general default or handle error, if no cases match
    throw new Error('Invalid account type selection');
}

const backToSelectMenu = async () => {
    const personal = useState<SignupPersonalDetailsType>('signup-personal-details');
    const business = useState<SignupBusinessDetailsType>('signup-business-details');

    (Object.keys(personal.value) as Array<keyof SignupPersonalDetailsType>).forEach((key) => {
        personal.value[key].error = '';
    });
    (Object.keys(business.value) as Array<keyof SignupBusinessDetailsType>).forEach((key) => {
        const field = business.value[key];
        if (!field) {
            return;
        }

        if (key === 'country' || key === 'region') {
            (field as CountryType).value.error = '';
        } else {
            (field as StringInputObject).error = '';
        }
    });
    currentStep.value--;
};

const registerClassicSignup = async (payload: SignupPersonalPayload | SignupBusinessPayload): Promise<unknown> => {
    payload.isAlreadyRegisteredWithFirebase = false;
    payload.account.profileDetails.password = profileDetails.value.password.value;

    return await registerClassic(payload);
};

const registerFirebaseSignup = async (payload: SignupPersonalPayload | SignupBusinessPayload): Promise<unknown> => {
    delete payload.account.profileDetails.password;
    payload.account.firebaseId = userInfo?.user_id;
    payload.isAlreadyRegisteredWithFirebase = true;

    return await registerFirebase(payload);
};

const handleSubmit = async () => {
    let inputsToCheck: InputObject[] = [];

    if (firebaseToken) {
        inputsToCheck = [profileDetails.value.accountEmail, profileDetails.value.confirmAccountEmail];
    } else {
        inputsToCheck = [
            profileDetails.value.accountEmail,
            profileDetails.value.confirmAccountEmail,
            profileDetails.value.password,
            profileDetails.value.repeatPassword,
        ];
    }

    const hasError =
        checkForInputErrors(inputsToCheck) ||
        checkProfileConfirmationEmail({
            accountEmail: profileDetails.value.accountEmail,
            confirmAccountEmail: profileDetails.value.confirmAccountEmail,
        });

    if (!hasError) {
        let payload: SignupBusinessPayload | SignupPersonalPayload | null = null;

        if (selectedType.value === 'personal') {
            const personalPayload: SignupPersonalPayload = {
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

            payload = Object.assign({}, personalPayload);
        } else {
            const businessPayload: SignupBusinessPayload = {
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
            payload = Object.assign({}, businessPayload);
        }

        try {
            // eslint-disable-next-line @typescript-eslint/no-unused-expressions
            firebaseToken ? await registerFirebaseSignup(payload) : await registerClassicSignup(payload);

            toast({
                variant: 'success',
                title: 'Success',
                description: 'Account created successfully',
            });

            await logout();
            // TODO: Notification banner
        } catch {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'An error occurred while creating your account',
            });
            return;
        } finally {
            clearFormData();
        }

        currentStep.value++;
    }
};

definePageMeta({
    layout: 'empty',
});

useHead({
    title: 'Signup',
});

onBeforeRouteLeave(() => {
    authStore.$reset();
    logout();
});
</script>
