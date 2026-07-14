import { useState, useEffect, useId, useRef } from 'react';
import SpoilerWrapButton from './forum/SpoilerWrapButton';
import { useContent } from '../context/ContentContext';
import { useLanguage } from '../i18n/LanguageContext';
import Dialog from './a11y/Dialog';
import './InlineContentEditor.css';

/**
 * Modal to edit a single content field by path. Saves to Firestore via ContentContext.updateContentPath.
 */
const InlineContentEditor = ({ contentPath, initialValue, onClose, onSave }) => {
  const { updateContentPath } = useContent();
  const { t } = useLanguage();
  const [value, setValue] = useState(initialValue || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const textareaRef = useRef(null);
  const titleId = useId();
  const editorTextareaId = useId();

  useEffect(() => {
    setValue(initialValue || '');
  }, [contentPath, initialValue]);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      await updateContentPath(contentPath, value);
      setMessage(t('inlineEditor.saved') || 'נשמר בהצלחה');
      setTimeout(() => {
        setMessage('');
        setSaving(false);
        onSave?.();
        onClose?.();
      }, 800);
    } catch (err) {
      setMessage(err?.message || 'שגיאה בשמירה');
      setSaving(false);
    }
  };

  const label = contentPath.split('.').pop();

  return (
    <Dialog
      open
      onClose={onClose}
      labelledBy={titleId}
      className="inline-content-editor-overlay"
      panelClassName="inline-content-editor-modal"
      initialFocusRef={textareaRef}
    >
      {saving && (
        <div className="inline-content-editor-saving" role="status" aria-live="polite">
          <div className="inline-content-editor-spinner" aria-hidden="true" />
          <p>{t('inlineEditor.saving') || 'שומר...'}</p>
        </div>
      )}
      <div className="inline-content-editor-header">
        <h3 id={titleId}>{t('inlineEditor.edit') || 'עריכת תוכן'}: {label}</h3>
        <button type="button" className="inline-content-editor-close" onClick={onClose} aria-label={t('close')}>×</button>
      </div>
      <div className="inline-content-editor-body">
        <div className="mb-2">
          <SpoilerWrapButton fieldRef={textareaRef} value={value} onValueChange={setValue} />
        </div>
        <label htmlFor={editorTextareaId} className="sr-only">{label}</label>
        <textarea
          id={editorTextareaId}
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={6}
          dir="auto"
          className="inline-content-editor-textarea"
          placeholder={contentPath}
        />
      </div>
      <div className="inline-content-editor-footer">
        {message && (
          <div className={`inline-content-editor-msg ${message.includes('שגיאה') ? 'error' : 'success'}`} role={message.includes('שגיאה') ? 'alert' : 'status'} aria-live="polite">
            {message}
          </div>
        )}
        <div className="inline-content-editor-actions">
          <button type="button" className="inline-content-editor-btn secondary" onClick={onClose} disabled={saving} aria-disabled={saving}>
            {t('close') || 'סגור'}
          </button>
          <button
            type="button"
            className="inline-content-editor-btn primary"
            onClick={handleSave}
            disabled={saving}
            aria-disabled={saving}
          >
            {saving ? (t('inlineEditor.saving') || 'שומר...') : (t('save') || 'שמור')}
          </button>
        </div>
      </div>
    </Dialog>
  );
};

export default InlineContentEditor;
