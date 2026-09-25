import DOMPurify from 'dompurify';
import { PURIFY_HTML } from '../../shared/purifyHtmlConfig.js';

/**
 * Rich HTML sanitization for forum/blog (Quill output).
 *
 * Threat model: untrusted users submit HTML; we must prevent XSS, script injection,
 * javascript:/data: URLs, form hijacking, and plugin content (SVG foreignObject, etc.).
 *
 * DOMPurify strips dangerous markup; we restrict tags/attrs to what the editor emits.
 * Inline `style` is allowed — DOMPurify 3+ sanitizes CSS (drops url(), expression, etc.).
 * `class` is limited to Quill’s presentation classes.
 *
 * KaTeX: `[math]…[/math]` / `[mathblock]…[/mathblock]` live in text; `<math>` stays forbidden.
 * Render KaTeX only after sanitize (client `katexDelimiters.js`).
 *
 * @see https://github.com/cure53/DOMPurify
 */

export { PURIFY_HTML };

// `class`/`style` are allowlisted attribute NAMES in PURIFY_HTML, but DOMPurify
// does not restrict their VALUES to anything Quill-shaped — despite the doc
// comment above claiming "`class` is limited to Quill's presentation
// classes," nothing ever enforced that. Without this hook, a forum reply /
// blog post / blog comment containing e.g.
// `<div class="fixed inset-0 z-50 bg-white">` (Tailwind utility classes, which
// this site is built with) or `<a style="position:fixed;inset:0">` passes
// sanitization untouched and can fully overlay any page that renders that
// content — a clickjacking/phishing/defacement primitive. Restrict both to
// exactly what Quill's toolbar (header/color/background/align/direction/
// indent) actually emits. Keep in lockstep with functions/sanitizeRichHtml.js.
const ALLOWED_CLASS_RE = /^ql-(align-(left|center|right|justify)|direction-rtl|indent-[1-8]|size-(small|large|huge)|font-(serif|monospace)|syntax)$/;
const ALLOWED_STYLE_PROPS = new Set(['color', 'background-color']);
const UNSAFE_STYLE_VALUE_RE = /url\(|expression\(|javascript:|@import/i;

function sanitizeClassValue(value) {
  return String(value)
    .split(/\s+/)
    .filter((cls) => ALLOWED_CLASS_RE.test(cls))
    .join(' ');
}

function sanitizeStyleValue(value) {
  return String(value)
    .split(';')
    .map((decl) => decl.trim())
    .filter(Boolean)
    .filter((decl) => {
      const idx = decl.indexOf(':');
      if (idx === -1) return false;
      const prop = decl.slice(0, idx).trim().toLowerCase();
      const val = decl.slice(idx + 1).trim();
      return ALLOWED_STYLE_PROPS.has(prop) && !UNSAFE_STYLE_VALUE_RE.test(val);
    })
    .join('; ');
}

let _hooksInstalled = false;

function installLinkHooks() {
  if (_hooksInstalled || typeof window === 'undefined') return;
  _hooksInstalled = true;
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.nodeName !== 'A') return;
    const target = node.getAttribute('target');
    if (target === '_blank') {
      const rel = (node.getAttribute('rel') || '').split(/\s+/).filter(Boolean);
      ['noopener', 'noreferrer'].forEach((x) => {
        if (!rel.includes(x)) rel.push(x);
      });
      node.setAttribute('rel', rel.join(' '));
    }
  });
  DOMPurify.addHook('uponSanitizeAttribute', (node, data) => {
    if (data.attrName === 'class') {
      const filtered = sanitizeClassValue(data.attrValue);
      if (filtered) data.attrValue = filtered;
      else data.keepAttr = false;
    } else if (data.attrName === 'style') {
      const filtered = sanitizeStyleValue(data.attrValue);
      if (filtered) data.attrValue = filtered;
      else data.keepAttr = false;
    }
  });
}

/**
 * True if string likely contains HTML (Quill or pasted markup), not plain text only.
 */
export function looksLikeRichHtml(s) {
  if (typeof s !== 'string' || !s.trim()) return false;
  return /<\/?[a-z][a-z0-9]*\b/i.test(s);
}

export function sanitizeRichHtml(html) {
  installLinkHooks();
  return DOMPurify.sanitize(html || '', PURIFY_HTML);
}

/** Strip tags for previews / excerpts (no DOM — SSR-safe). */
export function htmlToPlainText(html) {
  if (!html) return '';
  return String(html)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
