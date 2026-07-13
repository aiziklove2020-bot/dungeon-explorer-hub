import { useState, useEffect, useRef } from 'react';
import { Eye, EyeOff, Maximize2, Minimize2 } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import ForumImageUpload from './ForumImageUpload';
import ForumPostContent from './ForumPostContent';
import RichTextEditor from './RichTextEditor';
import { buildSpoilerBlockFromInner } from '../../utils/spoilerText';

const ForumPostEditor = ({ content, onContentChange, images, onImagesChange, placeholder }) => {
  const { t } = useLanguage();
  const [preview, setPreview] = useState(false);
  const [zen, setZen] = useState(false);
  const quillRef = useRef(null);

  useEffect(() => {
    const root = document.documentElement;
    if (!zen) {
      root.classList.remove('editor-zen-fullscreen');
      return;
    }
    root.classList.add('editor-zen-fullscreen');
    const onKey = (e) => {
      if (e.key === 'Escape') setZen(false);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      root.classList.remove('editor-zen-fullscreen');
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [zen]);

  const insertSpoiler = () => {
    const quill = quillRef.current?.getEditor?.();
    if (!quill) return;
    const ph = t('editor.spoilerPlaceholder') || 'טקסט מוסתר';
    const range = quill.getSelection(true);
    const index = range ? range.index : Math.max(0, quill.getLength() - 1);
    const selLen = range?.length || 0;
    const selected = quill.getText(index, selLen) || '';
    const wrap = buildSpoilerBlockFromInner(selected, ph);
    quill.deleteText(index, selLen);
    quill.insertText(index, wrap);
    quill.setSelection(index + wrap.length, 0);
  };

  const editorBlock = (
    <>
      <div className="flex flex-nowrap sm:flex-wrap items-center gap-2 border-b border-zinc-800 pb-2 overflow-x-auto sm:overflow-visible [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={insertSpoiler}
          className="flex shrink-0 items-center gap-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2.5 py-2 rounded-lg transition-colors min-h-[44px]"
          title={t('editor.spoilerTitle') || 'ספויילר'}
        >
          <EyeOff size={14} />
          {t('editor.spoiler') || 'ספויילר'}
        </button>
        <button
          type="button"
          onClick={() => setPreview(!preview)}
          className={`flex shrink-0 items-center gap-1 text-xs px-2.5 py-2 rounded-lg transition-colors min-h-[44px] ${
            preview ? 'bg-red-600 text-white' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
          }`}
        >
          <Eye size={14} />
          {preview ? (t('editor.backToEdit') || 'עריכה') : (t('editor.preview') || 'תצוגה מקדימה')}
        </button>
        {!preview && (
          <button
            type="button"
            onClick={() => setZen(true)}
            className="flex shrink-0 items-center gap-1 text-xs bg-zinc-800 hover:bg-zinc-600 text-zinc-200 px-2.5 py-2 rounded-lg transition-colors border border-zinc-600 min-h-[44px]"
            title={t('editor.focusModeHint') || 'מסך מלא לכתיבה נוחה'}
          >
            <Maximize2 size={14} />
            {t('editor.focusMode') || 'מסך מלא'}
          </button>
        )}
      </div>

      {preview ? (
        <div className="bg-black/40 border border-zinc-700 rounded-xl p-4 min-h-[120px]">
          <ForumPostContent content={content} images={images} />
        </div>
      ) : (
        <RichTextEditor
          ref={quillRef}
          value={content}
          onChange={onContentChange}
          placeholder={placeholder || 'כתוב כאן...'}
          zen={zen}
        />
      )}

      <p className="text-[11px] text-zinc-500 leading-snug">
        {t('editor.tips') ||
          'טיפ: כותרות, רשימות, ציטוט. קישורים מאובטחים. נוסחה: [math]x^2[/math] או [mathblock]\\sum_{i=1}^n i[/mathblock].'}
      </p>

      <ForumImageUpload images={images} onChange={onImagesChange} />
    </>
  );

  if (zen && !preview) {
    return (
      <div className="fixed inset-0 z-[400] flex flex-col bg-zinc-950/98 backdrop-blur-md p-3 sm:p-5 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex flex-wrap items-center justify-between gap-2 shrink-0 mb-2">
          <span className="text-sm font-bold text-white">{t('editor.focusMode') || 'מצב כתיבה'}</span>
          <button
            type="button"
            onClick={() => setZen(false)}
            className="flex items-center gap-2 text-sm bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-2 rounded-xl font-bold border border-zinc-600"
          >
            <Minimize2 size={16} />
            {t('editor.exitFocus') || 'סגור מסך מלא'}
          </button>
        </div>
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">{editorBlock}</div>
      </div>
    );
  }

  return <div className="space-y-3">{editorBlock}</div>;
};

export default ForumPostEditor;
