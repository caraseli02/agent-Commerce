/**
 * SVG security sanitizer
 *
 * Strips XSS attack vectors from user-supplied SVG content at the upload/emit
 * boundary, before the content is stored or rendered via `v-html`.
 *
 * Removes:
 *  - `<script>`, `<foreignObject>`, `<iframe>`, `<object>`, `<embed>` elements
 *  - All `on*` event-handler attributes (onclick, onload, onerror, …)
 *  - `javascript:` URIs from `href` / `xlink:href` / `src` attributes
 *
 * Uses DOMParser + XMLSerializer (same pattern as the existing
 * `adjustSvgDimensions` helper in `components/icon/Upload.vue`).
 */

const DANGEROUS_TAGS = new Set([
  'script',
  'foreignobject',
  'iframe',
  'object',
  'embed',
]);

const URL_ATTRS = new Set(['href', 'xlink:href', 'src']);

const JS_URI_RE = /javascript\s*:/i;

/** Returns a sanitized copy of the supplied SVG markup. */
export function sanitizeSvg(svgContent: string): string {
  if (!svgContent || typeof svgContent !== 'string') {
    return '';
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(svgContent, 'image/svg+xml');

  // Fail closed on malformed SVG — DOMParser emits a <parsererror> in the body.
  if (doc.querySelector('parsererror')) {
    return '';
  }

  const allElements = doc.querySelectorAll('*');

  for (const el of allElements) {
    const tagName = el.tagName.toLowerCase();

    // Remove dangerous elements entirely (along with their subtree).
    if (DANGEROUS_TAGS.has(tagName)) {
      el.remove();
      continue;
    }

    // Strip event-handler attributes and neutralise javascript: URIs.
    const attrs = Array.from(el.attributes);
    for (const attr of attrs) {
      const attrName = attr.name.toLowerCase();

      // onclick, onload, onerror, …
      if (attrName.startsWith('on')) {
        el.removeAttribute(attr.name);
        continue;
      }

      // javascript: URIs in link/source attributes
      if (URL_ATTRS.has(attrName) && JS_URI_RE.test(attr.value)) {
        el.removeAttribute(attr.name);
      }
    }
  }

  return new XMLSerializer().serializeToString(doc);
}
