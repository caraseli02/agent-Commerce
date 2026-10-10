import type { AccountAdminSettings } from '~~/types/auth/account-settings';
import type { CompanyDetails, ContactDetails, PersonalDetails, ProfileDetails } from '~~/types/auth/user-interface';

export interface FirebasePersonalAccount {
  account: PersonalAccount;
  isAlreadyRegisteredWithFirebase?: boolean;
}

export interface FirebaseBusinessAccount {
  account: BusinessAccount;
  isAlreadyRegisteredWithFirebase?: boolean;
}

interface BusinessAccount {
  accountType: number;
  role: number;
  firebaseId?: string;
  profileDetails: ProfileDetails;
  contactDetails: ContactDetails;
  companyDetails: CompanyDetails;
  adminSettings?: AccountAdminSettings;
}

interface PersonalAccount {
  accountType: number;
  role: number;
  firebaseId?: string;
  profileDetails: ProfileDetails;
  contactDetails: ContactDetails;
  personalDetails: PersonalDetails;
  adminSettings?: AccountAdminSettings;
}
