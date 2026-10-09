import { formatReviewerDate } from '~~/helpers/reviewer-dates';
import type { CustomerCreditInterface } from '~~/types/auth/account-settings';

export const customerCreditHelper = (credit: CustomerCreditInterface) => {
  let spent = '';
  let limit = '';
  let available = '';
  let dueDate;
  let tillDue;
  let term;
  if (credit) {
    limit = new Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(credit.limit);

    spent = new Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(credit.spent);

    available = new Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(credit.available);

    dueDate = formatReviewerDate(credit.dueDate);

    tillDue = credit.tillDue;

    term = credit.term;
  }
  return {
    limit: limit,
    spent: spent,
    available: available,
    dueDate: dueDate,
    tillDue: tillDue,
    term: term,
    freeze: credit?.freeze || false,
    active: credit?.active || false,
  };
};
