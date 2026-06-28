import { useState, useEffect } from 'react';
import { MessageCircle, ExternalLink } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { getLiveChatSettings, updateLiveChatSettings } from '../../firebase/settings';

const LiveChatSection = ({ showSaved }) => {
  const { t } = useLanguage();
  const [retentionDays, setRetentionDays] = useState(3);
  const [globalChatMuted, setGlobalChatMuted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await getLiveChatSettings();
        if (!cancelled) {
          setRetentionDays(s.retentionDays ?? 3);
          setGlobalChatMuted(s.globalChatMuted === true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSave = async () => {
    await updateLiveChatSettings({
      retentionDays,
      globalChatMuted
    });
    showSaved?.();
  };

  if (loading) {
    return (
      <div className="text-zinc-500 text-sm py-8">
        {t('admin.liveChat.loading') || 'טוען…'}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div className="flex items-center gap-2 text-white font-bold text-lg">
        <MessageCircle size={22} className="text-red-500" />
        {t('admin.liveChat.title') || 'צ׳אט (פורום)'}
      </div>

      <p className="text-zinc-400 text-sm leading-relaxed">
        {t('admin.liveChat.intro') ||
          'שמירת הודעות לפי ימים (TTL), והשתקת הצ׳אט הכללי. שינוי ימים חל על הודעות חדשות בלבד.'}
      </p>

      <label className="block space-y-2">
        <span className="text-zinc-300 text-sm font-bold">
          {t('admin.liveChat.retentionDays') || 'ימי שמירת הודעות'}
        </span>
        <input
          type="number"
          min={1}
          max={365}
          value={retentionDays}
          onChange={(e) => setRetentionDays(Number(e.target.value))}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white"
        />
      </label>

      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={globalChatMuted}
          onChange={(e) => setGlobalChatMuted(e.target.checked)}
          className="w-4 h-4 rounded border-zinc-600"
        />
        <span className="text-zinc-200 text-sm">
          {t('admin.liveChat.globalMuted') || 'השתק את הצ׳אט הכללי למשתמשים רגילים'}
        </span>
      </label>

      <button
        type="button"
        onClick={handleSave}
        className="bg-red-600 hover:bg-red-500 text-white font-bold px-6 py-2 rounded-xl"
      >
        {t('admin.save') || 'שמור'}
      </button>

      <a
        href="/chat"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-red-400 hover:text-red-300 text-sm font-bold"
      >
        <ExternalLink size={16} />
        {t('admin.liveChat.openChat') || 'פתח צ׳אט במסך חדש'}
      </a>
    </div>
  );
};

export default LiveChatSection;
