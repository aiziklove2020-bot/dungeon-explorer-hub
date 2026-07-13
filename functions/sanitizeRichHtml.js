import DOMPurify from 'isomorphic-dompurify';
import { PURIFY_HTML } from './purifyHtmlConfig.js';

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
}

export function sanitizeRichHtml(html) {
  installLinkHooks();
  return DOMPurify.sanitize(html || '', PURIFY_HTML);
}
