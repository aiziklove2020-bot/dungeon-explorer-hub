/**
 * True when editor HTML is empty or only Quill empty blocks (e.g. `<p><br></p>`).
 */
export function isHtmlContentEmpty(html) {
  if (html == null) return true;
  const s = String(html);
  if (!s.trim()) return true;
  const text = s
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\u200b/g, '')
    .trim();
  return text.length === 0;
}
