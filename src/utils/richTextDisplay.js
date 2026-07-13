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
