import { useState, useEffect } from 'react';
import { MessageCircle, Send, Link2, Search } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { getSupportChatSettings, updateSupportChatSettings } from '../../firebase/settings';
import { relayTelegramApi } from '../../utils/telegramRelay';

const getDefaultSiteUrl = () => {
  if (typeof window === 'undefined') return '';
  const origin = window.location.origin;
  return origin.startsWith('http://') ? origin.replace('http://', 'https://') : origin;
};

const SupportChatSection = ({ showSaved }) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settingWebhook, setSettingWebhook] = useState(false);
  const [webhookResult, setWebhookResult] = useState(null);
  const [gettingChatId, setGettingChatId] = useState(false);
  const [chatIdResult, setChatIdResult] = useState(null);
  const [enabled, setEnabled] = useState(false);
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [siteUrl, setSiteUrl] = useState('');

  useEffect(() => {
    getSupportChatSettings({ includeSecrets: true }).then((s) => {
      setEnabled(s?.enabled === true);
      setBotToken(s?.botToken || '');
      setChatId(s?.chatId || '');
      setSiteUrl(s?.siteUrl || getDefaultSiteUrl());
      setLoading(false);
    });
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setWebhookResult(null);
    try {
      await updateSupportChatSettings({
        enabled,
        botToken: botToken.trim() || null,
        chatId: chatId.trim() || null,
        siteUrl: siteUrl.trim() || null
      });
      showSaved();
    } catch (err) {
      alert(err.message || t('saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleGetChatId = async () => {
    const token = botToken.trim();
    if (!token) {
      setChatIdResult({ ok: false, error: t('supportChat.enterBotToken') || 'הזן Bot Token' });
      return;
    }
    setGettingChatId(true);
    setChatIdResult(null);
    try {
      let { data } = await relayTelegramApi('getUpdates', token, {});
      let webhookWasActive = false;
      if (!data.ok && (data.description || '').includes('webhook')) {
        webhookWasActive = true;
        await relayTelegramApi('deleteWebhook', token, {});
        ({ data } = await relayTelegramApi('getUpdates', token, {}));
      }
      if (!data.ok) {
        setChatIdResult({ ok: false, error: data.description || 'Telegram error' });
        return;
      }
      const chats = [];
      const seen = new Set();
      for (const u of data.result || []) {
        const chat = u.message?.chat || u.edited_message?.chat || u.channel_post?.chat ||
          u.my_chat_member?.chat || u.chat_member?.chat;
        if (chat?.id && !seen.has(chat.id)) {
          seen.add(chat.id);
          chats.push({
            id: chat.id,
            type: chat.type || 'unknown',
            title: chat.title || chat.username || chat.first_name || `Chat ${chat.id}`
          });
        }
      }
      const hasGroup = chats.some((c) => c.type === 'group' || c.type === 'supergroup');
      if (chats.length === 0) {
        const msg = webhookWasActive
          ? (t('supportChat.getChatIdWebhookHint') || 'Webhook הוסר. שלח /start בקבוצה (לא hi או @ - בוט מקבל רק פקודות). או השבת privacy mode ב-@BotFather: /setprivacy → Disable. ואז לחץ שוב.')
          : (t('supportChat.getChatIdEmptyHint') || 'שלח /start לבוט (אישי) או בקבוצה. לקבוצה: /start בקבוצה. או השבת privacy mode ב-@BotFather.');
        setChatIdResult({ ok: false, error: msg });
      } else if (!hasGroup) {
        setChatIdResult({
          ok: true,
          chats,
          groupHint: t('supportChat.getChatIdGroupHint') || 'קבוצה לא נמצאה. שלח /start בקבוצה (בוט מקבל רק פקודות). או השבת privacy mode ב-@BotFather: /setprivacy → Disable.'
        });
        setChatId(chats[0].id.toString());
        const url = (siteUrl.trim() || getDefaultSiteUrl()).replace(/\/$/, '');
        if (url && url.startsWith('https://')) {
          await relayTelegramApi('setWebhook', token, { url: `${url}/api/telegram-webhook` });
        }
      } else {
        setChatId(chats[0].id.toString());
        const url = (siteUrl.trim() || getDefaultSiteUrl()).replace(/\/$/, '');
        if (url && url.startsWith('https://')) {
          await relayTelegramApi('setWebhook', token, { url: `${url}/api/telegram-webhook` });
        }
        setChatIdResult({ ok: true, chats });
      }
    } catch (err) {
      setChatIdResult({ ok: false, error: err.message });
    } finally {
      setGettingChatId(false);
    }
  };

  const handleSetWebhook = async () => {
    const token = botToken.trim();
    let url = siteUrl.trim();
    if (!token) {
      setWebhookResult({ ok: false, error: t('supportChat.enterBotToken') || 'הזן Bot Token' });
      return;
    }
    if (!url) {
      url = getDefaultSiteUrl();
      setSiteUrl(url);
    }
    if (!url || !url.startsWith('https://')) {
      setWebhookResult({ ok: false, error: (url ? t('supportChat.httpsRequired') : t('supportChat.enterSiteUrl')) || 'הזן כתובת האתר עם https' });
      return;
    }
    const webhookUrl = `${url.replace(/\/$/, '')}/api/telegram-webhook`;
    setSettingWebhook(true);
    setWebhookResult(null);
    try {
      const { data } = await relayTelegramApi('setWebhook', token, { url: webhookUrl });
      setWebhookResult(data.ok ? { ok: true, message: data.description } : { ok: false, error: data.description });
    } catch (err) {
      setWebhookResult({ ok: false, error: err.message });
    } finally {
      setSettingWebhook(false);
    }
  };

  if (loading) {
    return <div className="text-zinc-400">{t('loading')}</div>;
  }

  return (
    <div className="bg-zinc-900/50 backdrop-blur-2xl border border-white/5 p-4 md:p-6 rounded-xl md:rounded-2xl space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <MessageCircle size={28} className="text-red-500" />
        <div>
          <h2 className="text-xl md:text-2xl font-bold">{t('supportChat.adminTitle') || 'צ\'אט תמיכה'}</h2>
          <p className="text-sm text-zinc-400 mt-1">
            {t('supportChat.adminDesc') || 'בועת צ\'אט בדף הראשי. משתמשים שולחים הודעה - היא מגיעה לטלגרם. ענה בטלגרם (Reply) וההודעה תגיע חזרה לאותו משתמש.'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="w-5 h-5 rounded border-zinc-600 bg-zinc-800 text-red-600 focus:ring-red-600"
          />
          <span className="font-bold">{t('supportChat.enabled') || 'הפעל צ\'אט תמיכה'}</span>
        </label>

        <div>
          <label className="block text-xs uppercase font-bold text-zinc-500 mb-2">
            {t('supportChat.botToken') || 'Bot Token'}
          </label>
          <input
            type="password"
            value={botToken}
            onChange={(e) => setBotToken(e.target.value)}
            placeholder="123456789:ABC..."
            className="w-full bg-black/40 border border-zinc-800 p-3 rounded-xl focus:border-red-600 outline-none text-white"
          />
          <p className="text-xs text-zinc-500 mt-1">
            {t('supportChat.botTokenHint') || 'מתקבל מ-@BotFather. ניתן גם להגדיר ב-Vercel: SUPPORT_CHAT_BOT_TOKEN'}
          </p>
        </div>

        <div>
          <label className="block text-xs uppercase font-bold text-zinc-500 mb-2">
            {t('supportChat.chatId') || 'Chat ID'}
          </label>
          <div className="flex flex-col md:flex-row gap-2">
            <button
              type="button"
              onClick={handleGetChatId}
              disabled={gettingChatId || !botToken.trim()}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl font-bold flex items-center justify-center gap-2 w-full md:w-auto md:shrink-0 order-first md:order-last"
            >
              <Search size={18} />
              {gettingChatId ? (t('loading') || 'טוען...') : (t('supportChat.getChatId') || 'קבל Chat ID')}
            </button>
            <input
              type="text"
              value={chatId}
              onChange={(e) => { setChatId(e.target.value); setChatIdResult(null); }}
              placeholder="123456789"
              className="flex-1 min-w-0 bg-black/40 border border-zinc-800 p-3 rounded-xl focus:border-red-600 outline-none text-white"
            />
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            {t('supportChat.chatIdHint') || 'צ\'אט אישי: שלח /start לבוט, לחץ "קבל Chat ID" - ימולא אוטומטית.'}
          </p>
          {chatIdResult && (
            <div className={`mt-2 p-3 rounded-lg text-sm ${chatIdResult.ok ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}`}>
              {chatIdResult.ok ? (
                <>
                  <p className="mb-2">✅ {chatIdResult.chats?.length || 0} chats found. Click to use:</p>
                  {chatIdResult.groupHint && (
                    <p className="mb-2 text-amber-300 text-xs">{chatIdResult.groupHint}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {chatIdResult.chats?.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setChatId(String(c.id))}
                        className={`px-3 py-1 rounded-lg text-left text-xs ${String(c.id) === chatId ? 'bg-green-700 ring-2 ring-green-400' : 'bg-zinc-700 hover:bg-zinc-600'}`}
                      >
                        {c.title} ({c.type})<br /><span className="opacity-80">{c.id}</span>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                `❌ ${chatIdResult.error}`
              )}
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs uppercase font-bold text-zinc-500 mb-2">
            {t('supportChat.siteUrl') || 'כתובת האתר'}
          </label>
          <input
            type="url"
            value={siteUrl}
            onChange={(e) => setSiteUrl(e.target.value)}
            placeholder="https://talkingbdsm.net"
            className="w-full bg-black/40 border border-zinc-800 p-3 rounded-xl focus:border-red-600 outline-none text-white"
          />
          <p className="text-xs text-zinc-500 mt-1">
            {t('supportChat.siteUrlHint') || 'כתובת האתר עם https (נדרש עבור Webhook)'}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700 space-y-3">
          <h4 className="font-bold">📌 {t('supportChat.webhookTitle') || 'הגדרת Webhook'}</h4>
          <p className="text-sm text-zinc-400">
            {t('supportChat.webhookDesc') || 'כדי שהתשובות מטלגרם יגיעו חזרה למשתמש, לחץ על הכפתור:'}
          </p>
          <p className="text-sm text-amber-400/90">
            {t('supportChat.webhookEnvHint') || '⚠️ לתשובות באתר: הגדר GOOGLE_APPLICATION_CREDENTIALS_JSON ב-Vercel (Firebase service account). Replies need this env var.'}
          </p>
          <p className="text-xs text-zinc-500">
            {t('supportChat.webhookDiagnostic') || 'בדיקה: /api/support-chat-diagnostic'}
          </p>
          <button
            type="button"
            onClick={handleSetWebhook}
            disabled={settingWebhook || !botToken.trim()}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:opacity-50 text-white px-5 py-2 rounded-xl font-bold flex items-center gap-2"
          >
            <Link2 size={18} />
            {settingWebhook ? (t('loading') || 'טוען...') : (t('supportChat.setWebhook') || 'הגדר Webhook')}
          </button>
          {webhookResult && (
            <div className={`p-3 rounded-lg text-sm ${webhookResult.ok ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}`}>
              {webhookResult.ok ? `✅ ${webhookResult.message}` : `❌ ${webhookResult.error}`}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={saving}
          className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2"
        >
          <Send size={18} />
          {saving ? t('loading') : t('save')}
        </button>
      </form>
    </div>
  );
};

export default SupportChatSection;
