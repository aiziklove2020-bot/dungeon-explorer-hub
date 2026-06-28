import { describe, it, expect } from 'vitest';
import { sanitizeRichHtml, looksLikeRichHtml } from './richTextDisplay.js';

describe('looksLikeRichHtml', () => {
  it('detects simple tags', () => {
    expect(looksLikeRichHtml('<p>x</p>')).toBe(true);
  });
  it('is false for plain text', () => {
    expect(looksLikeRichHtml('hello')).toBe(false);
  });
});

describe('sanitizeRichHtml (production XSS regression)', () => {
  it('strips script tags', () => {
    const out = sanitizeRichHtml('<p>hi</p><script>alert(1)</script>');
    expect(out.toLowerCase()).not.toContain('<script');
    expect(out).not.toMatch(/alert\s*\(/);
  });

  it('strips event handler attributes', () => {
    const out = sanitizeRichHtml('<p onclick="alert(1)">x</p>');
    expect(out.toLowerCase()).not.toContain('onclick');
  });

  it('strips img and javascript URLs', () => {
    const out = sanitizeRichHtml('<img src=x onerror=alert(1)>');
    expect(out.toLowerCase()).not.toContain('<img');
    expect(out.toLowerCase()).not.toContain('onerror');
  });

  it('blocks javascript: in links', () => {
    const out = sanitizeRichHtml('<a href="javascript:alert(1)">click</a>');
    expect(out.toLowerCase()).not.toContain('javascript:');
  });

  it('allows safe https links', () => {
    const out = sanitizeRichHtml('<a href="https://example.com">ok</a>');
    expect(out).toContain('https://example.com');
    expect(out).toContain('<a ');
  });

  it('strips SVG / math (no foreignObject XSS)', () => {
    expect(sanitizeRichHtml('<svg onload=alert(1)></svg>')).not.toContain('<svg');
    expect(sanitizeRichHtml('<math></math>')).not.toContain('<math');
  });

  it('preserves basic Quill formatting', () => {
    const html = '<p><strong>b</strong></p><ul><li>a</li></ul>';
    const out = sanitizeRichHtml(html);
    expect(out).toContain('<strong>');
    expect(out).toContain('<ul>');
  });
});
