import { defineEventHandler, getRequestURL, setResponseHeader } from 'h3';
import { buildRobotsTxt } from '~~/server/utils/crawlPolicy';

export default defineEventHandler((event) => {
  setResponseHeader(event, 'content-type', 'text/plain; charset=utf-8');
  return buildRobotsTxt(getRequestURL(event).origin);
});
