import DOMPurify from 'isomorphic-dompurify';
import { PURIFY_HTML } from './purifyHtmlConfig.js';

// `class`/`style` are allowlisted attribute NAMES in PURIFY_HTML, but DOMPurify
// does not restrict their VALUES to anything Quill-shaped — the doc comment on
// the client twin of this file claimed "`class` is limited to Quill's
// presentation classes" but nothing ever enforced that. Without this hook, a
// forum reply / blog post / blog comment containing e.g.
// `<div class="fixed inset-0 z-50 bg-white">` (Tailwind utility classes, which
// this site is built with) or `<a style="position:fixed;inset:0">` passes
// sanitization untouched and can fully overlay any page that renders that
// content — a clickjacking/phishing/defacement primitive. Restrict both to
// exactly what Quill's toolbar (header/color/background/align/direction/
// indent) actually emits.
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

let hooksInstalled = false;

function installLinkHooks() {
  if (hooksInstalled) return;
  hooksInstalled = true;
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

export function sanitizeRichHtml(html) {
  installLinkHooks();
  return DOMPurify.sanitize(html || '', PURIFY_HTML);
}
