/** Default placeholder inside [spoiler] when nothing is selected (Hebrew UI). */
export const SPOILER_PLACEHOLDER_HE = 'טקסט מוסתר';

/**
 * Build `[spoiler]…[/spoiler]` from plain inner text (e.g. Quill selection).
 * Trims one trailing newline from the editor, like the previous Quill behavior.
 */
export function buildSpoilerBlockFromInner(innerPlain, placeholderInner = SPOILER_PLACEHOLDER_HE) {
  let inner = String(innerPlain ?? '');
  if (inner.endsWith('\n')) inner = inner.slice(0, -1);
  if (!inner.trim()) inner = placeholderInner;
  return `[spoiler]${inner}[/spoiler]`;
}

/**
 * Wrap the current textarea/input selection with spoiler tags.
 * @returns {{ next: string, caret: number }}
 */
export function wrapSelectionInPlainText(fullText, selectionStart, selectionEnd, placeholderInner = SPOILER_PLACEHOLDER_HE) {
  const text = fullText ?? '';
  const len = text.length;
  let a = Math.min(Math.max(0, selectionStart ?? 0), len);
  let b = Math.min(Math.max(0, selectionEnd ?? 0), len);
  if (a > b) [a, b] = [b, a];
  const selected = text.slice(a, b);
  const block = buildSpoilerBlockFromInner(selected, placeholderInner);
  const next = text.slice(0, a) + block + text.slice(b);
  const caret = a + block.length;
  return { next, caret };
}
