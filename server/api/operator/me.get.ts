import { requireOperator } from '~~/server/utils/requireOperator';

// Whether the signed-in account is an operator, and with which permissions. The UI uses it only to
// decide what to show; every operator endpoint checks again on its own.
export default defineEventHandler(async (event) => ({ status: 'success', data: await requireOperator(event) }));
