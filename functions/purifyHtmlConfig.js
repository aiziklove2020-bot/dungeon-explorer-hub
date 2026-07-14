/**
 * DUPLICATE of ../shared/purifyHtmlConfig.js — Firebase packages only `functions/`.
 * Update both files together.
 */
export const FORBID_TAGS = [
  'script',
  'iframe',
  'object',
  'embed',
  'applet',
  'form',
  'input',
  'button',
  'textarea',
  'select',
  'option',
  'style',
  'link',
  'meta',
  'base',
  'svg',
  'math',
  'template',
  'slot',
  'video',
  'audio',
  'source',
  'track',
  'frame',
  'frameset'
];

export const PURIFY_HTML = {
  ALLOWED_TAGS: [
    'p',
    'br',
    'strong',
    'b',
    'em',
    'i',
    'u',
    's',
    'strike',
    'del',
    'sub',
    'sup',
    'h1',
    'h2',
    'h3',
    'h4',
    'ul',
    'ol',
    'li',
    'a',
    'span',
    'blockquote',
    'div',
    'pre',
    'code'
  ],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style'],
  ALLOW_DATA_ATTR: false,
  FORBID_TAGS,
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'oninput'],
  ALLOWED_URI_REGEXP:
    /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  RETURN_TRUSTED_TYPE: false
};
