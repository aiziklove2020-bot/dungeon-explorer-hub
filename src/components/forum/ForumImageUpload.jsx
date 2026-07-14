import { useState, useRef } from 'react';
import { ImagePlus, X, EyeOff, Link2 } from 'lucide-react';
import { uploadForumImage } from '../../firebase/forum';
import { useLanguage } from '../../i18n/LanguageContext';
import { normalizeForumImage } from '../../utils/forumImages';

const DEFAULT_MAX_IMAGES = 4;

const normalizeHttpUrl = (raw) => {
  const t = (raw || '').trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t;
  if (t.startsWith('//')) return `https:${t}`;
  return `https://${t}`;
};

const isAllowedImageUrl = (s) => {
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
};

const ForumImageUpload = ({ images, onChange, maxImages }) => {
  const MAX_IMAGES = maxImages || DEFAULT_MAX_IMAGES;
  const { t } = useLanguage();
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const inputRef = useRef(null);

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const remaining = MAX_IMAGES - images.length;
    const toUpload = files.slice(0, remaining);
    if (!toUpload.length) return;

    setUploading(true);
    try {
      const uploaded = [];
      for (const file of toUpload) {
        const url = await uploadForumImage(file);
        uploaded.push({ url, isSpoiler: false });
      }
      onChange([...images, ...uploaded]);
    } catch (err) {
      alert(err.message || 'שגיאה בהעלאת תמונה');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const removeImage = (idx) => {
    onChange(images.filter((_, i) => i !== idx));
  };

  const toggleSpoiler = (idx) => {
    const next = images.map((raw, i) => {
      const img = normalizeForumImage(raw);
      if (!img) return raw;
      const isSpoiler = i === idx ? !img.isSpoiler : !!img.isSpoiler;
      return { url: img.url, isSpoiler };
    });
    onChange(next);
  };

  const addImageByUrl = (e) => {
    e?.preventDefault?.();
    if (images.length >= MAX_IMAGES) return;
    const url = normalizeHttpUrl(urlInput);
    if (!url || !isAllowedImageUrl(url)) {
      alert(t('forum.invalidImageUrl') || 'נא להזין כתובת תמונה תקינה (http או https)');
      return;
    }
    onChange([...images, { url, isSpoiler: false }]);
    setUrlInput('');
  };

  const onUrlKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addImageByUrl(e);
    }
  };

  return (
    <div className="space-y-2">
      {images.length > 0 && (
        <>
          <p className="text-[11px] text-zinc-400 leading-snug">{t('forum.imageSpoilerHint') || 'לכל תמונה ניתן לסמן ספוילר — התמונה תוסתר עד שהקורא יבחר לחשוף.'}</p>
          <div className="flex flex-wrap gap-3">
            {images.map((raw, idx) => {
              const img = normalizeForumImage(raw);
              if (!img) return null;
              return (
                <div
                  key={idx}
                  className={`relative group flex flex-col w-[7.25rem] rounded-lg overflow-hidden border ${
                    img.isSpoiler ? 'border-red-600 ring-1 ring-red-600/40' : 'border-zinc-700'
                  }`}
                >
                  <div className="relative h-24 w-full shrink-0 bg-zinc-900">
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                    {img.isSpoiler && (
                      <div className="absolute inset-0 bg-black/45 flex items-center justify-center pointer-events-none">
                        <EyeOff size={22} className="text-white/90" aria-hidden />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute top-1 right-1 bg-black/75 text-white rounded-full p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                      aria-label={t('forum.removeImage') || 'הסר תמונה'}
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleSpoiler(idx)}
                    className={`w-full flex items-center justify-center gap-1 py-2 px-1.5 text-xs font-bold transition-colors border-t min-h-[44px] ${
                      img.isSpoiler
                        ? 'bg-red-950/80 text-red-200 border-red-800 hover:bg-red-900/90'
                        : 'bg-zinc-800/95 text-zinc-300 border-zinc-600 hover:bg-zinc-700'
                    }`}
                    title={img.isSpoiler ? (t('forum.unmarkImageSpoiler') || 'בטל ספוילר') : (t('forum.markImageSpoiler') || 'סמן ספוילר')}
                  >
                    <EyeOff size={12} className="shrink-0" />
                    <span>{img.isSpoiler ? (t('forum.imageSpoilerActive') || 'ספוילר פעיל') : (t('forum.markImageSpoiler') || 'סמן ספוילר')}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
      {images.length < MAX_IMAGES && (
        <>
          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              aria-disabled={uploading}
              className="flex items-center justify-center gap-1.5 text-sm text-zinc-300 hover:text-white transition-colors disabled:text-zinc-500 shrink-0"
            >
              <ImagePlus size={16} aria-hidden="true" />
              {uploading ? (t('forum.uploadingImage') || 'מעלה...') : `${t('forum.addImageFile') || 'העלאה מהמחשב'} (${images.length}/${MAX_IMAGES})`}
            </button>
            <div className="flex flex-1 gap-2 min-w-0">
              <div className="flex items-center gap-1.5 text-zinc-400 shrink-0" title={t('forum.imageByUrlHint') || ''} aria-hidden="true">
                <Link2 size={14} />
              </div>
              <label htmlFor="forum-image-url-input" className="sr-only">
                {t('forum.imageUrlPlaceholder') || 'כתובת תמונה'}
              </label>
              <input
                id="forum-image-url-input"
                type="url"
                inputMode="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={onUrlKeyDown}
                placeholder={t('forum.imageUrlPlaceholder') || 'או הדבק כתובת URL של תמונה...'}
                className="flex-1 min-w-0 bg-black/40 border border-zinc-700 text-white text-sm px-3 py-2 rounded-lg focus:border-red-600 outline-none text-right"
                dir="ltr"
              />
              <button
                type="button"
                onClick={addImageByUrl}
                disabled={!urlInput.trim()}
                aria-disabled={!urlInput.trim()}
                className="shrink-0 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-900 disabled:text-zinc-500 text-white text-sm font-bold px-3 py-2 rounded-lg transition-colors"
              >
                {t('forum.addImageUrl') || 'הוסף'}
              </button>
            </div>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFiles}
            className="hidden"
          />
        </>
      )}
    </div>
  );
};

export default ForumImageUpload;
