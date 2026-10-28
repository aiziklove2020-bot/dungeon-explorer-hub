import { useEffect, useState } from 'react';
import { Trash2, Plus, ArrowUp, ArrowDown } from 'lucide-react';
import { getPartyBanners, savePartyBanners } from '../../firebase/siteConfig';
import { uploadPartyImage } from '../../firebase/storage';

/**
 * The banners shown on the home page between the parties (one after every 2
 * parties on phones, every 3 on desktop, taking turns). Each one can get a new
 * picture and link, be hidden, moved or deleted, and new ones can be added.
 */
const inputCls = 'w-full bg-[#2a1a24] border border-[rgba(255,255,255,0.08)] p-2 rounded-xl outline-none text-white text-sm text-right';

const PartyBannersSection = ({ showSaved }) => {
  const [banners, setBanners] = useState(null);
  const [uploadingId, setUploadingId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getPartyBanners().then(setBanners).catch(() => setError('לא הצלחנו לטעון את הבאנרים'));
  }, []);

  const save = async (next) => {
    setBanners(next);
    setError('');
    try {
      setBanners(await savePartyBanners(next));
      showSaved?.();
    } catch (err) {
      setError(`השמירה נכשלה: ${err.message || 'שגיאה'}`);
    }
  };
  const edit = (id, patch) => setBanners((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  const move = (i, d) => {
    const next = [...banners];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    save(next);
  };

  const uploadImage = async (id, file) => {
    if (!file) return;
    setUploadingId(id);
    try {
      const result = await uploadPartyImage(file, `banner-${id}`);
      const url = typeof result === 'string' ? result : result.url;
      await save(banners.map((b) => (b.id === id ? { ...b, image: url } : b)));
    } catch (err) {
      setError(`העלאת התמונה נכשלה: ${err.message || 'שגיאה'}`);
    } finally {
      setUploadingId(null);
    }
  };

  const addBanner = async (file) => {
    if (!file) return;
    const id = `b${Date.now()}`;
    setUploadingId(id);
    try {
      const result = await uploadPartyImage(file, `banner-${id}`);
      const url = typeof result === 'string' ? result : result.url;
      await save([...banners, { id, kind: 'image', image: url, link: '', alt: '', enabled: true }]);
    } catch (err) {
      setError(`העלאת התמונה נכשלה: ${err.message || 'שגיאה'}`);
    } finally {
      setUploadingId(null);
    }
  };

  if (!banners) return <div className="text-[#c0aebb]">{error || 'טוען...'}</div>;

  return (
    <div className="bg-[#20151e] backdrop-blur-2xl border border-white/5 p-6 rounded-2xl space-y-4" dir="rtl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-xl font-bold">באנרים בין המסיבות</h3>
        <label className="cursor-pointer flex items-center gap-1 bg-[#ff438b] hover:bg-[#ff5596] text-white font-bold px-3 py-2 rounded-xl text-sm">
          <Plus size={16} /> {uploadingId?.startsWith('b') && !banners.some((b) => b.id === uploadingId) ? 'מעלה...' : 'הוספת באנר (העלאת תמונה)'}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => addBanner(e.target.files?.[0])} />
        </label>
      </div>
      <p className="text-xs text-[#94A3B8]">בדף הבית, אחרי כל 2 מסיבות (בנייד) או 3 (במחשב) מופיע באנר אחד, לפי הסדר כאן. שינוי נשמר ומופיע באתר מיד.</p>
      {error && <p className="text-sm" style={{ color: '#ff8a8a' }}>{error}</p>}
      <div className="space-y-4">
        {banners.map((b, i) => (
          <div key={b.id} className="border border-[rgba(255,255,255,0.08)] rounded-xl p-4 space-y-3" style={{ opacity: b.enabled ? 1 : 0.55 }}>
            <div className="flex items-start gap-4 flex-wrap">
              {b.kind === 'whatsapp' ? (
                <div className="h-16 w-40 rounded flex items-center justify-center text-xs font-bold text-white" style={{ background: '#128C4B' }}>באנר קבוצת הוואטסאפ</div>
              ) : (
                <img src={b.image} alt={b.alt || 'באנר'} className="h-16 w-40 object-cover rounded bg-[#2a1a24]" />
              )}
              <div className="flex flex-wrap gap-2 items-center">
                {b.kind === 'image' && (
                  <label className="cursor-pointer bg-[#2a1a24] hover:bg-[#2a292e] text-white font-bold px-3 py-2 rounded-xl text-xs">
                    {uploadingId === b.id ? 'מעלה...' : 'החלפת תמונה'}
                    <input type="file" accept="image/*" className="hidden" disabled={uploadingId === b.id} onChange={(e) => uploadImage(b.id, e.target.files?.[0])} />
                  </label>
                )}
                <label className="flex items-center gap-1.5 text-sm text-[#c0aebb]">
                  <input type="checkbox" checked={b.enabled} onChange={(e) => save(banners.map((x) => (x.id === b.id ? { ...x, enabled: e.target.checked } : x)))} />
                  מוצג באתר
                </label>
              </div>
              <div className="flex gap-1 mr-auto">
                <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="p-1.5 rounded-lg bg-[#2a1a24] disabled:opacity-30" aria-label="למעלה"><ArrowUp size={16} /></button>
                <button type="button" disabled={i === banners.length - 1} onClick={() => move(i, 1)} className="p-1.5 rounded-lg bg-[#2a1a24] disabled:opacity-30" aria-label="למטה"><ArrowDown size={16} /></button>
                <button
                  type="button"
                  onClick={() => window.confirm('למחוק את הבאנר?') && save(banners.filter((x) => x.id !== b.id))}
                  className="p-1.5 rounded-lg bg-[#2a1a24] text-[#94A3B8] hover:text-[#ffb4ab]"
                  aria-label="מחיקת באנר"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <input
              type="url"
              dir="ltr"
              placeholder="קישור בלחיצה על הבאנר (https://...)"
              value={b.link}
              onChange={(e) => edit(b.id, { link: e.target.value })}
              onBlur={() => save(banners)}
              className={inputCls}
            />
          </div>
        ))}
        {banners.length === 0 && <p className="text-[#94A3B8] text-sm">אין באנרים. בדף הבית יופיעו רק המסיבות.</p>}
      </div>
    </div>
  );
};

export default PartyBannersSection;
