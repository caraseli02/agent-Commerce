/**
 * @vitest-environment happy-dom
 *
 * Unit tests for the dedicated `sanitizeSvg` utility.
 *
 * These exercise the upload/emit boundary seam in `utils/sanitizeSvg.ts` —
 * NOT scattered `v-html` call sites — so they can run headless without a
 * full Nuxt harness.
 */
import { describe, expect, it } from 'vitest';
import { sanitizeSvg } from '../utils/sanitizeSvg';

describe('sanitizeSvg', () => {
  it('returns empty string for null/undefined/empty input', () => {
    expect(sanitizeSvg('')).toBe('');
    expect(sanitizeSvg(null as unknown as string)).toBe('');
    expect(sanitizeSvg(undefined as unknown as string)).toBe('');
  });

  it('returns empty string for malformed SVG that triggers a parser error', () => {
    // `<svg` with no closing — DOMParser emits a parsererror
    const result = sanitizeSvg('<svg><rect');
    expect(result).toBe('');
  });

  describe('strips <script> elements', () => {
    const payloads = [
      '<svg><script>alert(1)</script></svg>',
      '<svg><script xlink:href="evil.js"></script></svg>',
      '<svg><script>alert(1)</script><rect/></svg>',
      '<svg><rect/><SCRIPT>x()</SCRIPT></svg>',
    ];

    it.each(payloads)('removes <script> from: %s', (payload) => {
      const result = sanitizeSvg(payload);
      expect(result).not.toContain('<script');
      expect(result).not.toContain('</script>');
      expect(result).not.toMatch(/script/i);
    });
  });

  describe('strips <foreignObject> elements', () => {
    const payloads = [
      '<svg><foreignObject><script>alert(1)</script></foreignObject></svg>',
      '<svg><foreignObject><body onload="alert(1)"></body></foreignObject><rect/></svg>',
      '<svg><rect/><FOREIGNOBJECT>html</FOREIGNOBJECT></svg>',
    ];

    it.each(payloads)('removes <foreignObject> from: %s', (payload) => {
      const result = sanitizeSvg(payload);
      expect(result).not.toMatch(/foreignobject/i);
    });
  });

  describe('strips event-handler attributes (onload, onclick, onerror, …)', () => {
    const payloads = [
      '<svg><rect onload="alert(1)"/></svg>',
      '<svg><rect onclick=\'alert(1)\'></rect></svg>',
      '<svg><rect onerror="x()"/></svg>',
      '<svg><image href="x.png" onload="alert(1)"/></svg>',
      '<svg><rect OnLoad="alert(1)"/></svg>',
      '<svg><a xlink:href="ok.svg" onload="alert(1)">x</a></svg>',
    ];

    it.each(payloads)('removes on* attributes from: %s', (payload) => {
      const result = sanitizeSvg(payload);
      expect(result).not.toMatch(/\son\w+\s*=/i);
    });
  });

  describe('neutralises javascript: URIs', () => {
    const payloads = [
      '<svg><a href="javascript:alert(1)">x</a></svg>',
      '<svg><a xlink:href="JavaScript:alert(1)">x</a></svg>',
      '<svg><image href="javascript:alert(1)"/></svg>',
      '<svg><image src="javascript:alert(1)"/></svg>',
    ];

    it.each(payloads)('strips javascript: URI from: %s', (payload) => {
      const result = sanitizeSvg(payload);
      expect(result).not.toMatch(/javascript:/i);
      // The dangerous attribute should be gone, but the element may remain
      expect(result).toContain('<svg');
    });
  });

  describe('preserves benign SVG', () => {
    it('keeps a simple icon intact (minus dangerous vectors)', () => {
      const benign = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><rect width="20" height="20"/><circle cx="10" cy="10" r="5"/></svg>';
      const result = sanitizeSvg(benign);
      expect(result).toContain('<svg');
      expect(result).toContain('<rect');
      expect(result).toContain('<circle');
      // Legitimate attributes should survive
      expect(result).not.toMatch(/\son\w+\s*=/i);
    });

    it('does NOT add blanket DOMPurify side-effects to benign SVG', () => {
      const benign = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0h24v24H0z"/></svg>';
      const result = sanitizeSvg(benign);
      expect(result).toContain('viewBox');
      expect(result).toContain('path');
      expect(result).toContain('M0 0h24v24H0z');
    });
  });

  describe('combined attack vectors', () => {
    it('strips a multi-vector payload', () => {
      const evil = '<svg><script>alert(1)</script><rect onload="alert(1)"/><foreignObject><body onclick="x()"></body></foreignObject><a xlink:href="javascript:alert(1)">x</a></svg>';
      const result = sanitizeSvg(evil);

      expect(result).not.toMatch(/script/i);
      expect(result).not.toMatch(/foreignobject/i);
      expect(result).not.toMatch(/\son\w+\s*=/i);
      expect(result).not.toMatch(/javascript:/i);
    });
  });
});
