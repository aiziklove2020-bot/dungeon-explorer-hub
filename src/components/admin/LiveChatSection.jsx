import { useState, useEffect } from 'react';
import { MessageCircle, ExternalLink, Trash2 } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { getLiveChatSettings, updateLiveChatSettings } from '../../firebase/settings';
import { MAIN_ROOM_ID, clearRoomMessages } from '../../firebase/liveChat';

const CHAT_ROOMS = [
  { id: MAIN_ROOM_ID, label: 'כללי' },
  { id: 'bdsm', label: 'בדס״מ' },
  { id: 'swap', label: 'חילופי זוגות' }
];

const LiveChatSection = ({ showSaved }) => {
  const { t } = useLanguage();
  const [retentionDays, setRetentionDays] = useState(3);
  const [globalChatMuted, setGlobalChatMuted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [clearingRoomId, setClearingRoomId] = useState('');
  const [clearError, setClearError] = useState('');

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

  const handleClearRoom = async (roomId, label) => {
    if (!confirm(`למחוק את כל ההודעות בחדר "${label}"? הפעולה בלתי הפיכה. החדר עצמו יישאר פעיל וריק.`)) return;
    setClearingRoomId(roomId);
    setClearError('');
    try {
      await clearRoomMessages(roomId);
      showSaved?.();
    } catch (err) {
      setClearError(err?.message || 'שגיאה במחיקת ההודעות');
    } finally {
      setClearingRoomId('');
    }
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

      <div className="border-t border-zinc-800 pt-6 space-y-3">
        <div className="text-white font-bold">
          {t('admin.liveChat.clearRoomsTitle') || 'ניקוי הודעות'}
        </div>
        <p className="text-zinc-400 text-sm leading-relaxed">
          {t('admin.liveChat.clearRoomsIntro') ||
            'מוחק את כל ההודעות בחדר כדי לפנות מקום במסד הנתונים. החדר עצמו נשאר פעיל וריק — לא נמחק.'}
        </p>
        {clearError && <p className="text-red-400 text-sm">{clearError}</p>}
        <div className="space-y-2">
          {CHAT_ROOMS.map((room) => (
            <div
              key={room.id}
              className="flex items-center justify-between bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3"
            >
              <span className="text-zinc-200 text-sm font-bold">{room.label}</span>
              <button
                type="button"
                onClick={() => handleClearRoom(room.id, room.label)}
                disabled={clearingRoomId === room.id}
                className="flex items-center gap-2 text-red-400 hover:text-red-300 disabled:opacity-50 text-sm font-bold"
              >
                <Trash2 size={16} />
                {clearingRoomId === room.id
                  ? (t('admin.liveChat.clearing') || 'מוחק…')
                  : (t('admin.liveChat.clearRoom') || 'מחק הודעות')}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LiveChatSection;
