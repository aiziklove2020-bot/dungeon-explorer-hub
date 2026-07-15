import { useEffect, useState } from 'react';
import { Trash2, Plus, X } from 'lucide-react';
import { getSiteConfig, updateLogoUrl, updateBanners, updatePopup } from '../../firebase/siteConfig';
import { uploadPartyImage } from '../../firebase/storage';

const emptyBanner = () => ({ id: `banner_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, imageUrl: '', linkUrl: '', enabled: true });

const SiteDesignSection = ({ showSaved }) => {
  const [loading, setLoading] = useState(true);
  const [logoUrl, setLogoUrl] = useState('');
  const [banners, setBanners] = useState([]);
  const [popup, setPopup] = useState({ enabled: false, title: '', text: '', imageUrl: '', linkUrl: '', linkText: '' });
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBannerId, setUploadingBannerId] = useState(null);

  useEffect(() => {
    getSiteConfig().then((cfg) => {
      setLogoUrl(cfg.logoUrl || '');
      setBanners(cfg.banners || []);
      setPopup(cfg.popup || popup);
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogoFile = async (file) => {
    if (!file) return;
    setUploadingLogo(true);
    try {
      const result = await uploadPartyImage(file, 'site-logo');
      const url = typeof result === 'string' ? result : result.url;
      setLogoUrl(url);
      await updateLogoUrl(url);
      showSaved?.();
    } catch (err) {
      alert('שגיאה בהעלאת הלוגו: ' + (err?.message || ''));
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleBannerFile = async (bannerId, file) => {
    if (!file) return;
    setUploadingBannerId(bannerId);
    try {
      const result = await uploadPartyImage(file, bannerId);
      const url = typeof result === 'string' ? result : result.url;
      setBanners((prev) => prev.map((b) => (b.id === bannerId ? { ...b, imageUrl: url } : b)));
    } catch (err) {
      alert('שגיאה בהעלאת תמונת הבאנר: ' + (err?.message || ''));
    } finally {
      setUploadingBannerId(null);
    }
  };

  const saveBanners = async (next) => {
    setBanners(next);
    await updateBanners(next);
    showSaved?.();
  };

  const savePopup = async (next) => {
    setPopup(next);
    await updatePopup(next);
    showSaved?.();
  };

  if (loading) return <div className="text-zinc-400">טוען...</div>;

  return (
    <div className="space-y-8">
      {/* Logo */}
      <div className="bg-zinc-900/50 backdrop-blur-2xl border border-white/5 p-6 rounded-2xl space-y-4">
        <h3 className="text-xl font-bold">לוגו האתר</h3>
        <div className="flex items-center gap-4">
          {logoUrl && (
            <img src={logoUrl} alt="לוגו" className="h-16 w-auto object-contain rounded bg-black/40 p-2" />
          )}
          <label className="cursor-pointer bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-xl text-sm">
            {uploadingLogo ? 'מעלה...' : 'העלה לוגו חדש'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploadingLogo}
              onChange={(e) => handleLogoFile(e.target.files?.[0])}
            />
          </label>
        </div>
        <p className="text-xs text-zinc-500">הלוגו יוחלף בכל האתר (כותרת עליונה) מיד לאחר ההעלאה.</p>
      </div>

      {/* Banners */}
      <div className="bg-zinc-900/50 backdrop-blur-2xl border border-white/5 p-6 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold">באנרים</h3>
          <button
            type="button"
            onClick={() => saveBanners([...banners, emptyBanner()])}
            className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white font-bold px-3 py-2 rounded-xl text-sm"
          >
            <Plus size={16} /> הוסף באנר
          </button>
        </div>
        <p className="text-xs text-zinc-500">הבאנרים מוצגים ברצועה בתחתית כל עמוד באתר.</p>
        <div className="space-y-4">
          {banners.map((b) => (
            <div key={b.id} className="border border-zinc-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-4">
                {b.imageUrl && (
                  <img src={b.imageUrl} alt="באנר" className="h-14 w-28 object-cover rounded bg-black/40" />
                )}
                <label className="cursor-pointer bg-zinc-800 hover:bg-zinc-700 text-white font-bold px-3 py-2 rounded-xl text-xs">
                  {uploadingBannerId === b.id ? 'מעלה...' : b.imageUrl ? 'החלף תמונה' : 'העלה תמונה'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingBannerId === b.id}
                    onChange={(e) => handleBannerFile(b.id, e.target.files?.[0])}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => saveBanners(banners.filter((x) => x.id !== b.id))}
                  className="text-zinc-500 hover:text-red-500 mr-auto"
                  aria-label="מחק באנר"
                >
                  <Trash2 size={18} />
                </button>
              </div>
              <input
                type="text"
                placeholder="קישור בלחיצה על הבאנר (אופציונלי)"
                value={b.linkUrl}
                onChange={(e) => setBanners((prev) => prev.map((x) => (x.id === b.id ? { ...x, linkUrl: e.target.value } : x)))}
                onBlur={() => saveBanners(banners)}
                className="w-full bg-black/40 border border-zinc-800 p-2 rounded-xl outline-none text-white text-sm text-right"
              />
              <label className="flex items-center gap-2 text-sm text-zinc-400">
                <input
                  type="checkbox"
                  checked={b.enabled !== false}
                  onChange={(e) => saveBanners(banners.map((x) => (x.id === b.id ? { ...x, enabled: e.target.checked } : x)))}
                />
                פעיל (מוצג באתר)
              </label>
            </div>
          ))}
          {banners.length === 0 && <p className="text-zinc-500 text-sm">אין באנרים עדיין.</p>}
        </div>
      </div>

      {/* Popup */}
      <div className="bg-zinc-900/50 backdrop-blur-2xl border border-white/5 p-6 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold">פופ-אפ / תזכורת</h3>
          <label className="flex items-center gap-2 text-sm text-zinc-400">
            <input
              type="checkbox"
              checked={popup.enabled}
              onChange={(e) => savePopup({ ...popup, enabled: e.target.checked })}
            />
            פעיל
          </label>
        </div>
        <input
          type="text"
          placeholder="כותרת"
          value={popup.title}
          onChange={(e) => setPopup((p) => ({ ...p, title: e.target.value }))}
          onBlur={() => savePopup(popup)}
          className="w-full bg-black/40 border border-zinc-800 p-3 rounded-xl outline-none text-white text-right"
        />
        <textarea
          placeholder="טקסט"
          value={popup.text}
          onChange={(e) => setPopup((p) => ({ ...p, text: e.target.value }))}
          onBlur={() => savePopup(popup)}
          rows={3}
          className="w-full bg-black/40 border border-zinc-800 p-3 rounded-xl outline-none text-white text-right"
        />
        <div className="flex items-center gap-4">
          {popup.imageUrl && (
            <img src={popup.imageUrl} alt="פופ-אפ" className="h-16 w-auto object-contain rounded bg-black/40 p-2" />
          )}
          <label className="cursor-pointer bg-zinc-800 hover:bg-zinc-700 text-white font-bold px-3 py-2 rounded-xl text-xs">
            {popup.imageUrl ? 'החלף תמונה' : 'העלה תמונה (אופציונלי)'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const result = await uploadPartyImage(file, 'site-popup');
                const url = typeof result === 'string' ? result : result.url;
                savePopup({ ...popup, imageUrl: url });
              }}
            />
          </label>
          {popup.imageUrl && (
            <button
              type="button"
              onClick={() => savePopup({ ...popup, imageUrl: '' })}
              className="text-zinc-500 hover:text-red-500"
              aria-label="הסר תמונה"
            >
              <X size={18} />
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="קישור (אופציונלי)"
            value={popup.linkUrl}
            onChange={(e) => setPopup((p) => ({ ...p, linkUrl: e.target.value }))}
            onBlur={() => savePopup(popup)}
            className="w-full bg-black/40 border border-zinc-800 p-3 rounded-xl outline-none text-white text-right"
          />
          <input
            type="text"
            placeholder="טקסט כפתור (אופציונלי)"
            value={popup.linkText}
            onChange={(e) => setPopup((p) => ({ ...p, linkText: e.target.value }))}
            onBlur={() => savePopup(popup)}
            className="w-full bg-black/40 border border-zinc-800 p-3 rounded-xl outline-none text-white text-right"
          />
        </div>
        <p className="text-xs text-zinc-500">הפופ-אפ מוצג פעם אחת לכל מבקר (לפי דפדפן), בכניסה לאתר.</p>
      </div>
    </div>
  );
};

export default SiteDesignSection;
