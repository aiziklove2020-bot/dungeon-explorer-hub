import { looksLikeRichHtml, sanitizeRichHtml } from '../../utils/richTextDisplay';

/**
 * Renders a quoted snippet (reply quote or composer preview). HTML is sanitized; plain text stays as text.
 */
export default function RichQuotePreview({ content, className = '' }) {
  if (content == null || content === '') return null;
  const s = String(content);
  if (looksLikeRichHtml(s)) {
    return (
      <div
        className={`forum-quote-html text-zinc-400 text-sm leading-relaxed overflow-hidden line-clamp-4 [&_p]:my-0 [&_p]:leading-snug ${className}`}
        dir="rtl"
        dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(s) }}
      />
    );
  }
  return (
    <p className={`text-zinc-400 text-sm line-clamp-3 whitespace-pre-wrap ${className}`} dir="rtl">
      {s}
    </p>
  );
}
