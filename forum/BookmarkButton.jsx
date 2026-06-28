import { useState, useEffect } from 'react';
import { Bookmark } from 'lucide-react';
import { addBookmark, removeBookmark, isBookmarked } from '../../firebase/bookmarks';
import { useLanguage } from '../../i18n/LanguageContext';

const BookmarkButton = ({ userId, itemType, itemId }) => {
  const { t } = useLanguage();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!userId || !itemId) return;
    isBookmarked(userId, itemType, itemId).then(setSaved).catch(() => {});
  }, [userId, itemType, itemId]);

  if (!userId) return null;

  const toggle = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      if (saved) {
        await removeBookmark(userId, itemType, itemId);
        setSaved(false);
      } else {
        await addBookmark(userId, itemType, itemId);
        setSaved(true);
      }
    } catch { /* ignore */ }
    setBusy(false);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className={`flex items-center gap-1 text-sm transition-colors ${saved ? 'text-amber-400 hover:text-amber-300' : 'text-zinc-500 hover:text-white'}`}
      title={saved ? (t('bookmarks.remove') || 'הסר ממועדפים') : (t('bookmarks.save') || 'שמור')}
    >
      <Bookmark size={14} className={saved ? 'fill-amber-400' : ''} />
      <span className="text-xs">{saved ? (t('bookmarks.saved') || 'נשמר') : (t('bookmarks.save') || 'שמור')}</span>
    </button>
  );
};

export default BookmarkButton;
