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
      maleLimit: party.maleLimit || 100,
      femaleLimit: party.femaleLimit || 100,
      registrationLink: party.registrationLink || '',
      whatsappNumber: party.whatsappNumber || '',
      partyType: party.partyType || 'internal',
      category: party.category || '',
      city: party.city || '',
      publishToInstagram: party.publishToInstagram === true
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

    if (formData.partyType === 'external' && !formData.registrationLink?.trim()) {
      alert(t('admin.externalPartyUrlRequired'));
      return;
    }

    // Block phone numbers inside the description so contact goes through the
    // dedicated WhatsApp field (which the site uses to build the wa.me link and
    // to keep the party out of the on-site registration list). Normalize away
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
      date: localMidnight
    };
    
    try {
      await onSave(dataToSave);
    } catch (error) {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-zinc-900/50 backdrop-blur-2xl border border-white/5 p-6 rounded-2xl space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold">{t('admin.editParty')}</h3>
        <button onClick={onCancel} className="text-zinc-500 hover:text-white">
          <X size={20} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1 text-right">
          <label className="text-xs uppercase font-bold text-zinc-500">{t('admin.partyName')} *</label>
          <input
            type="text"
            value={formData.name}
            onChange={e => setFormData(prev => ({...prev, name: e.target.value}))}
            className="w-full bg-black/40 border border-zinc-800 p-3 rounded-xl focus:border-red-600 outline-none text-white text-right"
            required
          />
        </div>
        <div className="space-y-1 text-right">
          <label className="text-xs uppercase font-bold text-zinc-500">{t('admin.title')}</label>
          <input
            type="text"
            value={formData.title}
            onChange={e => setFormData(prev => ({...prev, title: e.target.value}))}
            className="w-full bg-black/40 border border-zinc-800 p-3 rounded-xl focus:border-red-600 outline-none text-white text-right"
          />
        </div>
        <div className="space-y-1 text-right">
          <label className="text-xs uppercase font-bold text-zinc-500">{t('admin.date')} *</label>
          <input
            type="date"
            value={formData.date}
            onChange={e => setFormData(prev => ({...prev, date: e.target.value}))}
            className="w-full bg-black/40 border border-zinc-800 p-3 rounded-xl focus:border-red-600 outline-none text-white text-right"
            required
          />
        </div>
        <div className="space-y-1 text-right">
          <label className="text-xs uppercase font-bold text-zinc-500">{t('admin.dayHebrew')}</label>
          <input
            type="text"
            value={formData.day}
            readOnly
            className="w-full bg-black/40 border border-zinc-800 p-3 rounded-xl focus:border-red-600 outline-none text-white text-right opacity-70 cursor-not-allowed"
          />
        </div>
        <div className="space-y-1 text-right">
          <label className="text-xs uppercase font-bold text-zinc-500">{t('admin.time')}</label>
          <input
            type="text"
            value={formData.time}
            onChange={e => setFormData(prev => ({...prev, time: e.target.value}))}
            className="w-full bg-black/40 border border-zinc-800 p-3 rounded-xl focus:border-red-600 outline-none text-white text-right"
            placeholder="22:00"
          />
        </div>
        <div className="space-y-1 text-right">
          <label className="text-xs uppercase font-bold text-zinc-500">DJ</label>
          <input
            type="text"
            value={formData.dj}
            onChange={e => setFormData(prev => ({...prev, dj: e.target.value}))}
            className="w-full bg-black/40 border border-zinc-800 p-3 rounded-xl focus:border-red-600 outline-none text-white text-right"
          />
        </div>
        {!formData.whatsappNumber?.trim() && (
          <>
            <div className="space-y-1 text-right">
              <label className="text-xs uppercase font-bold text-zinc-500">{t('admin.maleLimit')}</label>
              <input
                type="number"
                value={formData.maleLimit}
                onChange={e => setFormData(prev => ({...prev, maleLimit: parseInt(e.target.value) || 0}))}
                className="w-full bg-black/40 border border-zinc-800 p-3 rounded-xl focus:border-red-600 outline-none text-white text-right"
                min="0"
              />
            </div>
            <div className="space-y-1 text-right">
              <label className="text-xs uppercase font-bold text-zinc-500">{t('admin.femaleLimit')}</label>
              <input
                type="number"
                value={formData.femaleLimit}
                onChange={e => setFormData(prev => ({...prev, femaleLimit: parseInt(e.target.value) || 0}))}
                className="w-full bg-black/40 border border-zinc-800 p-3 rounded-xl focus:border-red-600 outline-none text-white text-right"
                min="0"
              />
            </div>
          </>
        )}
        <div className="space-y-1 text-right">
          <label className="text-xs uppercase font-bold text-zinc-500">{t('admin.partyType')} *</label>
          <select
            value={formData.partyType}
            onChange={e => setFormData(prev => ({...prev, partyType: e.target.value}))}
            className="w-full bg-black/40 border border-zinc-800 p-3 rounded-xl focus:border-red-600 outline-none text-white text-right"
            required
          >
            <option value="internal">{t('admin.internal')}</option>
            <option value="exchange">{t('admin.exchange')}</option>
            <option value="external">{t('admin.external')}</option>
          </select>
          <p className="text-zinc-500 text-xs mt-1">
            {t('admin.partyTypeDescription')}
          </p>
        </div>
        <div className="space-y-1 text-right">
          <label className="text-xs uppercase font-bold text-zinc-500">קטגוריה (לסינון באתר)</label>
          <select
            value={formData.category}
            onChange={e => setFormData(prev => ({...prev, category: e.target.value}))}
            className="w-full bg-black/40 border border-zinc-800 p-3 rounded-xl focus:border-red-600 outline-none text-white text-right"
          >
            <option value="">— זיהוי אוטומטי מהטקסט —</option>
            <option value="חילופי זוגות">חילופי זוגות</option>
            <option value="בדסמ">בדסמ</option>
            <option value="מאנץ'">מאנץ'</option>
            <option value="פסטיבל">פסטיבל</option>
          </select>
          <p className="text-zinc-500 text-xs mt-1">
            קובע איך המסיבה תסונן בדף "מסיבות". אם לא נבחר — המערכת תנסה לזהות לפי הכותרת/תיאור.
          </p>
        </div>
        <div className="space-y-1 text-right">
          <label className="text-xs uppercase font-bold text-zinc-500">אזור/עיר (לסינון באתר)</label>
          <select
            value={formData.city}
            onChange={e => setFormData(prev => ({...prev, city: e.target.value}))}
            className="w-full bg-black/40 border border-zinc-800 p-3 rounded-xl focus:border-red-600 outline-none text-white text-right"
          >
            <option value="">— זיהוי אוטומטי מהכותרת —</option>
            <option value="תל אביב">תל אביב</option>
            <option value="ירושלים">ירושלים</option>
            <option value="חיפה">חיפה</option>
            <option value="ראשון לציון">ראשון לציון</option>
            <option value="פתח תקווה">פתח תקווה</option>
            <option value="אשדוד">אשדוד</option>
            <option value="נתניה">נתניה</option>
            <option value="באר שבע">באר שבע</option>
            <option value="חולון">חולון</option>
            <option value="רמת גן">רמת גן</option>
            <option value="בת ים">בת ים</option>
            <option value="רחובות">רחובות</option>
            <option value="אשקלון">אשקלון</option>
            <option value="הרצליה">הרצליה</option>
            <option value="כפר סבא">כפר סבא</option>
            <option value="רעננה">רעננה</option>
            <option value="מודיעין">מודיעין</option>
            <option value="נהריה">נהריה</option>
            <option value="אילת">אילת</option>
          </select>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm bg-black/40 border border-zinc-800 p-3 rounded-xl cursor-pointer select-none">
        <input
          type="checkbox"
          checked={formData.publishToInstagram}
          onChange={e => setFormData(prev => ({ ...prev, publishToInstagram: e.target.checked }))}
          className="w-4 h-4 accent-pink-600"
        />
        <span>
          כלול באינסטגרם (talking_b_d_s_m)
          <span className="block text-zinc-500 text-xs mt-0.5">
            רק מסיבות מסומנות כאן ייכללו בכפתור "פרסם מסיבות לאינסטגרם" — כדי לא להציף/לחשוף לחסימה חשבונות שלא רלוונטיים.
          </span>
        </span>
      </label>
      <div className="space-y-1 text-right">
        <label className="text-xs uppercase font-bold text-zinc-500">{t('admin.description')}</label>
        <textarea
          value={formData.description}
          onChange={e => setFormData(prev => ({...prev, description: e.target.value}))}
          rows={3}
          className="w-full bg-black/40 border border-zinc-800 p-3 rounded-xl focus:border-red-600 outline-none text-white text-right"
        />
        <p className="text-zinc-500 text-xs mt-1">
          לא להזין מספר טלפון בתיאור — יש שדה וואטסאפ ייעודי למטה.
        </p>
      </div>
      <div className="space-y-1 text-right">
        <label className="text-xs uppercase font-bold text-zinc-500">{t('admin.imageUrl')}</label>
        <ImageUpload
          value={formData.imageURL}
          onChange={(value) => setFormData(prev => ({...prev, imageURL: value}))}
        />
      </div>
      {formData.partyType === 'external' && (
        <div className="space-y-1 text-right">
          <label className="text-xs uppercase font-bold text-zinc-500">{t('admin.partyPageUrl')} *</label>
          <input
            type="text"
            value={formData.registrationLink}
            onChange={e => setFormData(prev => ({...prev, registrationLink: e.target.value}))}
            className="w-full bg-black/40 border border-zinc-800 p-3 rounded-xl focus:border-red-600 outline-none text-white text-right"
            placeholder="https://..."
            required={formData.partyType === 'external'}
          />
          <p className="text-zinc-500 text-xs mt-1">
            {t('admin.externalPartyUrlRequired')}
          </p>
        </div>
      )}
      <div className="space-y-1 text-right">
        <label className="text-xs uppercase font-bold text-zinc-500">{t('admin.whatsappNumber') || 'מספר וואטסאפ ליצירת קשר'}</label>
        <input
          type="tel"
          value={formData.whatsappNumber}
          onChange={e => setFormData(prev => ({...prev, whatsappNumber: e.target.value}))}
          className="w-full bg-black/40 border border-zinc-800 p-3 rounded-xl focus:border-red-600 outline-none text-white text-right"
          placeholder="050-1234567"
          dir="ltr"
        />
        <p className="text-zinc-500 text-xs mt-1">
          {t('admin.whatsappNumberHint') || 'הזינו רק מספר טלפון - הקישור לוואטסאפ ייווצר אוטומטית'}
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-red-600 hover:bg-red-500 text-white px-4 md:px-6 py-2 rounded-xl font-bold text-sm md:text-base w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
          className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 md:px-6 py-2 rounded-xl font-bold text-sm md:text-base w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t('admin.cancel')}
        </button>
      </div>
    </div>
  );
};

export default PartyEditor;

