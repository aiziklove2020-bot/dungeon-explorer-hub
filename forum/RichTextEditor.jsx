import { useMemo, useRef, useEffect, forwardRef, useCallback, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { useLanguage } from '../../i18n/LanguageContext';
import './RichTextEditor.css';

/* Rows: headings → size → inline → colors → lists/indent → align/dir → blockquote/code → link (no separate font picker — avoids duplicate “size” UX with size classes) */
const buildToolbar = () => [
  [{ header: [1, 2, 3, false] }],
  ['bold', 'italic', 'underline', 'strike'],
  [{ script: 'sub' }, { script: 'super' }],
  [{ color: [] }, { background: [] }],
  [{ list: 'ordered' }, { list: 'bullet' }, { indent: '-1' }, { indent: '+1' }],
  [{ align: [] }, { direction: 'rtl' }],
  ['blockquote', 'code-block'],
  ['link', 'clean']
];

const formats = [
  'header',
  'bold',
  'italic',
  'underline',
  'strike',
  'script',
  'color',
  'background',
  'font',
  'list',
  'bullet',
  'indent',
  'align',
  'direction',
  'blockquote',
  'code-block',
  'link'
];

/**
 * HTML editor for forum/blog. Parent stores `content` as HTML string.
 * Ref exposes the react-quill instance (`getEditor()` → Quill).
 * @param {boolean} zen — large “focus” layout (used with fullscreen wrapper from parent)
 */
const RichTextEditor = forwardRef(function RichTextEditor(
  { value, onChange, placeholder, className = '', zen = false },
  forwardedRef
) {
  const { t } = useLanguage();
  const [toolbarCollapsed, setToolbarCollapsed] = useState(false);
  const localRef = useRef(null);
  const setQuillRef = useCallback(
    (node) => {
      localRef.current = node;
      if (typeof forwardedRef === 'function') forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    },
    [forwardedRef]
  );

  const modules = useMemo(
    () => ({
      toolbar: buildToolbar(),
      clipboard: { matchVisual: false }
    }),
    []
  );

  useEffect(() => {
    const applyRtl = () => {
      const root = localRef.current?.getEditor?.()?.root;
      if (!root) return;
      root.setAttribute('dir', 'rtl');
      root.style.unicodeBidi = 'plaintext';
    };
    applyRtl();
    const id = requestAnimationFrame(applyRtl);
    return () => cancelAnimationFrame(id);
  }, [zen]);

  const hideToolbarLabel = t('editor.hideFormattingToolbar') || 'הסתר סרגל עריכה';
  const showToolbarLabel = t('editor.showFormattingToolbar') || 'הצג סרגל עריכה';

  return (
    <div
      className={`rich-text-editor-wrap forum-post-editor-quill rounded-xl overflow-hidden border border-zinc-700 ${zen ? 'rich-text-editor-wrap--zen' : ''} ${toolbarCollapsed ? 'rich-text-editor-wrap--toolbar-collapsed' : ''} ${className}`}
    >
      <div className="rich-text-editor-toolbar-bar">
        <span className="rich-text-editor-toolbar-bar__title">{t('editor.formattingTools') || 'עיצוב טקסט'}</span>
        <button
          type="button"
          className="rich-text-editor-toolbar-toggle"
          onClick={() => setToolbarCollapsed((c) => !c)}
          aria-expanded={!toolbarCollapsed}
          aria-label={toolbarCollapsed ? showToolbarLabel : hideToolbarLabel}
          title={toolbarCollapsed ? showToolbarLabel : hideToolbarLabel}
        >
          {toolbarCollapsed ? <ChevronDown size={18} strokeWidth={2.25} /> : <ChevronUp size={18} strokeWidth={2.25} />}
          <span className="rich-text-editor-toolbar-toggle__label">{toolbarCollapsed ? showToolbarLabel : hideToolbarLabel}</span>
        </button>
      </div>
      <ReactQuill
        ref={setQuillRef}
        theme="snow"
        value={value || ''}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder || ''}
      />
    </div>
  );
});

export default RichTextEditor;
