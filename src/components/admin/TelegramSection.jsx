import { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { useLanguage } from '../../i18n/LanguageContext';
import { getTelegramSettings, updateTelegramSettings } from '../../firebase/settings';
import { getRegistrationSettings } from '../../firebase/settings';
import { getBotInfo, MESSAGE_KEYS, REGISTRATION_TYPE_KEYS, BALANCE_PUBLISH_TYPE_KEYS, VARIABLES_REFERENCE, buildMessagePreview, sendTelegramNotification } from '../../firebase/telegram';
import { getAllAdvertisers } from '../../firebase/advertisers';
import { Plus, Trash2, Edit2, ChevronDown, ChevronRight, Send, Eye, Mail } from 'lucide-react';

const BUILT_IN_MESSAGE_KEYS = [MESSAGE_KEYS.REGISTRATION, MESSAGE_KEYS.BALANCE_PUBLISH, MESSAGE_KEYS.NEW_PARTY, MESSAGE_KEYS.NEW_EXTERNAL_PARTY, MESSAGE_KEYS.NEW_STORE_ITEM, MESSAGE_KEYS.NEW_STORE_ORDER, MESSAGE_KEYS.NEW_WORKSHOP, MESSAGE_KEYS.NEW_WORKSHOP_REGISTRATION];

const getDefaultMessageName = (t, key) => {
  const names = {
    [MESSAGE_KEYS.REGISTRATION]: t('admin.telegram.msgNewRegistration'),
    [MESSAGE_KEYS.BALANCE_PUBLISH]: t('admin.telegram.msgBalancePublish'),
    [MESSAGE_KEYS.NEW_PARTY]: t('admin.telegram.msgNewParty'),
    [MESSAGE_KEYS.NEW_STORE_ITEM]: t('admin.telegram.msgNewStoreItem'),
    [MESSAGE_KEYS.NEW_STORE_ORDER]: t('admin.telegram.msgNewStoreOrder'),
    [MESSAGE_KEYS.NEW_WORKSHOP]: t('admin.telegram.msgNewWorkshop'),
    [MESSAGE_KEYS.NEW_WORKSHOP_REGISTRATION]: t('admin.telegram.msgNewWorkshopRegistration'),
    [MESSAGE_KEYS.NEW_EXTERNAL_PARTY]: t('admin.telegram.msgNewExternalParty')
  };
  return names[key] || key;
};

const getRegistrationTypeLabel = (t, key) => {
  const labels = {
    [REGISTRATION_TYPE_KEYS.DEFAULT]: t('admin.telegram.regTypeDefault'),
    [REGISTRATION_TYPE_KEYS.SINGLE_MALE_BALANCE]: t('admin.telegram.regTypeSingleMale'),
    [REGISTRATION_TYPE_KEYS.SINGLE_FEMALE_BALANCE]: t('admin.telegram.regTypeSingleFemale'),
    [REGISTRATION_TYPE_KEYS.SINGLE_FEMALE_DISCOUNT]: t('admin.telegram.regTypeSingleFemaleDiscount'),
    [REGISTRATION_TYPE_KEYS.COUPLE]: t('admin.telegram.regTypeCouple')
  };
  return labels[key] || key;
};

const BALANCE_PUBLISH_TAB_TO_CASE = {
  [BALANCE_PUBLISH_TYPE_KEYS.DEFAULT]: 'needWomen',
  [BALANCE_PUBLISH_TYPE_KEYS.NO_REGISTRATIONS]: 'noRegistrations',
  [BALANCE_PUBLISH_TYPE_KEYS.NEED_WOMEN]: 'needWomen',
  [BALANCE_PUBLISH_TYPE_KEYS.NEED_MEN]: 'needMen',
  [BALANCE_PUBLISH_TYPE_KEYS.REGISTER_FOR_BALANCE]: 'registerForBalance'
};

const getBalancePublishCaseLabel = (t, key) => {
  const labels = {
    [BALANCE_PUBLISH_TYPE_KEYS.DEFAULT]: t('admin.telegram.regTypeDefault'),
    [BALANCE_PUBLISH_TYPE_KEYS.NO_REGISTRATIONS]: t('admin.telegram.balanceCaseNoRegistrations'),
    [BALANCE_PUBLISH_TYPE_KEYS.NEED_WOMEN]: t('admin.telegram.balanceCaseNeedWomen'),
    [BALANCE_PUBLISH_TYPE_KEYS.NEED_MEN]: t('admin.telegram.balanceCaseNeedMen'),
    [BALANCE_PUBLISH_TYPE_KEYS.REGISTER_FOR_BALANCE]: t('admin.telegram.balanceCaseRegisterForBalance')
  };
  return labels[key] || key;
};

const REGISTRATION_TYPE_PREVIEW_KEY = {
  [REGISTRATION_TYPE_KEYS.DEFAULT]: 'single-male-balance',
  [REGISTRATION_TYPE_KEYS.SINGLE_MALE_BALANCE]: 'single-male-balance',
  [REGISTRATION_TYPE_KEYS.SINGLE_FEMALE_BALANCE]: 'single-female-balance',
  [REGISTRATION_TYPE_KEYS.SINGLE_FEMALE_DISCOUNT]: 'single-female-discount',
  [REGISTRATION_TYPE_KEYS.COUPLE]: 'couple'
};

/** Map registration template tab -> VARIABLES_REFERENCE key for "this type" vars only */
const REGISTRATION_TAB_TO_VARS_KEY = {
  [REGISTRATION_TYPE_KEYS.DEFAULT]: 'singleMale',
  [REGISTRATION_TYPE_KEYS.SINGLE_MALE_BALANCE]: 'singleMale',
  [REGISTRATION_TYPE_KEYS.SINGLE_FEMALE_BALANCE]: 'singleFemale',
  [REGISTRATION_TYPE_KEYS.SINGLE_FEMALE_DISCOUNT]: 'singleFemaleDiscount',
  [REGISTRATION_TYPE_KEYS.COUPLE]: 'couple'
};

const COUPLE_TEMPLATE_PLACEHOLDER = `שם הגבר: {{registration.fullName}}
טלפון הגבר: {{registration.phoneNumber}}
טלגרם הגבר: {{registration.telegramUsername}}

שם האישה: {{registration.womanFullName}}
טלפון האישה: {{registration.womanPhoneNumber}}
טלגרם האישה: {{registration.womanTelegramUsername}}`;

const genId = () => Math.random().toString(36).slice(2, 12);

// Telegram preview: render only the small subset of HTML tags that Telegram's
// `parse_mode=HTML` actually supports, and sanitize everything else with
// DOMPurify so we share the same XSS layer used by the forum/blog renderer.
const TELEGRAM_ALLOWED_TAGS = ['b', 'strong', 'i', 'em', 'u', 's', 'code', 'pre', 'br', 'a'];
const TELEGRAM_ALLOWED_ATTRS = ['href'];

const safePreviewHtml = (raw) => {
  if (!raw || typeof raw !== 'string') return '';
  const withBreaks = raw.replace(/\n/g, '<br/>');
  return DOMPurify.sanitize(withBreaks, {
    ALLOWED_TAGS: TELEGRAM_ALLOWED_TAGS,
    ALLOWED_ATTR: TELEGRAM_ALLOWED_ATTRS,
    ALLOWED_URI_REGEXP: /^https?:/i
  });
};

const MessagePreviewBox = ({ text }) => (
  <div
    className="text-white text-sm whitespace-pre-wrap break-words font-sans min-h-[80px] p-3 rounded-lg bg-black/40 border border-zinc-800"
    dir="auto"
    dangerouslySetInnerHTML={{ __html: safePreviewHtml(text) }}
  />
);

const TelegramSection = ({ showSaved }) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bots, setBots] = useState([]);
  const [channels, setChannels] = useState([]);
  const [messages, setMessages] = useState([]);
  const [legacy, setLegacy] = useState(null);
  const [activePanel, setActivePanel] = useState('bots');
  const [editingBot, setEditingBot] = useState(null);
  const [editingChannel, setEditingChannel] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [registrationTemplateTab, setRegistrationTemplateTab] = useState(REGISTRATION_TYPE_KEYS.DEFAULT);
  const [balancePublishCaseTab, setBalancePublishCaseTab] = useState(BALANCE_PUBLISH_TYPE_KEYS.NEED_WOMEN);
  const [newBot, setNewBot] = useState({ name: '', token: '' });
  const [newChannel, setNewChannel] = useState({ name: '', chatId: '' });
  const [newMessage, setNewMessage] = useState({ name: '', key: `custom-${genId()}`, template: '', parseMode: 'HTML', enabled: true, botId: '', channelIds: [] });
  const [botInfos, setBotInfos] = useState({});
  const [sendMsgText, setSendMsgText] = useState('');
  const [sendMsgParseMode, setSendMsgParseMode] = useState('HTML');
  const [sendMsgBotIds, setSendMsgBotIds] = useState([]);
  const [sendMsgChannelIds, setSendMsgChannelIds] = useState([]);
  const [sendingMsg, setSendingMsg] = useState(false);
  const [sendMsgResult, setSendMsgResult] = useState(null);
  const [advertisers, setAdvertisers] = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      getAllAdvertisers().then((all) => setAdvertisers(all.filter((a) => a.status === 'approved'))).catch(() => setAdvertisers([]));
      const [tg, reg] = await Promise.all([getTelegramSettings(), getRegistrationSettings()]);
      if (tg.legacy) {
        setLegacy(tg.legacy);
        const botList = tg.legacy.botToken
          ? [{ id: 'legacy', name: 'Legacy (Matching)', token: tg.legacy.botToken }]
          : [];
        const channelList = tg.legacy.chatId
          ? [{ id: 'legacy', name: 'Legacy Channel', chatId: tg.legacy.chatId }]
          : [];
        if (reg.telegramBotToken && !botList.some((b) => b.token === reg.telegramBotToken)) {
          botList.push({ id: 'reg', name: 'Registration', token: reg.telegramBotToken });
        }
        if (reg.telegramChatId && !channelList.some((c) => c.chatId === reg.telegramChatId)) {
          channelList.push({ id: 'reg', name: 'Registration Channel', chatId: reg.telegramChatId });
        }
        setBots(botList);
        setChannels(channelList);
        const msgList = [
          {
            id: genId(),
            key: MESSAGE_KEYS.REGISTRATION,
            name: getDefaultMessageName(t, MESSAGE_KEYS.REGISTRATION),
            template: '',
            parseMode: 'HTML',
            enabled: reg.telegramEnabled === true,
            botId: reg.telegramBotToken ? (botList.find((b) => b.token === reg.telegramBotToken)?.id || 'reg') : '',
            channelIds: reg.telegramChatId ? [channelList.find((c) => c.chatId === reg.telegramChatId)?.id || 'reg'] : [],
            siteUrl: ''
          },
          {
            id: genId(),
            key: MESSAGE_KEYS.BALANCE_PUBLISH,
            name: getDefaultMessageName(t, MESSAGE_KEYS.BALANCE_PUBLISH),
            template: '',
            parseMode: 'HTML',
            enabled: tg.legacy.enabled !== false,
            botId: 'legacy',
            channelIds: ['legacy'],
            siteUrl: tg.legacy.siteUrl || ''
          }
        ];
        setMessages(msgList);
      } else {
        setLegacy(null);
        setBots(tg.bots || []);
        setChannels(tg.channels || []);
        const defaultMs = BUILT_IN_MESSAGE_KEYS.map((key) => ({
          id: genId(),
          key,
          name: getDefaultMessageName(t, key),
          template: '',
          parseMode: 'HTML',
          enabled: false,
          botId: '',
          channelIds: [],
          siteUrl: ''
        }));
        const raw = tg.messages && tg.messages.length ? tg.messages : defaultMs;
        const withoutMatch = raw.filter((m) => m.key !== MESSAGE_KEYS.MATCH_NOTIFICATION);
        const merged = defaultMs.map((d) => {
          const found = withoutMatch.find((r) => r.key === d.key);
          return found ? { ...d, ...found, name: getDefaultMessageName(t, d.key) || found.name } : { ...d, id: genId() };
        });
        const custom = withoutMatch.filter((r) => !BUILT_IN_MESSAGE_KEYS.includes(r.key));
        setMessages([...merged, ...custom]);
      }
    } catch {
      setBots([]);
      setChannels([]);
      setMessages([]);
      setLegacy(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const tokens = bots.map((b) => b.token).filter(Boolean);
    tokens.forEach(async (token) => {
      if (token.length > 20) {
        const info = await getBotInfo(token);
        setBotInfos((prev) => ({ ...prev, [token]: info }));
      }
    });
  }, [bots]);

  const handleSave = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    setSaving(true);
    try {
      await updateTelegramSettings({ bots, channels, messages });
      showSaved();
      setLegacy(null);
    } catch (err) {
      alert(t('admin.errorSaving'));
    } finally {
      setSaving(false);
    }
  };

  const addBot = () => {
    if (!newBot.name.trim() || !newBot.token.trim()) return;
    setBots((prev) => [...prev, { id: genId(), name: newBot.name.trim(), token: newBot.token.trim() }]);
    setNewBot({ name: '', token: '' });
  };

  const updateBot = (id, name, token) => {
    setBots((prev) => prev.map((b) => (b.id === id ? { ...b, name: name ?? b.name, token: token ?? b.token } : b)));
    setEditingBot(null);
  };

  const removeBot = (id) => {
    if (!confirm(t('admin.telegram.confirmDeleteBot'))) return;
    setBots((prev) => prev.filter((b) => b.id !== id));
    setMessages((prev) => prev.map((m) => (m.botId === id ? { ...m, botId: '' } : m)));
  };

  const addChannel = () => {
    if (!newChannel.name.trim() || !newChannel.chatId.trim()) return;
    setChannels((prev) => [...prev, { id: genId(), name: newChannel.name.trim(), chatId: newChannel.chatId.trim() }]);
    setNewChannel({ name: '', chatId: '' });
  };

  const updateChannel = (id, name, chatId) => {
    setChannels((prev) => prev.map((c) => (c.id === id ? { ...c, name: name ?? c.name, chatId: chatId ?? c.chatId } : c)));
    setEditingChannel(null);
  };

  // Whether this channel/group receives the automatic party-broadcast (cron
  // + "פרסם מסיבות לטלגרם" button). Some group owners only want their own
  // party posted there, not everyone else's — this lets them opt out
  // without deleting the destination entirely (it can still be used for
  // one-off manual sends via "שלח הודעה").
  const toggleChannelBroadcast = (id) => {
    setChannels((prev) => prev.map((c) => (c.id === id ? { ...c, broadcastEnabled: c.broadcastEnabled === false } : c)));
  };

  // Restricts WHICH advertisers' parties may be posted into this channel —
  // separate from the on/off switch above. Empty/absent allowedAdvertiserIds
  // means "everyone" (current default); once restricted, ONLY parties
  // created by one of the checked advertisers go there — a party with no
  // advertiser attached (e.g. added directly by the site admin) is
  // deliberately excluded rather than given a free pass, so a mistake can
  // never leak it into a competitor's group.
  const toggleChannelRestricted = (id) => {
    setChannels((prev) => prev.map((c) => {
      if (c.id !== id) return c;
      const isRestricted = Array.isArray(c.allowedAdvertiserIds);
      return { ...c, allowedAdvertiserIds: isRestricted ? undefined : [] };
    }));
  };

  const toggleChannelAdvertiser = (channelId, advertiserId) => {
    setChannels((prev) => prev.map((c) => {
      if (c.id !== channelId) return c;
      const current = c.allowedAdvertiserIds || [];
      const next = current.includes(advertiserId) ? current.filter((a) => a !== advertiserId) : [...current, advertiserId];
      return { ...c, allowedAdvertiserIds: next };
    }));
  };

  const removeChannel = (id) => {
    if (!confirm(t('admin.telegram.confirmDeleteChannel'))) return;
    setChannels((prev) => prev.filter((c) => c.id !== id));
    setMessages((prev) => prev.map((m) => ({ ...m, channelIds: (m.channelIds || []).filter((cid) => cid !== id) })));
  };

  const addMessage = () => {
    if (!newMessage.name.trim()) return;
    setMessages((prev) => [...prev, { ...newMessage, id: genId(), key: newMessage.key || `custom-${genId()}` }]);
    setNewMessage({ name: '', key: `custom-${genId()}`, template: '', parseMode: 'HTML', enabled: true, botId: '', channelIds: [], siteUrl: '' });
  };

  const updateMessage = (id, patch, close = false) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
    if (close) setEditingMessage(null);
  };

  const removeMessage = (id) => {
    const msg = messages.find((m) => m.id === id);
    if (msg && BUILT_IN_MESSAGE_KEYS.includes(msg.key)) {
      alert(t('admin.telegram.cannotDeleteBuiltIn'));
      return;
    }
    if (!confirm(t('admin.telegram.confirmDeleteMessage'))) return;
    setMessages((prev) => prev.filter((m) => m.id !== id));
  };

  const toggleChannelInMessage = (messageId, channelId) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const ids = m.channelIds || [];
        const next = ids.includes(channelId) ? ids.filter((c) => c !== channelId) : [...ids, channelId];
        return { ...m, channelIds: next };
      })
    );
  };

  const handleSendMessage = async () => {
    if (!sendMsgText.trim()) { alert(t('admin.telegram.noMessageText')); return; }
    if (!sendMsgBotIds.length) { alert(t('admin.telegram.noBotsSelected')); return; }
    if (!sendMsgChannelIds.length) { alert(t('admin.telegram.noChannelsSelected')); return; }
    setSendingMsg(true);
    setSendMsgResult(null);
    let sent = 0;
    let total = 0;
    const selectedBots = bots.filter((b) => sendMsgBotIds.includes(b.id));
    const selectedChannels = channels.filter((c) => sendMsgChannelIds.includes(c.id));
    for (const bot of selectedBots) {
      for (const channel of selectedChannels) {
        total++;
        const ok = await sendTelegramNotification(sendMsgText.trim(), bot.token, channel.chatId, sendMsgParseMode || undefined);
        if (ok) sent++;
      }
    }
    if (sent === total) {
      setSendMsgResult({ type: 'success', text: t('admin.telegram.sendSuccess') });
    } else if (sent > 0) {
      setSendMsgResult({ type: 'partial', text: t('admin.telegram.sendResultSummary').replace('{sent}', sent).replace('{total}', total) });
    } else {
      setSendMsgResult({ type: 'fail', text: t('admin.telegram.sendFail') });
    }
    setSendingMsg(false);
  };

  /** Insert a variable (e.g. '{{party.name}}') into the current template for message m. */
  const insertVariable = (msg, variable) => {
    const text = `${variable}`.trim();
    if (!text) return;
    if (msg.key === MESSAGE_KEYS.REGISTRATION) {
      const current = msg[registrationTemplateTab] ?? msg.template ?? '';
      const newValue = current + (current ? ' ' : '') + text;
      updateMessage(msg.id, { [registrationTemplateTab]: newValue });
    } else if (msg.key === MESSAGE_KEYS.BALANCE_PUBLISH) {
      const tab = balancePublishCaseTab;
      const current = msg[tab] ?? msg.template ?? '';
      const newValue = current + (current ? ' ' : '') + text;
      updateMessage(msg.id, { [tab]: newValue });
    } else {
      const current = msg.template ?? '';
      const newValue = current + (current ? ' ' : '') + text;
      updateMessage(msg.id, { template: newValue });
    }
  };

  const inputCls = 'w-full bg-black/40 border border-zinc-800 p-3 rounded-xl focus:border-red-600 outline-none text-white text-right';
  const labelCls = 'block text-xs uppercase font-bold text-zinc-500 mb-1';

  if (loading) {
    return (
      <div className="bg-zinc-900/50 backdrop-blur-2xl border border-white/5 p-6 rounded-2xl">
        <p className="text-zinc-400">{t('loading')}</p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900/50 backdrop-blur-2xl border border-white/5 p-6 rounded-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{t('admin.telegram.title')}</h2>
        {legacy && (
          <span className="text-xs text-amber-400 bg-amber-900/30 px-2 py-1 rounded">
            {t('admin.telegram.legacyMode')}
          </span>
        )}
      </div>
      <p className="text-zinc-400 text-sm">
        {t('admin.telegram.description')}
      </p>

      <div className="flex flex-wrap gap-2 items-center border-b border-zinc-800 pb-3">
        {['bots', 'channels', 'messages', 'sendMessage'].map((panel) => (
          <button
            key={panel}
            type="button"
            onClick={() => setActivePanel(panel)}
            className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 ${
              activePanel === panel ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            {panel === 'bots' && t('admin.telegram.bots')}
            {panel === 'channels' && t('admin.telegram.channels')}
            {panel === 'messages' && t('admin.telegram.messages')}
            {panel === 'sendMessage' && (
              <>
                <Mail size={16} />
                {t('admin.telegram.sendMessage')}
              </>
            )}
          </button>
        ))}
        {activePanel !== 'sendMessage' && (
          <button
            type="button"
            onClick={() => handleSave({ preventDefault: () => {} })}
            disabled={saving}
            className="mr-auto ml-4 px-5 py-2 rounded-xl text-sm font-bold bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white flex items-center gap-2"
          >
            <Send size={16} />
            {saving ? t('saving') : t('admin.telegram.saveChanges')}
          </button>
        )}
      </div>

      {activePanel === 'bots' && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold">{t('admin.telegram.bots')}</h3>
          <div className="flex gap-2 flex-wrap items-end">
            <div className="min-w-[140px]">
              <label className={labelCls}>{t('admin.telegram.botName')}</label>
              <input
                type="text"
                value={newBot.name}
                onChange={(e) => setNewBot((p) => ({ ...p, name: e.target.value }))}
                className={inputCls}
                placeholder="Main Bot"
              />
            </div>
            <div className="min-w-[200px]">
              <label className={labelCls}>{t('admin.matches.telegramBotToken')}</label>
              <input
                type="password"
                value={newBot.token}
                onChange={(e) => setNewBot((p) => ({ ...p, token: e.target.value }))}
                className={inputCls}
                placeholder="123456:ABC..."
                autoComplete="off"
              />
            </div>
            <button type="button" onClick={addBot} className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2">
              <Plus size={16} /> {t('admin.telegram.addBot')}
            </button>
          </div>
          <ul className="space-y-2">
            {bots.map((b) => (
              <li key={b.id} className="flex items-center gap-3 p-3 bg-zinc-900/60 rounded-xl border border-zinc-800">
                {editingBot === b.id ? (
                  <>
                    <input
                      type="text"
                      defaultValue={b.name}
                      onBlur={(e) => updateBot(b.id, e.target.value, undefined)}
                      className={inputCls + ' flex-1 max-w-[120px]'}
                    />
                    <input
                      type="password"
                      placeholder="Token"
                      onBlur={(e) => updateBot(b.id, undefined, e.target.value || b.token)}
                      className={inputCls + ' flex-1 max-w-[200px]'}
                    />
                    <button type="button" onClick={() => setEditingBot(null)} className="text-zinc-400 hover:text-white">
                      ✓
                    </button>
                  </>
                ) : (
                  <>
                    <span className="font-medium">{b.name}</span>
                    {botInfos[b.token] && (
                      <span className="text-green-400 text-sm">@{botInfos[b.token].username}</span>
                    )}
                    <button type="button" onClick={() => setEditingBot(b.id)} className="text-zinc-400 hover:text-white">
                      <Edit2 size={14} />
                    </button>
                    <button type="button" onClick={() => removeBot(b.id)} className="text-red-400 hover:text-red-300">
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {activePanel === 'channels' && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold">{t('admin.telegram.channels')}</h3>
          <p className="text-zinc-500 text-xs">
            {t('admin.telegram.saveHint')}
          </p>
          <div className="flex gap-2 flex-wrap items-end">
            <div className="min-w-[140px]">
              <label className={labelCls}>{t('admin.telegram.channelName')}</label>
              <input
                type="text"
                value={newChannel.name}
                onChange={(e) => setNewChannel((p) => ({ ...p, name: e.target.value }))}
                className={inputCls}
                placeholder="Alerts"
              />
            </div>
            <div className="min-w-[180px]">
              <label className={labelCls}>{t('admin.matches.telegramChatId')}</label>
              <input
                type="text"
                value={newChannel.chatId}
                onChange={(e) => setNewChannel((p) => ({ ...p, chatId: e.target.value }))}
                className={inputCls}
                placeholder="@channel or -100..."
                dir="ltr"
              />
            </div>
            <button type="button" onClick={addChannel} className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2">
              <Plus size={16} /> {t('admin.telegram.addChannel')}
            </button>
          </div>
          <ul className="space-y-2">
            {channels.map((c) => (
              <li key={c.id} className="p-3 bg-zinc-900/60 rounded-xl border border-zinc-800 space-y-2">
                <div className="flex items-center gap-3">
                {editingChannel === c.id ? (
                  <>
                    <input
                      type="text"
                      defaultValue={c.name}
                      onBlur={(e) => updateChannel(c.id, e.target.value, undefined)}
                      className={inputCls + ' flex-1 max-w-[120px]'}
                    />
                    <input
                      type="text"
                      defaultValue={c.chatId}
                      onBlur={(e) => updateChannel(c.id, undefined, e.target.value || c.chatId)}
                      className={inputCls + ' flex-1 max-w-[180px]'}
                      dir="ltr"
                    />
                    <button type="button" onClick={() => setEditingChannel(null)}>✓</button>
                  </>
                ) : (
                  <>
                    <span className="font-medium">{c.name}</span>
                    <span className="text-zinc-500 text-sm font-mono">{c.chatId}</span>
                    <label className="flex items-center gap-1.5 mr-auto cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={c.broadcastEnabled !== false}
                        onChange={() => toggleChannelBroadcast(c.id)}
                      />
                      <span className={c.broadcastEnabled === false ? 'text-zinc-500' : 'text-green-400'}>
                        {t('admin.telegram.includeInPartyBroadcast') || 'לכלול בפרסום מסיבות אוטומטי'}
                      </span>
                    </label>
                    <button type="button" onClick={() => setEditingChannel(c.id)} className="text-zinc-400 hover:text-white">
                      <Edit2 size={14} />
                    </button>
                    <button type="button" onClick={() => removeChannel(c.id)} className="text-red-400 hover:text-red-300">
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
                </div>

                {editingChannel !== c.id && c.broadcastEnabled !== false && (
                  <div className="pt-2 border-t border-zinc-800">
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs mb-1.5">
                      <input
                        type="checkbox"
                        checked={Array.isArray(c.allowedAdvertiserIds)}
                        onChange={() => toggleChannelRestricted(c.id)}
                      />
                      <span className="text-zinc-400">
                        {t('admin.telegram.restrictToApprovedAdvertisers') || 'רק מפרסמים נבחרים מותרים לפרסם כאן'}
                      </span>
                    </label>
                    {Array.isArray(c.allowedAdvertiserIds) && (
                      <div className="flex flex-wrap gap-2 mr-5">
                        {advertisers.length === 0 && (
                          <span className="text-zinc-600 text-xs">{t('admin.telegram.noApprovedAdvertisers') || 'אין מפרסמים מאושרים'}</span>
                        )}
                        {advertisers.map((a) => (
                          <label key={a.id} className="flex items-center gap-1 cursor-pointer text-xs bg-black/30 border border-zinc-800 rounded-lg px-2 py-1">
                            <input
                              type="checkbox"
                              checked={c.allowedAdvertiserIds.includes(a.id)}
                              onChange={() => toggleChannelAdvertiser(c.id, a.id)}
                            />
                            {a.businessName || a.contactName || a.phoneNumber}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {activePanel === 'messages' && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold">{t('admin.telegram.messages')}</h3>
          <p className="text-zinc-500 text-sm">
            {t('admin.telegram.messagesHint')}
          </p>
          <ul className="space-y-3">
            {messages.map((m) => (
              <li key={m.id} className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/60">
                <div
                  className="flex items-center gap-2 p-3 cursor-pointer"
                  onClick={() => setEditingMessage(editingMessage === m.id ? null : m.id)}
                >
                  {editingMessage === m.id ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  <span className="font-medium">{m.name}</span>
                  <span className="text-zinc-500 text-sm">{m.key}</span>
                  <label className="flex items-center gap-1 mr-auto">
                    <input
                      type="checkbox"
                      checked={!!m.enabled}
                      onChange={(e) => updateMessage(m.id, { enabled: e.target.checked })}
                      onClick={(e) => e.stopPropagation()}
                    />
                    {t('admin.enabled')}
                  </label>
                  {!BUILT_IN_MESSAGE_KEYS.includes(m.key) && (
                    <button type="button" onClick={(e) => { e.stopPropagation(); removeMessage(m.id); }} className="text-red-400 hover:text-red-300">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                {editingMessage === m.id && (
                  <div className="p-4 border-t border-zinc-800 space-y-4">
                    {/* Available variables - at top */}
                    <div className="rounded-xl border border-zinc-700 bg-zinc-950/80 p-4">
                      <div className="text-xs uppercase font-bold text-zinc-400 mb-2">{t('admin.telegram.availableVariables')}</div>
                      <p className="text-zinc-500 text-xs mb-2">{t('admin.telegram.clickToInsert')}</p>
                      {m.key === MESSAGE_KEYS.REGISTRATION && VARIABLES_REFERENCE[MESSAGE_KEYS.REGISTRATION] ? (
                        <div className="space-y-2 text-sm">
                          <div className="text-zinc-500 font-medium w-full">{t('admin.telegram.varsForType')} <span className="text-white">{getRegistrationTypeLabel(t, registrationTemplateTab)}</span></div>
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="text-zinc-500 font-medium w-full mb-1">{t('admin.telegram.varsParty')}</span>
                            {(VARIABLES_REFERENCE[MESSAGE_KEYS.REGISTRATION].party || []).map((v) => (
                              <button
                                key={v}
                                type="button"
                                onClick={() => insertVariable(m, `{{${v}}}`)}
                                className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-xs cursor-pointer border border-zinc-700 hover:border-zinc-600"
                              >
                                {`{{${v}}}`}
                              </button>
                            ))}
                          </div>
                          {VARIABLES_REFERENCE[MESSAGE_KEYS.REGISTRATION].common && (
                            <div className="flex flex-wrap items-center gap-1">
                              <span className="text-zinc-500 font-medium w-full mb-1">{t('admin.telegram.varsCommon')}</span>
                              {VARIABLES_REFERENCE[MESSAGE_KEYS.REGISTRATION].common.map((v) => (
                                <button
                                  key={v}
                                  type="button"
                                  onClick={() => insertVariable(m, `{{${v}}}`)}
                                  className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-xs cursor-pointer border border-zinc-700 hover:border-zinc-600"
                                >
                                  {`{{${v}}}`}
                                </button>
                              ))}
                            </div>
                          )}
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="text-zinc-500 font-medium w-full mb-1">{t('admin.telegram.varsThisType')}</span>
                            {(VARIABLES_REFERENCE[MESSAGE_KEYS.REGISTRATION][REGISTRATION_TAB_TO_VARS_KEY[registrationTemplateTab]] || []).map((v) => (
                              <button
                                key={v}
                                type="button"
                                onClick={() => insertVariable(m, `{{${v}}}`)}
                                className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-xs cursor-pointer border border-zinc-700 hover:border-zinc-600"
                              >
                                {`{{${v}}}`}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : m.key === MESSAGE_KEYS.BALANCE_PUBLISH && VARIABLES_REFERENCE[MESSAGE_KEYS.BALANCE_PUBLISH] && typeof VARIABLES_REFERENCE[MESSAGE_KEYS.BALANCE_PUBLISH] === 'object' ? (
                        <div className="space-y-2 text-sm">
                          <div className="text-zinc-500 font-medium w-full">{t('admin.telegram.varsForCase')} <span className="text-white">{getBalancePublishCaseLabel(t, balancePublishCaseTab)}</span></div>
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="text-zinc-500 font-medium w-full mb-1">{t('admin.telegram.varsParty')}</span>
                            {(VARIABLES_REFERENCE[MESSAGE_KEYS.BALANCE_PUBLISH].party || []).map((v) => (
                              <button
                                key={v}
                                type="button"
                                onClick={() => insertVariable(m, `{{${v}}}`)}
                                className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-xs cursor-pointer border border-zinc-700 hover:border-zinc-600"
                              >
                                {`{{${v}}}`}
                              </button>
                            ))}
                          </div>
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="text-zinc-500 font-medium w-full mb-1">{t('admin.telegram.varsThisCase')}</span>
                            {(VARIABLES_REFERENCE[MESSAGE_KEYS.BALANCE_PUBLISH][BALANCE_PUBLISH_TAB_TO_CASE[balancePublishCaseTab]] || []).map((v) => (
                              <button
                                key={v}
                                type="button"
                                onClick={() => insertVariable(m, `{{${v}}}`)}
                                className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-xs cursor-pointer border border-zinc-700 hover:border-zinc-600"
                              >
                                {`{{${v}}}`}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : Array.isArray(VARIABLES_REFERENCE[m.key]) ? (
                        <div className="flex flex-wrap gap-1">
                          {VARIABLES_REFERENCE[m.key].map((v) => (
                            <button
                              key={v}
                              type="button"
                              onClick={() => insertVariable(m, `{{${v}}}`)}
                              className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-xs cursor-pointer border border-zinc-700 hover:border-zinc-600"
                            >
                              {`{{${v}}}`}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <code className="text-zinc-300 font-mono text-xs">—</code>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>{t('admin.telegram.assignBot')}</label>
                        <select
                          value={m.botId}
                          onChange={(e) => updateMessage(m.id, { botId: e.target.value })}
                          className={inputCls}
                        >
                          <option value="">—</option>
                          {bots.map((b) => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>{t('admin.telegram.siteUrlOptional')}</label>
                        <input
                          type="text"
                          value={m.siteUrl || ''}
                          onChange={(e) => updateMessage(m.id, { siteUrl: e.target.value })}
                          className={inputCls}
                          placeholder="https://..."
                          dir="ltr"
                        />
                      </div>
                    </div>
                    {(
                      <div>
                        <label className={labelCls}>{t('admin.telegram.channelsToSendTo')}</label>
                        <div className="flex flex-wrap gap-2">
                          {channels.map((c) => (
                            <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={(m.channelIds || []).includes(c.id)}
                                onChange={() => toggleChannelInMessage(m.id, c.id)}
                              />
                              {c.name}
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {m.key === MESSAGE_KEYS.REGISTRATION ? (
                      <>
                        <div>
                          <label className={labelCls}>{t('admin.telegram.templatePerRegistrationType')}</label>
                          <div className="flex flex-wrap gap-1 mb-2">
                            {[REGISTRATION_TYPE_KEYS.DEFAULT, REGISTRATION_TYPE_KEYS.SINGLE_MALE_BALANCE, REGISTRATION_TYPE_KEYS.SINGLE_FEMALE_BALANCE, REGISTRATION_TYPE_KEYS.SINGLE_FEMALE_DISCOUNT, REGISTRATION_TYPE_KEYS.COUPLE].map((key) => (
                              <button
                                key={key}
                                type="button"
                                onClick={() => setRegistrationTemplateTab(key)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold ${registrationTemplateTab === key ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
                              >
                                {getRegistrationTypeLabel(t, key)}
                              </button>
                            ))}
                          </div>
                          <textarea
                            value={m[registrationTemplateTab] ?? ''}
                            onChange={(e) => updateMessage(m.id, { [registrationTemplateTab]: e.target.value })}
                            className={inputCls + ' min-h-[120px]'}
                            placeholder={registrationTemplateTab === REGISTRATION_TYPE_KEYS.COUPLE ? COUPLE_TEMPLATE_PLACEHOLDER : `{{party.name}}, {{registration.fullName}}...`}
                            dir="auto"
                          />
                        </div>
                        <div className="border border-zinc-700 rounded-xl p-4 bg-zinc-950/80">
                          <div className="flex items-center gap-2 mb-2 text-zinc-400">
                            <Eye size={16} />
                            <span className="text-sm font-bold uppercase">{t('admin.telegram.preview')}</span>
                            <span className="text-xs">({getRegistrationTypeLabel(t, registrationTemplateTab)})</span>
                          </div>
                          <MessagePreviewBox
                            text={buildMessagePreview(
                              m.key,
                              m.template || '',
                              m.siteUrl || '',
                              'he',
                              REGISTRATION_TYPE_PREVIEW_KEY[registrationTemplateTab],
                              m[registrationTemplateTab] ?? m.template ?? ''
                            )}
                            parseMode={m.parseMode || 'HTML'}
                          />
                          <p className="text-zinc-500 text-xs mt-2">{t('admin.telegram.previewHint')}</p>
                        </div>
                      </>
                    ) : m.key === MESSAGE_KEYS.BALANCE_PUBLISH ? (
                      <>
                        <div>
                          <label className={labelCls}>{t('admin.telegram.templatePerBalanceCase')}</label>
                          <div className="flex flex-wrap gap-1 mb-2">
                            {[BALANCE_PUBLISH_TYPE_KEYS.NO_REGISTRATIONS, BALANCE_PUBLISH_TYPE_KEYS.NEED_WOMEN, BALANCE_PUBLISH_TYPE_KEYS.NEED_MEN, BALANCE_PUBLISH_TYPE_KEYS.REGISTER_FOR_BALANCE].map((key) => (
                              <button
                                key={key}
                                type="button"
                                onClick={() => setBalancePublishCaseTab(key)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold ${balancePublishCaseTab === key ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
                              >
                                {getBalancePublishCaseLabel(t, key)}
                              </button>
                            ))}
                          </div>
                          <textarea
                            value={m[balancePublishCaseTab] ?? m.template ?? ''}
                            onChange={(e) => updateMessage(m.id, { [balancePublishCaseTab]: e.target.value })}
                            className={inputCls + ' min-h-[120px]'}
                            placeholder={`{{party.name}}, {{siteUrl}}${(BALANCE_PUBLISH_TAB_TO_CASE[balancePublishCaseTab] === 'needWomen' || BALANCE_PUBLISH_TAB_TO_CASE[balancePublishCaseTab] === 'needMen') ? ', {{needCount}}' : ''}`}
                            dir="auto"
                          />
                        </div>
                        <div className="border border-zinc-700 rounded-xl p-4 bg-zinc-950/80">
                          <div className="flex items-center gap-2 mb-2 text-zinc-400">
                            <Eye size={16} />
                            <span className="text-sm font-bold uppercase">{t('admin.telegram.preview')}</span>
                            <span className="text-xs">({getBalancePublishCaseLabel(t, balancePublishCaseTab)})</span>
                          </div>
                          <MessagePreviewBox
                            text={buildMessagePreview(
                              m.key,
                              m.template || '',
                              m.siteUrl || '',
                              'he',
                              null,
                              m[balancePublishCaseTab] ?? m.template ?? '',
                              BALANCE_PUBLISH_TAB_TO_CASE[balancePublishCaseTab] ?? 'needWomen'
                            )}
                            parseMode={m.parseMode || 'HTML'}
                          />
                          <p className="text-zinc-500 text-xs mt-2">{t('admin.telegram.previewHint')}</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <label className={labelCls}>{t('admin.telegram.messageTemplate')}</label>
                          <textarea
                            value={m.template || ''}
                            onChange={(e) => updateMessage(m.id, { template: e.target.value })}
                            className={inputCls + ' min-h-[120px]'}
                            placeholder={Array.isArray(VARIABLES_REFERENCE[m.key]) ? VARIABLES_REFERENCE[m.key].map((v) => `{{${v}}}`).join(', ') : '{{party.name}}...'}
                            dir="auto"
                          />
                        </div>
                        <div className="border border-zinc-700 rounded-xl p-4 bg-zinc-950/80">
                          <div className="flex items-center gap-2 mb-2 text-zinc-400">
                            <Eye size={16} />
                            <span className="text-sm font-bold uppercase">{t('admin.telegram.preview')}</span>
                            <span className="text-xs">({t('admin.telegram.previewSample')})</span>
                          </div>
                          <MessagePreviewBox text={buildMessagePreview(m.key, m.template || '', m.siteUrl || '', 'he')} parseMode={m.parseMode || 'HTML'} />
                          <p className="text-zinc-500 text-xs mt-2">{t('admin.telegram.previewHint')}</p>
                        </div>
                      </>
                    )}

                    <div>
                      <label className={labelCls}>{t('admin.telegram.parseMode')}</label>
                      <select
                        value={m.parseMode || 'HTML'}
                        onChange={(e) => updateMessage(m.id, { parseMode: e.target.value })}
                        className={inputCls + ' max-w-[120px]'}
                      >
                        <option value="HTML">HTML</option>
                        <option value="Markdown">Markdown</option>
                        <option value="">None</option>
                      </select>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
          <div className="pt-2 border-t border-zinc-800">
            <h4 className="text-sm font-bold text-zinc-400 mb-2">{t('admin.telegram.addCustomMessage')}</h4>
            <div className="flex flex-wrap gap-2 items-end">
              <div className="min-w-[160px]">
                <label className={labelCls}>{t('admin.telegram.messageName')}</label>
                <input
                  type="text"
                  value={newMessage.name}
                  onChange={(e) => setNewMessage((p) => ({ ...p, name: e.target.value }))}
                  className={inputCls}
                  placeholder="My custom message"
                />
              </div>
              <div className="min-w-[140px]">
                <label className={labelCls}>{t('admin.telegram.assignBot')}</label>
                <select
                  value={newMessage.botId}
                  onChange={(e) => setNewMessage((p) => ({ ...p, botId: e.target.value }))}
                  className={inputCls}
                >
                  <option value="">—</option>
                  {bots.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <button type="button" onClick={addMessage} className="bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2">
                <Plus size={16} /> {t('admin.telegram.addMessage')}
              </button>
            </div>
          </div>
        </div>
      )}

      {activePanel === 'sendMessage' && (
        <div className="space-y-5">
          <h3 className="text-lg font-bold">{t('admin.telegram.sendMessage')}</h3>
          <p className="text-zinc-500 text-sm">{t('admin.telegram.sendMessageHint')}</p>

          <div>
            <label className={labelCls}>{t('admin.telegram.messageText')}</label>
            <textarea
              value={sendMsgText}
              onChange={(e) => setSendMsgText(e.target.value)}
              className={inputCls + ' min-h-[140px]'}
              placeholder={t('admin.telegram.messageTextPlaceholder')}
              dir="auto"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>{t('admin.telegram.selectBots')}</label>
              <div className="space-y-2 p-3 bg-zinc-900/60 rounded-xl border border-zinc-800">
                {bots.length === 0 && <span className="text-zinc-500 text-sm">—</span>}
                {bots.map((b) => (
                  <label key={b.id} className="flex items-center gap-3 cursor-pointer hover:bg-zinc-800/40 p-2 rounded-lg transition-colors">
                    <input
                      type="checkbox"
                      checked={sendMsgBotIds.includes(b.id)}
                      onChange={() =>
                        setSendMsgBotIds((prev) =>
                          prev.includes(b.id) ? prev.filter((id) => id !== b.id) : [...prev, b.id]
                        )
                      }
                      className="accent-red-600"
                    />
                    <span className="font-medium">{b.name}</span>
                    {botInfos[b.token] && (
                      <span className="text-green-400 text-xs">@{botInfos[b.token].username}</span>
                    )}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className={labelCls}>{t('admin.telegram.selectChannels')}</label>
              <div className="space-y-2 p-3 bg-zinc-900/60 rounded-xl border border-zinc-800">
                {channels.length === 0 && <span className="text-zinc-500 text-sm">—</span>}
                {channels.map((c) => (
                  <label key={c.id} className="flex items-center gap-3 cursor-pointer hover:bg-zinc-800/40 p-2 rounded-lg transition-colors">
                    <input
                      type="checkbox"
                      checked={sendMsgChannelIds.includes(c.id)}
                      onChange={() =>
                        setSendMsgChannelIds((prev) =>
                          prev.includes(c.id) ? prev.filter((id) => id !== c.id) : [...prev, c.id]
                        )
                      }
                      className="accent-red-600"
                    />
                    <span className="font-medium">{c.name}</span>
                    <span className="text-zinc-500 text-sm font-mono">{c.chatId}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="max-w-[160px]">
            <label className={labelCls}>{t('admin.telegram.parseMode')}</label>
            <select
              value={sendMsgParseMode}
              onChange={(e) => setSendMsgParseMode(e.target.value)}
              className={inputCls}
            >
              <option value="HTML">HTML</option>
              <option value="Markdown">Markdown</option>
              <option value="">None</option>
            </select>
          </div>

          {sendMsgText.trim() && (
            <div className="border border-zinc-700 rounded-xl p-4 bg-zinc-950/80">
              <div className="flex items-center gap-2 mb-2 text-zinc-400">
                <Eye size={16} />
                <span className="text-sm font-bold uppercase">{t('admin.telegram.preview')}</span>
              </div>
              <MessagePreviewBox text={sendMsgText} parseMode={sendMsgParseMode || 'HTML'} />
            </div>
          )}

          {sendMsgResult && (
            <div
              className={`p-3 rounded-xl text-sm font-medium ${
                sendMsgResult.type === 'success'
                  ? 'bg-green-900/40 text-green-300 border border-green-700'
                  : sendMsgResult.type === 'partial'
                    ? 'bg-amber-900/40 text-amber-300 border border-amber-700'
                    : 'bg-red-900/40 text-red-300 border border-red-700'
              }`}
            >
              {sendMsgResult.text}
            </div>
          )}

          <button
            type="button"
            onClick={handleSendMessage}
            disabled={sendingMsg}
            className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2"
          >
            <Send size={16} />
            {sendingMsg ? t('admin.telegram.sending') : t('admin.telegram.sendNow')}
          </button>
        </div>
      )}

      {activePanel !== 'sendMessage' && (
        <form onSubmit={handleSave} className="pt-4 border-t border-zinc-800">
          <button type="submit" disabled={saving} className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2">
            <Send size={16} /> {saving ? t('saving') : t('save')}
          </button>
        </form>
      )}
    </div>
  );
};

export default TelegramSection;
