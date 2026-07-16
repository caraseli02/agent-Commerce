import { handleAddAddress } from '~/server/utils/mockAddressHandlers';

export default defineEventHandler(async (event) => handleAddAddress(event, 'billing'));
