import { EyeOff } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { wrapSelectionInPlainText, SPOILER_PLACEHOLDER_HE } from '../../utils/spoilerText';

/**
 * Wraps the selection in `[spoiler]…[/spoiler]` for controlled text fields (textarea / input).
 * Select part of the text first, or click with an empty selection to insert a placeholder block at the caret.
 */
export default function SpoilerWrapButton({ fieldRef, value, onValueChange, className = '' }) {
  const { t } = useLanguage();
  const label = t('editor.spoiler') || 'ספויילר';
  const placeholderInner = t('editor.spoilerPlaceholder') || SPOILER_PLACEHOLDER_HE;

  const handleClick = () => {
    const el = fieldRef?.current;
    const v = value ?? '';
    const len = v.length;
    const start = el && typeof el.selectionStart === 'number' ? el.selectionStart : len;
    const end = el && typeof el.selectionEnd === 'number' ? el.selectionEnd : len;
    const { next, caret } = wrapSelectionInPlainText(v, start, end, placeholderInner);
    onValueChange(next);
    queueMicrotask(() => {
      if (el && typeof el.focus === 'function') {
        el.focus();
        try {
          el.setSelectionRange(caret, caret);
        } catch {
          /* input type may not support setSelectionRange */
        }
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center gap-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2.5 py-1.5 rounded-lg transition-colors ${className}`}
      title={t('editor.spoilerTitle') || label}
    >
      <EyeOff size={14} aria-hidden />
      {label}
    </button>
  );
}
