import { send, setResponseHeaders, setResponseStatus } from 'h3';
import type { NitroErrorHandler } from 'nitropack/types';
import applyCachePolicy from './middleware/api-cache-policy';

// Nitro replaces Cache-Control on404 and sends errors before beforeResponse.
// Private APIs use the existing JSON formatter, including sensitive-error
// redaction, then restore their cache contract before the response is sent.
const handler: NitroErrorHandler = async (error, event, { defaultHandler }) => {
  if (event.handled || event.context.privateApiCachePolicy !== true) return;
  const response = await defaultHandler(error, event, { json: true });
  setResponseHeaders(event, response.headers);
  setResponseStatus(event, response.status, response.statusText);
  await applyCachePolicy(event);
  await send(event, JSON.stringify(response.body, null, 2));
};

export default handler;
