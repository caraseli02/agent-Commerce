import { handleUpdateAddress } from '~~/server/utils/mockAddressHandlers';

export default defineEventHandler(async (event) => handleUpdateAddress(event, 'shipping'));
