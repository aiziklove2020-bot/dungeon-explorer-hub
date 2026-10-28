import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import ImageUpload from '../ImageUpload';
import Loader from '../Loader';

const getHebrewDayName = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('he-IL', { weekday: 'long' });
  } catch (error) {
    return '';
  }
};

// Parties are saved as local midnight (see handleSave below), so reading
// the date back out must use local getFullYear/getMonth/getDate — not
// toISOString(), which converts to UTC first. Israel is UTC+2/+3, so local
// midnight becomes 21:00-22:00 the *previous* UTC day, and toISOString()
// silently showed the wrong (one day earlier) date the moment an admin
// opened a party to edit it — exactly what was reported as "clicking the
// date gives different dates".
const toLocalDateInputValue = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const PartyEditor = ({ party, onSave, onCancel }) => {
  const { t } = useLanguage();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState(() => {
    const partyDate = party.date instanceof Date ? party.date : new Date(party.date);
    const dateInput = toLocalDateInputValue(partyDate);
    return {
      name: party.name || party.title || '',
      title: party.title || party.name || '',
      description: party.description || '',
      date: dateInput,
      day: party.day || '',
      time: party.time || '',
      dj: party.dj || '',
      imageURL: party.imageURL || '',
      whatsappNumber: party.whatsappNumber || '',
      category: party.category || '',
      badge: party.badge || ''
    };
  });

  useEffect(() => {
    if (formData.date) {
      const hebrewDay = getHebrewDayName(formData.date);
      if (hebrewDay) {
        setFormData(prev => ({ ...prev, day: hebrewDay }));
      }
    }
  }, [formData.date]);

  const handleSave = async () => {


    // Block phone numbers inside the description so contact goes through the
    // dedicated WhatsApp field (which the site uses to build the wa.me link). Normalize away
    // spaces/dashes/parens/dots so "055-936 4370" is caught the same as a plain
    // number; the pattern targets Israeli mobile/landline (0…) and +972 forms.
    const normalizedDesc = String(formData.description || '').replace(/[\s\-().]/g, '');
    if (/(?:\+?972|0)\d{8,9}/.test(normalizedDesc)) {
      alert('אין להזין מספר טלפון בתיאור המסיבה. הזינו מספר וואטסאפ בשדה הייעודי למטה.');
      return;
    }

    setIsSaving(true);

    let finalImageUrl = formData.imageURL;

    if (formData.imageURL && formData.imageURL.startsWith('data:image/')) {
      try {
        const { uploadPartyImage } = await import('../../firebase/storage');

        const base64Data = formData.imageURL.split(',')[1];
        const mimeType = formData.imageURL.match(/data:([^;]+);/)?.[1] || 'image/jpeg';
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mimeType });
        const file = new File([blob], `party-image-${Date.now()}.jpg`, { type: mimeType });
        
        const tempId = `party_${Date.now()}`;
        const imageData = await uploadPartyImage(file, tempId);
        finalImageUrl = typeof imageData === 'string' ? imageData : imageData.url;
      } catch (error) {
        setIsSaving(false);
        alert(`${t('error')}: ${t('admin.errorUploadingImage')}`);
        return; 
      }
    }
    
    // Parse as local midnight so the stored Timestamp has no spurious time component
    const [y, m, d] = formData.date.split('-').map(Number);
    const localMidnight = new Date(y, m - 1, d, 0, 0, 0, 0);

    const dataToSave = {
      ...formData,
      imageURL: finalImageUrl,
      date: localMidnight,
      // Every party is a party of the club: no external parties or ticket links any more.
      partyType: 'internal',
      registrationLink: ''
    };
    
    try {
      await onSave(dataToSave);
    } catch (error) {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-[#20151e] backdrop-blur-2xl border border-white/5 p-6 rounded-2xl space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold">{t('admin.editParty')}</h3>
        <button onClick={onCancel} className="text-[#94A3B8] hover:text-white">
          <X size={20} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1 text-right">
          <label className="text-xs uppercase font-bold text-[#94A3B8]">{t('admin.partyName')} *</label>
          <input
            type="text"
            value={formData.name}
            onChange={e => setFormData(prev => ({...prev, name: e.target.value}))}
            className="w-full bg-[#2a1a24] border border-[rgba(255,255,255,0.08)] p-3 rounded-xl focus:border-[#ff438b] outline-none text-white text-right"
            required
          />
        </div>
        <div className="space-y-1 text-right">
          <label className="text-xs uppercase font-bold text-[#94A3B8]">{t('admin.title')}</label>
          <input
            type="text"
            value={formData.title}
            onChange={e => setFormData(prev => ({...prev, title: e.target.value}))}
            className="w-full bg-[#2a1a24] border border-[rgba(255,255,255,0.08)] p-3 rounded-xl focus:border-[#ff438b] outline-none text-white text-right"
          />
        </div>
        <div className="space-y-1 text-right">
          <label className="text-xs uppercase font-bold text-[#94A3B8]">{t('admin.date')} *</label>
          <input
            type="date"
            value={formData.date}
            onChange={e => setFormData(prev => ({...prev, date: e.target.value}))}
            className="w-full bg-[#2a1a24] border border-[rgba(255,255,255,0.08)] p-3 rounded-xl focus:border-[#ff438b] outline-none text-white text-right"
            required
          />
        </div>
        <div className="space-y-1 text-right">
          <label className="text-xs uppercase font-bold text-[#94A3B8]">{t('admin.dayHebrew')}</label>
          <input
            type="text"
            value={formData.day}
            readOnly
            className="w-full bg-[#2a1a24] border border-[rgba(255,255,255,0.08)] p-3 rounded-xl focus:border-[#ff438b] outline-none text-white text-right opacity-70 cursor-not-allowed"
          />
        </div>
        <div className="space-y-1 text-right">
          <label className="text-xs uppercase font-bold text-[#94A3B8]">{t('admin.time')}</label>
          <input
            type="text"
            value={formData.time}
            onChange={e => setFormData(prev => ({...prev, time: e.target.value}))}
            className="w-full bg-[#2a1a24] border border-[rgba(255,255,255,0.08)] p-3 rounded-xl focus:border-[#ff438b] outline-none text-white text-right"
            placeholder="22:00"
          />
        </div>
        <div className="space-y-1 text-right">
          <label className="text-xs uppercase font-bold text-[#94A3B8]">DJ</label>
          <input
            type="text"
            value={formData.dj}
            onChange={e => setFormData(prev => ({...prev, dj: e.target.value}))}
            className="w-full bg-[#2a1a24] border border-[rgba(255,255,255,0.08)] p-3 rounded-xl focus:border-[#ff438b] outline-none text-white text-right"
          />
        </div>
        <div className="space-y-1 text-right">
          <label className="text-xs uppercase font-bold text-[#94A3B8]">קטגוריה (לסינון באתר)</label>
          <select
            value={formData.category}
            onChange={e => setFormData(prev => ({...prev, category: e.target.value}))}
            className="w-full bg-[#2a1a24] border border-[rgba(255,255,255,0.08)] p-3 rounded-xl focus:border-[#ff438b] outline-none text-white text-right"
          >
            <option value="">— זיהוי אוטומטי מהטקסט —</option>
            <option value="חילופי זוגות">חילופי זוגות</option>
            <option value="בדסמ">בדסמ</option>
            <option value="מאנץ'">מאנץ'</option>
            <option value="פסטיבל">פסטיבל</option>
          </select>
          <p className="text-[#94A3B8] text-xs mt-1">
            קובע איך המסיבה תסונן בדף "מסיבות". אם לא נבחר — המערכת תנסה לזהות לפי הכותרת/תיאור.
          </p>
        </div>
        <div className="space-y-1 text-right">
          <label className="text-xs uppercase font-bold text-[#94A3B8]">תגית קידום (בכרטיס באתר)</label>
          <select
            value={formData.badge}
            onChange={e => setFormData(prev => ({...prev, badge: e.target.value}))}
            className="w-full bg-[#2a1a24] border border-[rgba(255,255,255,0.08)] p-3 rounded-xl focus:border-[#ff438b] outline-none text-white text-right"
          >
            <option value="">— ללא —</option>
            <option value="recommended">⭐ מומלצה</option>
            <option value="popular">🔥 פופולרי</option>
          </select>
          <p className="text-[#94A3B8] text-xs mt-1">
            מציג תגית צבעונית על כרטיס המסיבה בדף הבית. השתמשו בזה במידה, כדי שהתגיות ימשיכו לבלוט.
          </p>
        </div>
      </div>
      <div className="space-y-1 text-right">
        <label className="text-xs uppercase font-bold text-[#94A3B8]">{t('admin.description')}</label>
        <textarea
          value={formData.description}
          onChange={e => setFormData(prev => ({...prev, description: e.target.value}))}
          rows={3}
          className="w-full bg-[#2a1a24] border border-[rgba(255,255,255,0.08)] p-3 rounded-xl focus:border-[#ff438b] outline-none text-white text-right"
        />
        <p className="text-[#94A3B8] text-xs mt-1">
          לא להזין מספר טלפון בתיאור — יש שדה וואטסאפ ייעודי למטה.
        </p>
      </div>
      <div className="space-y-1 text-right">
        <label className="text-xs uppercase font-bold text-[#94A3B8]">{t('admin.imageUrl')}</label>
        <ImageUpload
          value={formData.imageURL}
          onChange={(value) => setFormData(prev => ({...prev, imageURL: value}))}
        />
      </div>
      <div className="space-y-1 text-right">
        <label className="text-xs uppercase font-bold text-[#94A3B8]">מספר וואטסאפ להרשמה</label>
        <input
          type="tel"
          value={formData.whatsappNumber}
          onChange={e => setFormData(prev => ({...prev, whatsappNumber: e.target.value}))}
          className="w-full bg-[#2a1a24] border border-[rgba(255,255,255,0.08)] p-3 rounded-xl focus:border-[#ff438b] outline-none text-white text-right"
          placeholder="050-1234567"
          dir="ltr"
        />
        <p className="text-[#94A3B8] text-xs mt-1">
          ההרשמה למסיבה בוואטסאפ בלבד. אם משאירים ריק, הכפתור באתר שולח הודעה למספר של האתר (055-9364370).
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-[#ff438b] hover:bg-[#ff5596] text-white px-4 md:px-6 py-2 rounded-xl font-bold text-sm md:text-base w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSaving ? (
            <>
              <Loader size="small" />
              <span>{t('admin.saving') || 'שומר...'}</span>
            </>
          ) : (
            t('admin.save')
          )}
        </button>
        <button
          onClick={onCancel}
          disabled={isSaving}
          className="bg-[#2a1a24] hover:bg-[#2a292e] text-white px-4 md:px-6 py-2 rounded-xl font-bold text-sm md:text-base w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t('admin.cancel')}
        </button>
      </div>
    </div>
  );
};

export default PartyEditor;

