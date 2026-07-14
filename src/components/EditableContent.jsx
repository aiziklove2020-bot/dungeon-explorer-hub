import { useState } from 'react';
import { useContent } from '../context/ContentContext';
import { useLanguage } from '../i18n/LanguageContext';
import InlineContentEditor from './InlineContentEditor';
import { Pencil } from 'lucide-react';
import './EditableContent.css';

/**
 * Renders content that can be edited inline when admin is in edit mode (same pattern as SchoolWebsite EditableText).
 * contentPath: dot path into content, e.g. "hero.titleHebrew", "about.roleTitle", "contact.alertText".
 * Children: the current display value (e.g. content.hero.titleHebrew).
 */
const EditableContent = ({ contentPath, children, className = '', as: Wrapper = 'span' }) => {
  const { isEditMode, isViewingAsVisitor, content } = useContent();
  const { t } = useLanguage();
  const [isEditing, setIsEditing] = useState(false);

  const getValueByPath = (obj, path) => {
    if (!path) return '';
    const parts = path.split('.');
    let v = obj;
    for (const p of parts) {
      v = v?.[p];
    }
    return v != null ? String(v) : '';
  };

  const currentValue = getValueByPath(content, contentPath);
  const canEdit = isEditMode() && !isViewingAsVisitor();

  if (!canEdit) {
    return <Wrapper className={className}>{children}</Wrapper>;
  }

  const handleEditClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEditing(true);
  };

  return (
    <>
      <Wrapper className={`editable-content ${className}`}>
        {children}
        <span
          role="button"
          tabIndex={0}
          className="editable-content-btn"
          onClick={handleEditClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleEditClick(e);
            }
          }}
          aria-label={t('a11y.edit') || 'ערוך'}
          title={t('a11y.edit') || 'ערוך'}
        >
          <Pencil size={14} aria-hidden="true" />
        </span>
      </Wrapper>
      {isEditing && (
        <InlineContentEditor
          contentPath={contentPath}
          initialValue={currentValue}
          onClose={() => setIsEditing(false)}
          onSave={() => setIsEditing(false)}
        />
      )}
    </>
  );
};

export default EditableContent;
