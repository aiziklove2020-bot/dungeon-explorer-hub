import katex from 'katex';

/**
 * Replace `[math]…[/math]` (inline) and `[mathblock]…[/mathblock]` (display) with KaTeX HTML.
 * Call only on **already sanitized** HTML (or plain text). KaTeX output is treated as trusted HTML.
 */
export function injectKatexIntoHtmlString(html) {
  if (!html || typeof html !== 'string') return html;
  let out = html;
  out = out.replace(/\[mathblock\]([\s\S]*?)\[\/mathblock\]/gi, (_, tex) => renderKatexHtml(tex, true));
  out = out.replace(/\[math\]([\s\S]*?)\[\/math\]/gi, (_, tex) => renderKatexHtml(tex, false));
  return out;
}

/** Trusted KaTeX HTML for one expression (use only after sanitize / plain delimiters). */
export function katexChunkToHtml(tex, displayMode) {
  const t = String(tex ?? '').trim();
  if (!t) return '<span class="katex-empty"></span>';
  try {
    return katex.renderToString(t, {
      throwOnError: false,
      displayMode,
      trust: false,
      strict: 'ignore'
    });
  } catch {
    return '<span class="text-red-400 text-xs">[שגיאת נוסחה]</span>';
  }
}

function renderKatexHtml(tex, displayMode) {
  return katexChunkToHtml(tex, displayMode);
}

/**
 * Split plain text into alternating text / math chunks for React rendering.
 * @returns {Array<{ type: 'text' | 'math', value: string, display?: boolean }>}
 */
export function splitPlainTextMathDelimiters(text) {
  if (!text) return [{ type: 'text', value: '' }];
  const chunks = [];
  const re = /\[mathblock\]([\s\S]*?)\[\/mathblock\]|\[math\]([\s\S]*?)\[\/math\]/gi;
  let last = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) chunks.push({ type: 'text', value: text.slice(last, m.index) });
    if (m[1] !== undefined && m[1] !== null) {
      chunks.push({ type: 'math', value: String(m[1]).trim(), display: true });
    } else {
      chunks.push({ type: 'math', value: String(m[2] ?? '').trim(), display: false });
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) chunks.push({ type: 'text', value: text.slice(last) });
  if (chunks.length === 0) chunks.push({ type: 'text', value: text });
  return chunks;
}
