import { defineEventHandler, getRequestURL, setResponseHeader } from 'h3';
import { buildPublicSitemapPaths, buildSitemapXml } from '~~/server/utils/crawlPolicy';
import { mockProducts } from '~~/server/utils/mockProducts';

export default defineEventHandler((event) => {
  setResponseHeader(event, 'content-type', 'application/xml; charset=utf-8');
  return buildSitemapXml(getRequestURL(event).origin, buildPublicSitemapPaths(mockProducts));
});
