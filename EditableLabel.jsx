import { useContent } from '../context/ContentContext';
import { useLanguage } from '../i18n/LanguageContext';
import EditableContent from './EditableContent';

/**
 * Renders a label that can be edited in edit mode (stored in content.labels under translationKey path).
 * Falls back to t(translationKey) when no saved value, then to fallback prop.
 */
const EditableLabel = ({ translationKey, fallback = '', className = '', as = 'span' }) => {
  const { content } = useContent();
  const { t } = useLanguage();

  const getValueByPath = (obj, path) => {
    if (!path) return '';
    const parts = path.split('.');
    let v = obj;
    for (const p of parts) {
      v = v?.[p];
    }
    return v != null && v !== '' ? String(v) : '';
  };

  const contentPath = translationKey ? `labels.${translationKey}` : '';
  const fromContent = contentPath ? getValueByPath(content, contentPath) : '';
  const display = fromContent || (translationKey ? t(translationKey) : '') || fallback || '';

  return (
    <EditableContent contentPath={contentPath} className={className} as={as}>
      {display}
    </EditableContent>
  );
};

export default EditableLabel;
