import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { getSiteTexts, saveSiteText } from '../../firebase/siteConfig';
import { DEFAULT_ABOUT_TEXT, DEFAULT_CONTACT_TEXT, SITE_TEXT_MAX } from '../../../shared/siteTexts.js';

/**
 * Edits the text shown on the About page ("אודות") or the Contact page ("צור קשר").
 * Leaving it empty brings back the default text.
 */
const PAGES = {
  aboutText: { title: 'עריכת עמוד אודות', hint: 'הטקסט שמופיע בדף "אודות" מתחת לפתיחה.', def: DEFAULT_ABOUT_TEXT },
  contactText: { title: 'עריכת עמוד צור קשר', hint: 'הטקסט שמופיע בדף "יצירת קשר" מעל כפתור הוואטסאפ לאבי.', def: DEFAULT_CONTACT_TEXT },
};

const SiteTextSection = ({ field, showSaved }) => {
  const page = PAGES[field];
  const [text, setText] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getSiteTexts().then((t) => setText(t[field])).catch(() => setError('לא הצלחנו לטעון את הטקסט'));
  }, [field]);

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await saveSiteText(field, text);
      if (!text.trim()) setText(page.def);
      showSaved?.();
    } catch (err) {
      setError(`השמירה נכשלה: ${err.message || 'שגיאה'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-[#20151e] backdrop-blur-2xl border border-white/5 p-4 md:p-6 rounded-xl md:rounded-2xl space-y-4" dir="rtl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-xl md:text-2xl font-bold">{page.title}</h2>
        <button type="button" onClick={save} disabled={saving || text === null} className="bg-[#ff438b] hover:bg-[#ff5596] text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 text-sm disabled:opacity-50">
          <Save size={16} /> {saving ? 'שומר...' : 'שמור'}
        </button>
      </div>
      <p className="text-xs text-[#94A3B8]">{page.hint} שמירה מעדכנת את האתר מיד. אם מוחקים את כל הטקסט, חוזר טקסט ברירת המחדל.</p>
      {error && <p className="text-sm" style={{ color: '#ff8a8a' }}>{error}</p>}
      {text === null ? (
        <p className="text-[#c0aebb]">טוען...</p>
      ) : (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={SITE_TEXT_MAX}
          rows={8}
          className="w-full bg-[#2a1a24] border border-[rgba(255,255,255,0.08)] p-3 rounded-xl focus:border-[#ff438b] outline-none text-white text-right"
        />
      )}
    </div>
  );
};

export default SiteTextSection;
