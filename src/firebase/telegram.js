import { getTranslation } from '../i18n/translations';
import { relayTelegramApi } from '../utils/telegramRelay';
import { getTelegramSettings } from './settings';

/** Canonical public site URL used as the fallback link in channel broadcasts. */
const SITE_URL = 'https://www.libralparty.net';

/**
 * Escapes the 3 characters Telegram's `parse_mode: 'HTML'` treats specially
 * (it has no attribute syntax to worry about, unlike browser HTML). Without
 * this, a party title/description, a registrant's name, or a free-text
 * pickup address containing `<`/`>`/`&` either breaks Telegram's entity
 * parser (the whole message silently fails to send — `can't parse entities`)
 * or, worse, gets interpreted as real markup (e.g. an `<a href="...">` turns
 * into a genuine clickable link inside the bot's own message). Only ever
 * wrap actual user/advertiser-supplied values with this — never the
 * surrounding `<b>...</b>` labels, which are static and author-trusted.
 */
const tgEscape = (value) => {
  if (value === null || value === undefined) return '';
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
};

/** Built-in message keys */
export const MESSAGE_KEYS = {
  REGISTRATION: 'registration',
  BALANCE_PUBLISH: 'balancePublish',
  MATCH_NOTIFICATION: 'matchNotification',
  NEW_PARTY: 'newParty',
  NEW_EXTERNAL_PARTY: 'newExternalParty',
  SUBSCRIPTION_REQUEST: 'subscriptionRequest'
};

/** Registration type keys for per-type templates */
export const REGISTRATION_TYPE_KEYS = {
  DEFAULT: 'template',
  SINGLE_MALE_BALANCE: 'templateSingleMaleBalance',
  SINGLE_FEMALE_BALANCE: 'templateSingleFemaleBalance',
  SINGLE_FEMALE_DISCOUNT: 'templateSingleFemaleDiscount',
  COUPLE: 'templateCouple'
};

/** Balance publish case keys (same structure as registration types) */
export const BALANCE_PUBLISH_TYPE_KEYS = {
  DEFAULT: 'template',
  NO_REGISTRATIONS: 'templateNoRegistrations',
  NEED_WOMEN: 'templateNeedWomen',
  NEED_MEN: 'templateNeedMen',
  REGISTER_FOR_BALANCE: 'templateRegisterForBalance'
};

/**
 * Derive gender from registration when gender is missing or inconsistent (e.g. old data).
 * Returns 'male' | 'female' | 'couple' (couple = 1m+1w) or null.
 * Use this for display counts and grouping so summary and list stay in sync.
 */
export const genderFromRegistration = (r) => {
  const g = (r.gender || '').toString().toLowerCase();
  if (g === 'male' || g === 'female') return g;
  const rt = r.registrationType;
  if (rt === 'single-male-balance') return 'male';
  if (rt === 'single-female-balance' || rt === 'single-female-discount') return 'female';
  if (rt === 'couple') return 'couple';
  return null;
};

/** Count total men and women from party.registrations, deriving gender from registrationType when needed. */
const countMalesFemales = (registrations) => {
  let totalMen = 0;
  let totalWomen = 0;
  for (const r of registrations || []) {
    const g = genderFromRegistration(r);
    if (g === 'male') totalMen++;
    else if (g === 'female') totalWomen++;
    else if (g === 'couple') { totalMen++; totalWomen++; }
  }
  return { totalMen, totalWomen };
};

/** Compute balance publish case from party + balance */
export const getBalancePublishCase = (party, partyBalance = []) => {
  const { totalMen, totalWomen } = countMalesFemales(party.registrations);
  if (totalMen === 0 && totalWomen === 0) return 'noRegistrations';
  const matchedMenCount = (partyBalance || []).filter(m => m.isMatched && m.malePhone).length;
  const matchedWomenCount = (partyBalance || []).filter(m => m.isMatched && m.femalePhone).length;
  const unmatchedMen = Math.max(0, totalMen - matchedMenCount);
  const unmatchedWomen = Math.max(0, totalWomen - matchedWomenCount);
  if (unmatchedMen > unmatchedWomen) return 'needWomen';
  if (unmatchedWomen > unmatchedMen) return 'needMen';
  return 'registerForBalance';
};

const BALANCE_PUBLISH_CASE_TO_TEMPLATE_KEY = {
  noRegistrations: BALANCE_PUBLISH_TYPE_KEYS.NO_REGISTRATIONS,
  needWomen: BALANCE_PUBLISH_TYPE_KEYS.NEED_WOMEN,
  needMen: BALANCE_PUBLISH_TYPE_KEYS.NEED_MEN,
  registerForBalance: BALANCE_PUBLISH_TYPE_KEYS.REGISTER_FOR_BALANCE
};

const REGISTRATION_TYPE_TO_TEMPLATE_KEY = {
  'single-male-balance': REGISTRATION_TYPE_KEYS.SINGLE_MALE_BALANCE,
  'single-female-balance': REGISTRATION_TYPE_KEYS.SINGLE_FEMALE_BALANCE,
  'single-female-discount': REGISTRATION_TYPE_KEYS.SINGLE_FEMALE_DISCOUNT,
  couple: REGISTRATION_TYPE_KEYS.COUPLE,
  // register-event.html registers each half of a couple as its own record
  // (registrationType "single-male-couple"/"single-female-couple") so the
  // database and per-person notification path can stay on the plain single
  // path — see that file's comment. Without these two entries here, that
  // registrationType matched nothing above and silently fell back to the
  // generic single template, so the admin's couple template never fired.
  'single-male-couple': REGISTRATION_TYPE_KEYS.COUPLE,
  'single-female-couple': REGISTRATION_TYPE_KEYS.COUPLE
};

/**
 * Full list of variables for each message type (for admin UI). Use {{variable}} in templates.
 */
export const VARIABLES_REFERENCE = {
  [MESSAGE_KEYS.REGISTRATION]: {
    common: ['registration.registrationType', 'registration.gender'],
    party: ['party.name', 'party.date', 'party.time', 'party.maleLimit', 'party.femaleLimit'],
    singleMale: ['registration.fullName', 'registration.userName', 'registration.phoneNumber', 'registration.telegramUsername', 'registration.registrationType', 'registration.gender', 'registration.partyDays'],
    singleFemale: ['registration.fullName', 'registration.userName', 'registration.phoneNumber', 'registration.telegramUsername', 'registration.registrationType', 'registration.gender', 'registration.partyDays', 'registration.pickupAddress'],
    singleFemaleDiscount: ['registration.fullName', 'registration.userName', 'registration.phoneNumber', 'registration.telegramUsername', 'registration.registrationType', 'registration.gender', 'registration.partyDays', 'registration.pickupAddress'],
    couple: ['registration.fullName', 'registration.phoneNumber', 'registration.telegramUsername', 'registration.womanFullName', 'registration.womanPhoneNumber', 'registration.womanTelegramUsername', 'registration.registrationType', 'registration.gender', 'registration.partyDays']
  },
  [MESSAGE_KEYS.BALANCE_PUBLISH]: {
    party: ['party.name', 'party.title', 'party.day', 'party.time', 'siteUrl'],
    noRegistrations: ['party.name', 'party.time', 'siteUrl'],
    needWomen: ['party.name', 'party.time', 'siteUrl', 'needCount'],
    needMen: ['party.name', 'party.time', 'siteUrl', 'needCount'],
    registerForBalance: ['party.name', 'party.time', 'siteUrl']
  },
  [MESSAGE_KEYS.MATCH_NOTIFICATION]: ['party.name', 'party.date', 'party.time', 'matchedPerson.fullName', 'matchedPerson.userName', 'matchedPerson.phoneNumber', 'matchedPerson.telegramUsername', 'matchedPerson.registrationType'],
  [MESSAGE_KEYS.NEW_PARTY]: ['party.name', 'party.title', 'party.date', 'party.time', 'party.day', 'party.dj', 'party.maleLimit', 'party.femaleLimit', 'party.description', 'party.imageURL', 'siteUrl', 'registerUrl'],
  [MESSAGE_KEYS.NEW_EXTERNAL_PARTY]: ['party.name', 'party.title', 'party.date', 'party.time', 'party.day', 'party.dj', 'party.description', 'party.imageURL', 'siteUrl', 'partyUrl'],
  [MESSAGE_KEYS.SUBSCRIPTION_REQUEST]: ['request.fullName', 'request.phoneNumber', 'request.note']
};

/**
 * Get config for a message type: bot token, channel chat IDs, template, parseMode, enabled.
 * Supports legacy settings (single botToken/chatId) when new format is not yet saved.
 */
export const getTelegramConfigForMessage = async (messageKey) => {
  const config = await getTelegramSettings();
  if (config.legacy) {
    const L = config.legacy;
    if (messageKey === MESSAGE_KEYS.BALANCE_PUBLISH) {
      return L.botToken && L.chatId
        ? { botToken: L.botToken, chatIds: [L.chatId], template: null, parseMode: 'HTML', enabled: L.enabled !== false, siteUrl: L.siteUrl || '' }
        : null;
    }
    if (messageKey === MESSAGE_KEYS.MATCH_NOTIFICATION) {
      return L.botToken
        ? { botToken: L.botToken, chatIds: [], template: null, parseMode: 'HTML', enabled: L.enabled !== false }
        : null;
    }
    return null;
  }
  const message = (config.messages || []).find((m) => m.key === messageKey);
  if (!message || !message.enabled) return null;
  const bot = (config.bots || []).find((b) => b.id === message.botId);
  if (!bot || !bot.token) return null;
  const chatIds = (message.channelIds || [])
    .map((cid) => (config.channels || []).find((c) => c.id === cid))
    .filter(Boolean)
    .map((c) => c.chatId);
  const base = {
    botToken: bot.token,
    chatIds: messageKey === MESSAGE_KEYS.MATCH_NOTIFICATION ? [] : chatIds,
    template: message.template || null,
    parseMode: message.parseMode || 'HTML',
    enabled: true,
    siteUrl: message.siteUrl !== undefined ? message.siteUrl : ''
  };
  if (messageKey === MESSAGE_KEYS.REGISTRATION) {
    base.templateSingleMaleBalance = message.templateSingleMaleBalance ?? null;
    base.templateSingleFemaleBalance = message.templateSingleFemaleBalance ?? null;
    base.templateSingleFemaleDiscount = message.templateSingleFemaleDiscount ?? null;
    base.templateCouple = message.templateCouple ?? null;
  }
  if (messageKey === MESSAGE_KEYS.BALANCE_PUBLISH) {
    base.templateNoRegistrations = message.templateNoRegistrations ?? null;
    base.templateNeedWomen = message.templateNeedWomen ?? null;
    base.templateNeedMen = message.templateNeedMen ?? null;
    base.templateRegisterForBalance = message.templateRegisterForBalance ?? null;
  }
  return base;
};

/**
 * Replace {{key}} placeholders in template. Payload can be nested: registration.fullName, party.name.
 */
export const replacePlaceholders = (template, payload) => {
  if (!template || typeof template !== 'string') return template || '';
  return template.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
    const keys = path.trim().split('.');
    let value = payload;
    for (const k of keys) {
      value = value != null && typeof value === 'object' ? value[k] : undefined;
    }
    return value != null ? tgEscape(value) : '';
  });
};

/** Derives the Hebrew weekday from a raw date — used as a fallback when a party doc has no `day` field. */
const hebrewDayFromDate = (date) => {
  if (date == null) return '';
  const d = date instanceof Date ? date : (date?.toDate ? date.toDate() : new Date(date));
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('he-IL', { weekday: 'long' });
};

/** Format date as day month year only (no time), e.g. "5 בפברואר 2026" or "5 February 2026". */
const formatDateOnly = (date, language = 'he') => {
  if (date == null) return '';
  const d = date instanceof Date ? date : (date?.toDate ? date.toDate() : new Date(date));
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/** Format partyDays array to Hebrew day names, e.g. ['friday'] -> "שישי", ['thursday','friday'] -> "חמישי, שישי". */
const formatPartyDaysHebrew = (partyDays, language = 'he') => {
  if (!partyDays) return '';
  const arr = Array.isArray(partyDays) ? partyDays : [partyDays];
  if (arr.length === 0) return '';
  const t = (key) => getTranslation(key, language);
  const dayMap = {
    thursday: t('telegram.day.thursday'),
    friday: t('telegram.day.friday'),
    saturday: t('telegram.day.saturday'),
    both: t('telegram.day.both')
  };
  return arr.map(day => dayMap[day] || day).join(', ');
};

/**
 * Derive party days array from a party object (for use when registration doesn't have partyDays).
 * Uses party.date weekday (0=Sun, 4=Thu, 5=Fri, 6=Sat) or party.day Hebrew string.
 */
export const getPartyDaysFromParty = (party) => {
  if (!party) return [];
  if (party.partyDays && Array.isArray(party.partyDays) && party.partyDays.length > 0) return party.partyDays;
  const dayStr = (party.day || '').toString();
  const dayStrLower = dayStr.toLowerCase();
  if ((dayStr.includes('חמישי') && dayStr.includes('שישי')) || dayStrLower.includes('both')) return ['both'];
  if (dayStr.includes('חמישי') || dayStrLower.includes('thursday')) return ['thursday'];
  if (dayStr.includes('שישי') || dayStrLower.includes('friday')) return ['friday'];
  if (dayStr.includes('שבת') || dayStrLower.includes('saturday')) return ['saturday'];
  const d = party.date instanceof Date ? party.date : (party.date?.toDate ? party.date.toDate() : new Date(party.date));
  if (!d || isNaN(d.getTime())) return [];
  const w = d.getDay();
  if (w === 4) return ['thursday'];
  if (w === 5) return ['friday'];
  if (w === 6) return ['saturday'];
  return [];
};

/** Sample data for message preview in admin, by registration type */
const SAMPLE_REGISTRATION_BY_TYPE = {
  'single-male-balance': () => ({
    party: { name: 'מסיבת דוגמה', date: new Date(), time: '22:00', maleLimit: 10, femaleLimit: 10, registrations: [{ gender: 'male' }, { gender: 'female' }] },
    registration: { fullName: 'ישראל ישראלי', userName: 'ישראל ישראלי', phoneNumber: '050-1234567', telegramUsername: 'israel', registrationType: 'single-male-balance', gender: 'male', partyDays: ['friday'] }
  }),
  'single-female-balance': () => ({
    party: { name: 'מסיבת דוגמה', date: new Date(), time: '22:00', maleLimit: 10, femaleLimit: 10, registrations: [{ gender: 'male' }, { gender: 'female' }] },
    registration: { fullName: 'מיכל כהן', userName: 'מיכל כהן', phoneNumber: '052-9876543', telegramUsername: 'michal', registrationType: 'single-female-balance', gender: 'female', partyDays: ['friday'], pickupAddress: 'תל אביב' }
  }),
  'single-female-discount': () => ({
    party: { name: 'מסיבת דוגמה', date: new Date(), time: '22:00', maleLimit: 10, femaleLimit: 10, registrations: [] },
    registration: { fullName: 'נועה לוי', userName: 'נועה לוי', phoneNumber: '054-1112233', telegramUsername: 'noa', registrationType: 'single-female-discount', gender: 'female', partyDays: ['thursday'], pickupAddress: '' }
  }),
  couple: () => ({
    party: { name: 'מסיבת דוגמה', date: new Date(), time: '22:00', maleLimit: 10, femaleLimit: 10, registrations: [] },
    registration: { fullName: 'דוד כהן', userName: 'דוד כהן', phoneNumber: '050-1111111', telegramUsername: 'david', womanFullName: 'שרה כהן', womanPhoneNumber: '052-2222222', womanTelegramUsername: 'sara', registrationType: 'couple', gender: 'male', partyDays: ['both'] }
  })
};

const SAMPLE_PAYLOADS = {
  [MESSAGE_KEYS.REGISTRATION]: (registrationType = 'single-male-balance') => {
    const fn = SAMPLE_REGISTRATION_BY_TYPE[registrationType] || SAMPLE_REGISTRATION_BY_TYPE['single-male-balance'];
    return fn();
  },
  [MESSAGE_KEYS.BALANCE_PUBLISH]: (balancePublishCase = 'needWomen') => {
    const party = { name: 'מסיבת דוגמה', title: 'מסיבת דוגמה', time: '22:00', registrations: [{ gender: 'male' }, { gender: 'male' }, { gender: 'female' }] };
    const siteUrl = 'https://example.com';
    if (balancePublishCase === 'noRegistrations') {
      return { party: { ...party, registrations: [] }, partyBalance: [], siteUrl, needCount: 0 };
    }
    if (balancePublishCase === 'needWomen') {
      const partyBalance = [{ isMatched: true, malePhone: '050-111', femalePhone: '050-222' }, { isMatched: false }];
      return { party, partyBalance, siteUrl, needCount: 2 };
    }
    if (balancePublishCase === 'needMen') {
      const partyBalance = [{ isMatched: true, malePhone: '050-111', femalePhone: '050-222' }];
      const partyNeedMen = { ...party, registrations: [{ gender: 'female' }, { gender: 'female' }, { gender: 'male' }] };
      return { party: partyNeedMen, partyBalance, siteUrl, needCount: 2 };
    }
    const partyBalance = [{ isMatched: true, malePhone: '050-111', femalePhone: '050-222' }];
    return { party, partyBalance, siteUrl };
  },
  [MESSAGE_KEYS.MATCH_NOTIFICATION]: () => {
    const party = { name: 'מסיבת דוגמה', date: new Date(), time: '22:00' };
    const matchedPerson = { fullName: 'מיכל כהן', userName: 'מיכל כהן', phoneNumber: '052-9876543', telegramUsername: 'michal', registrationType: 'single-female-balance' };
    return { party, matchedPerson };
  },
  [MESSAGE_KEYS.NEW_PARTY]: () => ({
    party: { name: 'מסיבת דוגמה', title: 'מסיבת דוגמה', date: new Date(), time: '22:00', day: 'שישי', dj: 'DJ דוגמה', maleLimit: 10, femaleLimit: 10, description: 'ערב פתיחה' }
  }),
  [MESSAGE_KEYS.NEW_EXTERNAL_PARTY]: () => ({
    party: { name: 'אירוע חיצוני לדוגמה', title: 'אירוע חיצוני לדוגמה', date: new Date(), time: '22:00', day: 'שישי', dj: 'DJ דוגמה', description: 'אירוע מיוחד' },
    partyUrl: 'https://example.com/register'
  }),
  [MESSAGE_KEYS.SUBSCRIPTION_REQUEST]: () => ({
    request: { fullName: 'דנה כהן', phoneNumber: '052-1234567', note: '' }
  })
};

/** Default format when no template for new party notification */
const formatNewPartyNotification = (party, language = 'he', siteUrl = SITE_URL) => {
  const t = (key) => getTranslation(key, language);
  const dateStr = formatDateOnly(party?.date, language);
  const name = tgEscape(party?.name || party?.title || t('telegram.party'));
  const linkLine = siteUrl ? `\n\n<b>${t('telegram.registerUrl') || 'הרשמה'}:</b> ${tgEscape(siteUrl)}` : '';
  return `🆕 <b>${t('telegram.newParty') || 'מסיבה חדשה'}</b>\n\n<b>${t('telegram.party')}:</b> ${name}${party?.day ? `\n<b>יום:</b> ${tgEscape(party.day)}` : ''}\n<b>${t('telegram.date')}:</b> ${dateStr}${party?.time ? `\n<b>${t('telegram.time')}:</b> ${tgEscape(party.time)}` : ''}${party?.dj ? `\n<b>${t('telegram.dj')}:</b> ${tgEscape(party.dj)}` : ''}${party?.maleLimit != null ? `\n<b>${t('telegram.maleLimit')}:</b> ${party.maleLimit}` : ''}${party?.femaleLimit != null ? `\n<b>${t('telegram.femaleLimit')}:</b> ${party.femaleLimit}` : ''}${party?.description ? `\n${tgEscape(party.description)}` : ''}${linkLine}`;
};

/** Default format when no template for new external party notification */
const formatNewExternalPartyNotification = (party, partyUrl, language = 'he') => {
  const t = (key) => getTranslation(key, language);
  const dateStr = formatDateOnly(party?.date, language);
  const name = tgEscape(party?.name || party?.title || t('telegram.party'));
  let msg = `🌐 <b>${t('telegram.newExternalParty') || 'אירוע חיצוני חדש'}</b>\n\n<b>${t('telegram.party')}:</b> ${name}`;
  if (party?.day) msg += `\n<b>יום:</b> ${tgEscape(party.day)}`;
  msg += `\n<b>${t('telegram.date')}:</b> ${dateStr}`;
  if (party?.time) msg += `\n<b>${t('telegram.time')}:</b> ${tgEscape(party.time)}`;
  if (party?.dj) msg += `\n<b>${t('telegram.dj')}:</b> ${tgEscape(party.dj)}`;
  if (party?.description) msg += `\n${tgEscape(party.description)}`;
  if (partyUrl) msg += `\n\n<b>${t('telegram.partyUrl') || 'קישור לאירוע'}:</b> ${tgEscape(partyUrl)}`;
  return msg;
};

/** Default format when no template for subscription request notification */
const formatSubscriptionRequestNotification = (request, language = 'he') => {
  const t = (key) => getTranslation(key, language);
  const name = tgEscape(request?.fullName || '');
  const phone = tgEscape(request?.phoneNumber || '');
  let msg = `⚖️ <b>${t('telegram.subscriptionRequest') || 'בקשת מנוי חדשה'}</b>\n\n<b>${t('telegram.name')}:</b> ${name}\n<b>${t('telegram.phone')}:</b> ${phone}`;
  if (request?.note) msg += `\n\n${tgEscape(request.note)}`;
  return msg;
};

/**
 * Build preview text for a message type (for admin UI). Uses sample data when template is empty.
 * For registration, pass registrationType and optional templateOverride.
 * For balance publish, pass balancePublishCase ('noRegistrations'|'needWomen'|'needMen'|'registerForBalance') and optional templateOverride.
 */
export const buildMessagePreview = (messageKey, template, siteUrl = '', language = 'he', registrationType = null, templateOverride = null, balancePublishCase = null) => {
  const tpl = templateOverride ?? template;
  if (messageKey === MESSAGE_KEYS.REGISTRATION) {
    const regType = registrationType || 'single-male-balance';
    const sample = SAMPLE_PAYLOADS[MESSAGE_KEYS.REGISTRATION](regType);
    if (tpl && String(tpl).trim()) {
      const partyForTemplate = { ...sample.party, date: formatDateOnly(sample.party?.date, language) };
      const registrationForTemplate = { ...sample.registration, partyDays: formatPartyDaysHebrew(sample.registration?.partyDays, language) };
      return replacePlaceholders(tpl, { ...sample, party: partyForTemplate, registration: registrationForTemplate, siteUrl: siteUrl || 'https://example.com' });
    }
    return formatRegistrationNotification(sample.registration, sample.party, language);
  }
  if (messageKey === MESSAGE_KEYS.BALANCE_PUBLISH) {
    const caseKey = balancePublishCase || 'needWomen';
    const sampleData = SAMPLE_PAYLOADS[MESSAGE_KEYS.BALANCE_PUBLISH](caseKey);
    if (tpl && String(tpl).trim()) {
      const partyForTemplate = { ...sampleData.party, date: formatDateOnly(sampleData.party?.date, language) };
      return replacePlaceholders(tpl, { ...sampleData, party: partyForTemplate, siteUrl: siteUrl || sampleData.siteUrl || 'https://example.com' });
    }
    return formatBalancePublishMessage(sampleData.party, sampleData.partyBalance, siteUrl || sampleData.siteUrl || 'https://example.com', language);
  }
  if (messageKey === MESSAGE_KEYS.NEW_PARTY) {
    const sampleData = SAMPLE_PAYLOADS[MESSAGE_KEYS.NEW_PARTY]();
    if (tpl && String(tpl).trim()) {
      const partyForTemplate = { ...sampleData.party, date: formatDateOnly(sampleData.party?.date, language) };
      const previewSiteUrl = siteUrl || 'https://example.com';
      return replacePlaceholders(tpl, { party: partyForTemplate, siteUrl: previewSiteUrl, registerUrl: previewSiteUrl });
    }
    return formatNewPartyNotification(sampleData.party, language, siteUrl || SITE_URL);
  }
  if (messageKey === MESSAGE_KEYS.NEW_EXTERNAL_PARTY) {
    const sampleData = SAMPLE_PAYLOADS[MESSAGE_KEYS.NEW_EXTERNAL_PARTY]();
    const partyForTemplate = { ...sampleData.party, date: formatDateOnly(sampleData.party?.date, language) };
    const partyUrl = sampleData.partyUrl;
    if (tpl && String(tpl).trim()) {
      return replacePlaceholders(tpl, { party: partyForTemplate, siteUrl: siteUrl || 'https://example.com', partyUrl });
    }
    return formatNewExternalPartyNotification(sampleData.party, partyUrl, language);
  }
  const sampleData = SAMPLE_PAYLOADS[messageKey]?.();
  if (!sampleData || typeof sampleData !== 'object') {
    return tpl ? replacePlaceholders(tpl, { party: {}, registration: {}, matchedPerson: {}, siteUrl }) : '(No template)';
  }
  if (tpl && String(tpl).trim()) {
    return replacePlaceholders(tpl, { ...sampleData, siteUrl: siteUrl || 'https://example.com' });
  }
  if (messageKey === MESSAGE_KEYS.MATCH_NOTIFICATION) {
    return formatBalanceMatchNotification(sampleData.matchedPerson, sampleData.party, language);
  }
  if (messageKey === MESSAGE_KEYS.SUBSCRIPTION_REQUEST) {
    return formatSubscriptionRequestNotification(sampleData.request, language);
  }
  return '(No template)';
};

export const getBotInfo = async (botToken) => {
  try {
    if (!botToken) {
      return null;
    }
    const { data } = await relayTelegramApi('getMe', botToken, {});
    if (data.ok) {
      return data.result;
    }
    return null;
  } catch (error) {
    return null;
  }
};

export const sendTelegramNotification = async (message, botToken, chatId, parseMode = 'HTML') => {
  try {
    if (!botToken || !chatId) {
      return false;
    }
    const parsedChatId = /^-?\d+$/.test(String(chatId).trim()) ? Number(String(chatId).trim()) : String(chatId).trim();
    const body = { chat_id: parsedChatId, text: message };
    if (parseMode) body.parse_mode = parseMode;
    const { data } = await relayTelegramApi('sendMessage', botToken, body);
    return !!data.ok;
  } catch (error) {
    return false;
  }
};

/** Telegram caption max length (characters). */
const TELEGRAM_CAPTION_MAX_LENGTH = 1024;

/** Send a photo to a Telegram chat with optional caption (HTML). photoUrl must be a public HTTPS URL. */
export const sendTelegramPhoto = async (botToken, chatId, photoUrl, caption = '', parseMode = 'HTML') => {
  try {
    if (!botToken || !chatId || !photoUrl) return false;
    const parsedChatId = /^-?\d+$/.test(String(chatId).trim()) ? Number(String(chatId).trim()) : String(chatId).trim();
    const body = { chat_id: parsedChatId, photo: photoUrl };
    if (caption) {
      body.caption = caption.length > TELEGRAM_CAPTION_MAX_LENGTH ? caption.slice(0, TELEGRAM_CAPTION_MAX_LENGTH) : caption;
    }
    if (parseMode) body.parse_mode = parseMode;
    const { data } = await relayTelegramApi('sendPhoto', botToken, body);
    return !!data.ok;
  } catch (error) {
    return false;
  }
};

/**
 * Build balance publish message for one party: how many men/women needed, equal, or no registrations.
 * Uses translations. Appends siteUrl to the message.
 */
export const formatBalancePublishMessage = (party, partyBalance, siteUrl = '', language = 'he') => {
  const t = (key) => getTranslation(key, language);
  const { totalMen, totalWomen } = countMalesFemales(party.registrations);
  const balance = partyBalance || [];
  const matchedMenCount = balance.filter(m => m.isMatched && m.malePhone).length;
  const matchedWomenCount = balance.filter(m => m.isMatched && m.femalePhone).length;
  const unmatchedMen = Math.max(0, totalMen - matchedMenCount);
  const unmatchedWomen = Math.max(0, totalWomen - matchedWomenCount);

  const partyName = tgEscape(party.name || party.title || party.day || t('telegram.balancePublish.partyDefault'));
  let body;
  if (totalMen === 0 && totalWomen === 0) {
    body = `${partyName}: ${t('telegram.balancePublish.noRegistrations')}`;
  } else if (unmatchedMen > unmatchedWomen) {
    const needWomen = unmatchedMen - unmatchedWomen;
    body = `${partyName}: ${t('telegram.balancePublish.needWomen').replace('{count}', needWomen)}`;
  } else if (unmatchedWomen > unmatchedMen) {
    const needMen = unmatchedWomen - unmatchedMen;
    body = `${partyName}: ${t('telegram.balancePublish.needMen').replace('{count}', needMen)}`;
  } else {
    body = `${partyName}: ${t('telegram.balancePublish.registerForBalance')}`;
  }
  const urlLine = siteUrl ? `\n${siteUrl}` : '';
  return body + urlLine;
};

export const formatRegistrationNotification = (registration, party, language = 'he') => {
  const t = (key) => getTranslation(key, language);
  
  const registrationTypeMap = {
    'single-female-balance': t('telegram.registrationType.singleFemaleBalance'),
    'single-male-balance': t('telegram.registrationType.singleMaleBalance'),
    'single-female-discount': t('telegram.registrationType.singleFemaleDiscount'),
    'couple': t('telegram.registrationType.couple')
  };

  const partyDaysMap = {
    'thursday': t('telegram.day.thursday'),
    'friday': t('telegram.day.friday'),
    'both': t('telegram.day.both')
  };

  const partyDaysText = registration.partyDays
    ? registration.partyDays.map(day => partyDaysMap[day] || day).join(', ')
    : '';

  const date = party.date instanceof Date 
    ? party.date 
    : (party.date?.toDate ? party.date.toDate() : new Date(party.date));
  
  const formattedDate = date.toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const isCouple = registration.registrationType === 'couple' || registration.registrationType === 'single-male-couple' || registration.registrationType === 'single-female-couple' || (registration.partnerName && registration.partnerPhone);

  // Escape every free-text field once up front — party name, the
  // registrant's own name/phone/telegram handle, a partner's name/phone,
  // and the optional pickup address are all advertiser/user-supplied and
  // must not reach the HTML-parse-mode Telegram message unescaped.
  const partyNameEsc = tgEscape(party.name);
  const fullNameEsc = tgEscape(registration.fullName || registration.userName);
  const phoneEsc = tgEscape(registration.phoneNumber);
  const telegramUsernameEsc = tgEscape(registration.telegramUsername);
  const partnerNameEsc = tgEscape(registration.partnerName || '');
  const partnerPhoneEsc = tgEscape(registration.partnerPhone || '');
  const pickupAddressEsc = tgEscape(registration.pickupAddress);

  const message = language === 'he'
    ? isCouple
      ? `🎉 <b>${t('telegram.newRegistration')}</b>

<b>${t('telegram.party')}:</b> ${partyNameEsc}
<b>${t('telegram.date')}:</b> ${formattedDate}
<b>${t('telegram.registrationType')}:</b> ${t('telegram.couple')}
${partyDaysText ? `<b>${t('telegram.partyDays')}:</b> ${partyDaysText}` : ''}

<b>${t('telegram.maleInCouple')}:</b>
<b>${t('telegram.name')}:</b> ${registration.gender === 'male' ? fullNameEsc : partnerNameEsc}
<b>${t('telegram.phone')}:</b> ${registration.gender === 'male' ? phoneEsc : partnerPhoneEsc}
${registration.gender === 'male' && registration.telegramUsername ? `<b>${t('telegram.telegram')}:</b> @${telegramUsernameEsc}` : ''}

<b>${t('telegram.femaleInCouple')}:</b>
<b>${t('telegram.name')}:</b> ${registration.gender === 'female' ? fullNameEsc : partnerNameEsc}
<b>${t('telegram.phone')}:</b> ${registration.gender === 'female' ? phoneEsc : partnerPhoneEsc}
${registration.gender === 'female' && registration.telegramUsername ? `<b>${t('telegram.telegram')}:</b> @${telegramUsernameEsc}` : ''}

<b>${t('telegram.totalRegistered')}:</b> ${party.registrations?.length || 0}
<b>${t('telegram.males')}:</b> ${party.registrations?.filter(r => r.gender === 'male').length || 0}/${party.maleLimit}
<b>${t('telegram.females')}:</b> ${party.registrations?.filter(r => r.gender === 'female').length || 0}/${party.femaleLimit}`
      : `🎉 <b>${t('telegram.newRegistration')}</b>

<b>${t('telegram.party')}:</b> ${partyNameEsc}
<b>${t('telegram.date')}:</b> ${formattedDate}
<b>${t('telegram.name')}:</b> ${fullNameEsc}
<b>${t('telegram.phone')}:</b> ${phoneEsc}
${registration.telegramUsername ? `<b>${t('telegram.telegram')}:</b> @${telegramUsernameEsc}` : ''}
<b>${t('telegram.registrationType')}:</b> ${registrationTypeMap[registration.registrationType] || registration.registrationType}
${partyDaysText ? `<b>${t('telegram.partyDays')}:</b> ${partyDaysText}` : ''}
<b>${t('telegram.gender')}:</b> ${registration.gender === 'male' ? t('telegram.male') : registration.gender === 'female' ? t('telegram.female') : t('telegram.couple')}
${registration.pickupAddress ? `<b>${t('telegram.pickupAddress') || 'כתובת לאיסוף'}:</b> ${pickupAddressEsc}` : ''}

<b>${t('telegram.totalRegistered')}:</b> ${party.registrations?.length || 0}
<b>${t('telegram.males')}:</b> ${party.registrations?.filter(r => r.gender === 'male').length || 0}/${party.maleLimit}
<b>${t('telegram.females')}:</b> ${party.registrations?.filter(r => r.gender === 'female').length || 0}/${party.femaleLimit}`
    : `🎉 <b>${t('telegram.newRegistration')}</b>

<b>${t('telegram.party')}:</b> ${partyNameEsc}
<b>${t('telegram.date')}:</b> ${formattedDate}
<b>${t('telegram.name')}:</b> ${fullNameEsc}
<b>${t('telegram.phone')}:</b> ${phoneEsc}
${registration.telegramUsername ? `<b>${t('telegram.telegram')}:</b> @${telegramUsernameEsc}` : ''}
<b>${t('telegram.registrationType')}:</b> ${registrationTypeMap[registration.registrationType] || registration.registrationType}
${partyDaysText ? `<b>${t('telegram.partyDays')}:</b> ${partyDaysText}` : ''}
<b>${t('telegram.gender')}:</b> ${registration.gender === 'male' ? t('telegram.male') : registration.gender === 'female' ? t('telegram.female') : t('telegram.couple')}
${registration.pickupAddress ? `<b>${t('telegram.pickupAddress') || 'כתובת לאיסוף'}:</b> ${pickupAddressEsc}` : ''}

<b>${t('telegram.totalRegistered')}:</b> ${party.registrations?.length || 0}
<b>${t('telegram.males')}:</b> ${party.registrations?.filter(r => r.gender === 'male').length || 0}/${party.maleLimit}
<b>${t('telegram.females')}:</b> ${party.registrations?.filter(r => r.gender === 'female').length || 0}/${party.femaleLimit}`;

  return message;
};

export const formatBalanceMatchNotification = (matchedPerson, party, language = 'he') => {
  const date = party.date instanceof Date 
    ? party.date 
    : (party.date?.toDate ? party.date.toDate() : new Date(party.date));
  
  const formattedDate = date.toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const t = (key) => getTranslation(key, language);
  
  const registrationTypeMap = {
    'single-female-balance': t('telegram.registrationType.singleFemaleBalance'),
    'single-male-balance': t('telegram.registrationType.singleMaleBalance'),
    'single-female-discount': t('telegram.registrationType.singleFemaleDiscount'),
    'couple': t('telegram.registrationType.couple')
  };
  
  const partyNameEsc = tgEscape(party.name);
  const matchedNameEsc = tgEscape(matchedPerson.fullName || matchedPerson.userName);
  const matchedPhoneEsc = tgEscape(matchedPerson.phoneNumber);
  const matchedTelegramEsc = tgEscape(matchedPerson.telegramUsername);

  const message = language === 'he'
    ? `🎉 <b>${t('telegram.matchFound')}</b>

<b>${t('telegram.party')}:</b> ${partyNameEsc}
<b>${t('telegram.date')}:</b> ${formattedDate}

<b>${t('telegram.matchedPersonDetails')}:</b>
<b>${t('telegram.name')}:</b> ${matchedNameEsc}
<b>${t('telegram.phone')}:</b> ${matchedPhoneEsc}
${matchedPerson.telegramUsername ? `<b>${t('telegram.telegram')}:</b> @${matchedTelegramEsc}` : ''}
<b>${t('telegram.registrationType')}:</b> ${registrationTypeMap[matchedPerson.registrationType] || matchedPerson.registrationType || t('telegram.notSpecified')}

🎊 ${t('telegram.congratulations')}`
    : `🎉 <b>${t('telegram.matchFound')}</b>

<b>${t('telegram.party')}:</b> ${partyNameEsc}
<b>${t('telegram.date')}:</b> ${formattedDate}

<b>${t('telegram.matchedPersonDetails')}:</b>
<b>${t('telegram.name')}:</b> ${matchedNameEsc}
<b>${t('telegram.phone')}:</b> ${matchedPhoneEsc}
${matchedPerson.telegramUsername ? `<b>${t('telegram.telegram')}:</b> @${matchedTelegramEsc}` : ''}
<b>${t('telegram.registrationType')}:</b> ${registrationTypeMap[matchedPerson.registrationType] || matchedPerson.registrationType || t('telegram.notSpecified')}

🎊 ${t('telegram.congratulations')}`;

  return message;
};

/**
 * Send registration notification using unified config (message key 'registration').
 * Falls back to provided botToken/chatId if config has no registration message (backward compat).
 */
export const sendRegistrationTelegram = async (registration, party, botToken, chatId, language = 'he') => {
  try {
    const config = await getTelegramConfigForMessage(MESSAGE_KEYS.REGISTRATION);
    const token = config?.botToken || botToken;
    const chatIds = config?.chatIds?.length ? config.chatIds : (chatId ? [chatId] : []);
    if (!token || !chatIds.length) return false;
    const regType = registration.registrationType || (registration.partnerName && registration.partnerPhone ? 'couple' : 'single-male-balance');
    const templateKey = REGISTRATION_TYPE_TO_TEMPLATE_KEY[regType];
    const template = (templateKey && config?.[templateKey]?.trim()) ? config[templateKey] : config?.template;
    // `weekday: 'long'` in the he-IL locale already returns "יום שישי" (with
    // the "יום" prefix baked in) — same format PartyEditor.jsx stores in
    // party.day, so this must NOT prepend its own "יום " on top of it.
    const weekday = party?.day || hebrewDayFromDate(party?.date);
    const partyForTemplate = {
      ...party,
      date: weekday && language === 'he' ? `${weekday}, ${formatDateOnly(party?.date, language)}` : formatDateOnly(party?.date, language),
      day: weekday
    };
    const ensureAt = (v) => (v && String(v).trim() ? (String(v).trim().startsWith('@') ? String(v).trim() : '@' + String(v).trim()) : v);
    // register-event.html registers each half of a couple as its own single-type
    // record, linked only by partnerName/partnerPhone (see that file's comment) —
    // neither record carries the womanFullName/womanPhoneNumber fields the couple
    // template expects, so build them here from whichever half is "self" vs "partner".
    const isFemaleHalf = regType === 'single-female-couple';
    const coupleFields = (regType === 'single-male-couple' || isFemaleHalf) && registration.partnerName && registration.partnerPhone
      ? {
          fullName: isFemaleHalf ? registration.partnerName : (registration.fullName || registration.userName),
          phoneNumber: isFemaleHalf ? registration.partnerPhone : registration.phoneNumber,
          womanFullName: isFemaleHalf ? (registration.fullName || registration.userName) : registration.partnerName,
          womanPhoneNumber: isFemaleHalf ? registration.phoneNumber : registration.partnerPhone,
          womanTelegramUsername: isFemaleHalf ? registration.telegramUsername : registration.womanTelegramUsername,
          telegramUsername: isFemaleHalf ? registration.womanTelegramUsername : registration.telegramUsername
        }
      : {};
    const registrationForTemplate = {
      ...registration,
      ...coupleFields,
      partyDays: formatPartyDaysHebrew(registration?.partyDays, language),
      telegramUsername: coupleFields.telegramUsername != null ? ensureAt(coupleFields.telegramUsername) : registration.telegramUsername != null ? ensureAt(registration.telegramUsername) : registration.telegramUsername,
      womanTelegramUsername: coupleFields.womanTelegramUsername != null ? ensureAt(coupleFields.womanTelegramUsername) : registration.womanTelegramUsername != null ? ensureAt(registration.womanTelegramUsername) : registration.womanTelegramUsername
    };
    const text = template?.trim()
      ? replacePlaceholders(template, { registration: registrationForTemplate, party: partyForTemplate })
      : formatRegistrationNotification(registration, party, language);
    const parseMode = config?.parseMode || 'HTML';
    let ok = true;
    for (const cid of chatIds) {
      const sent = await sendTelegramNotification(text, token, cid, parseMode);
      if (!sent) ok = false;
    }
    return ok;
  } catch {
    if (botToken && chatId) {
      const message = formatRegistrationNotification(registration, party, language);
      return await sendTelegramNotification(message, botToken, chatId);
    }
    return false;
  }
};

/**
 * Send balance publish messages to all channels configured for message key 'balancePublish'.
 */
export const sendBalancePublishToChannels = async (partiesWithBalance, siteUrl = '') => {
  const config = await getTelegramConfigForMessage(MESSAGE_KEYS.BALANCE_PUBLISH);
  if (!config?.enabled || !config.botToken || !config.chatIds?.length) return { sent: 0, failed: 0 };
  const chatIds = [...new Set(config.chatIds)];
  const url = siteUrl || config.siteUrl || SITE_URL;
  let sent = 0;
  let failed = 0;
  const language = 'he';
  for (const { party, partyBalance } of partiesWithBalance) {
    const caseKey = getBalancePublishCase(party, partyBalance);
    const templateKey = BALANCE_PUBLISH_CASE_TO_TEMPLATE_KEY[caseKey];
    const template = (templateKey && config?.[templateKey]?.trim()) ? config[templateKey] : config?.template;
    const { totalMen, totalWomen } = countMalesFemales(party.registrations);
    const partyForTemplate = { ...party, date: formatDateOnly(party?.date, language) };
    let payload = { party: partyForTemplate, partyBalance, siteUrl: url };
    if (caseKey === 'needWomen') {
      const matchedMenCount = (partyBalance || []).filter(m => m.isMatched && m.malePhone).length;
      const matchedWomenCount = (partyBalance || []).filter(m => m.isMatched && m.femalePhone).length;
      payload.needCount = Math.max(0, totalMen - matchedMenCount - (totalWomen - matchedWomenCount));
    } else if (caseKey === 'needMen') {
      const matchedWomenCount = (partyBalance || []).filter(m => m.isMatched && m.femalePhone).length;
      const matchedMenCount = (partyBalance || []).filter(m => m.isMatched && m.malePhone).length;
      payload.needCount = Math.max(0, totalWomen - matchedWomenCount - (totalMen - matchedMenCount));
    }
    const text = template?.trim()
      ? replacePlaceholders(template, payload)
      : formatBalancePublishMessage(party, partyBalance, url, language);
    for (const chatId of chatIds) {
      const ok = await sendTelegramNotification(text, config.botToken, chatId, config.parseMode);
      if (ok) sent++; else failed++;
    }
  }
  return { sent, failed };
};

export const sendBalanceMatchNotification = async (telegramUsername, matchedPerson, party, botToken, language = 'he') => {
  try {
    let token = botToken;
    let parseMode = 'HTML';
    let template = null;
    const config = await getTelegramConfigForMessage(MESSAGE_KEYS.MATCH_NOTIFICATION);
    if (config?.enabled && config.botToken) {
      token = config.botToken;
      parseMode = config.parseMode || 'HTML';
      template = config.template;
    }
    if (!telegramUsername || !token) return { success: false, message: 'No bot or username', error: 'config' };

    let cleanUsername = telegramUsername.replace(/^@+/, '');
    if (!cleanUsername) return { success: false, message: 'Invalid username', error: 'username' };

    const text = template
      ? replacePlaceholders(template, { matchedPerson, party })
      : formatBalanceMatchNotification(matchedPerson, party, language);

    const { data } = await relayTelegramApi('sendMessage', token, {
      chat_id: `@${cleanUsername}`,
      text,
      ...(parseMode && { parse_mode: parseMode })
    });

    if (data.ok) {
      return { success: true, message: `Sent to @${cleanUsername}` };
    }
    const errMsg = data.description || 'Unknown error';
    if (errMsg.includes('chat not found') || errMsg.includes('Chat not found')) {
      return {
        success: false,
        message: `User @${cleanUsername} hasn't started the bot. They need to start a conversation with the bot first.`,
        error: 'chat_not_found'
      };
    }
    return { success: false, message: `Failed to send to @${cleanUsername}: ${errMsg}`, error: errMsg };
  } catch (error) {
    return { success: false, message: `Error: ${error.message}`, error: error.message };
  }
};

/**
 * Send new party notification to configured channels. Call after createParty.
 * If party has imageURL (public HTTPS), sends the image via sendPhoto with caption; otherwise sends text only.
 * Caption is built without party.imageURL so the link never appears in the message; if sendPhoto fails, falls back to text-only.
 */
export const sendNewPartyTelegram = async (party, language = 'he') => {
  try {
    const config = await getTelegramConfigForMessage(MESSAGE_KEYS.NEW_PARTY);
    if (!config?.enabled || !config.botToken || !config.chatIds?.length) return false;
    const siteUrl = config.siteUrl || SITE_URL;
    const partyForTemplate = { ...party, date: formatDateOnly(party?.date, language) };
    const imageUrl = party?.imageURL && String(party.imageURL).trim().startsWith('http') ? String(party.imageURL).trim() : null;
    // Build caption without imageURL so the link never appears (template may contain {{party.imageURL}}).
    const partyForCaption = imageUrl ? { ...partyForTemplate, imageURL: '' } : partyForTemplate;
    let text = config.template?.trim()
      ? replacePlaceholders(config.template, { party: partyForCaption, siteUrl, registerUrl: siteUrl })
      : formatNewPartyNotification(party, language, siteUrl);
    text = (text || '').replace(/\n{3,}/g, '\n\n').trim();
    const parseMode = config.parseMode || 'HTML';
    let ok = true;
    for (const cid of config.chatIds) {
      if (imageUrl) {
        const sent = await sendTelegramPhoto(config.botToken, cid, imageUrl, text, parseMode);
        if (!sent) {
          // Fallback: send text only so notification still arrives (caption has no link).
          const fallback = await sendTelegramNotification(text, config.botToken, cid, parseMode);
          if (!fallback) ok = false;
        }
      } else {
        const sent = await sendTelegramNotification(text, config.botToken, cid, parseMode);
        if (!sent) ok = false;
      }
    }
    return ok;
  } catch {
    return false;
  }
};

/**
 * Send new external party notification to configured channels. Call after publish for external parties.
 * party: the external party object (partyType === 'external').
 * partyUrl: the registration/info URL for the external party (registrationLink field).
 * If party has imageURL (public HTTPS), sends the image via sendPhoto with caption; otherwise text only.
 */
/** Matches the admin's "אני מאשר את המסיבות שלי" checkbox in TelegramSection.jsx —
 *  not a real advertiser doc, just an explicit opt-in for admin-added (no advertiser) parties. */
const ADMIN_PSEUDO_ADVERTISER_ID = '__admin__';

/**
 * Same allow/deny rule the automatic broadcast (api/telegram-webhook.js:
 * partyAllowedFor) uses, kept in sync here so a manual publish can never
 * reach a channel the party wouldn't otherwise be allowed into.
 */
function isPartyAllowedForChannel(party, allowedAdvertiserIds) {
  if (!allowedAdvertiserIds) return true;
  if (party.createdBy) return allowedAdvertiserIds.includes(party.createdBy);
  return allowedAdvertiserIds.includes(ADMIN_PSEUDO_ADVERTISER_ID);
}

/**
 * Lets an advertiser publish their own party to Telegram immediately, instead
 * of waiting for the scheduled broadcast (Sun/Wed/Fri). Sends only to
 * channels the party is actually allowed into — reuses the exact same
 * channels/allowedAdvertiserIds config and rule as the automatic broadcast,
 * so a manual publish can never leak into another advertiser's restricted
 * channel. Skips destinations that opted out (broadcastEnabled === false).
 */
export const sendManualPartyAnnouncement = async (party, language = 'he') => {
  const config = await getTelegramSettings();
  if (!config?.enabled) throw new Error('הפרסום לטלגרם מושבת כרגע במערכת');

  const bot = (config.bots || []).find((b) => b.id === 'legacy') || (config.bots || [])[0];
  const botToken = bot?.token || config.botToken;
  if (!botToken) throw new Error('לא הוגדר בוט טלגרם במערכת');

  const destinations = (config.channels || [])
    .filter((c) => c.broadcastEnabled !== false)
    .filter((c) => isPartyAllowedForChannel(party, Array.isArray(c.allowedAdvertiserIds) ? c.allowedAdvertiserIds : null));

  if (destinations.length === 0) {
    throw new Error('אין ערוץ שהמסיבה הזו מורשית להתפרסם בו');
  }

  const isExternal = party?.partyType === 'external';
  const partyForTemplate = { ...party, date: formatDateOnly(party?.date, language) };
  const imageUrl = party?.imageURL && String(party.imageURL).trim().startsWith('http') ? String(party.imageURL).trim() : null;
  const partyForCaption = imageUrl ? { ...partyForTemplate, imageURL: '' } : partyForTemplate;
  const text = isExternal
    ? formatNewExternalPartyNotification(partyForCaption, party?.registrationLink || '', language)
    : formatNewPartyNotification(partyForCaption, language);

  let sentCount = 0;
  const failures = [];
  for (const dest of destinations) {
    let ok = false;
    if (imageUrl) {
      ok = await sendTelegramPhoto(botToken, dest.chatId, imageUrl, text, 'HTML');
      if (!ok) ok = await sendTelegramNotification(text, botToken, dest.chatId, 'HTML');
    } else {
      ok = await sendTelegramNotification(text, botToken, dest.chatId, 'HTML');
    }
    if (ok) sentCount++;
    else failures.push(dest.name || dest.chatId);
  }

  return { sentCount, totalDestinations: destinations.length, failures };
};

export const sendNewExternalPartyTelegram = async (party, language = 'he') => {
  try {
    const config = await getTelegramConfigForMessage(MESSAGE_KEYS.NEW_EXTERNAL_PARTY);
    if (!config?.enabled || !config.botToken || !config.chatIds?.length) return false;
    const siteUrl = config.siteUrl || SITE_URL;
    const partyUrl = party?.registrationLink || '';
    const partyForTemplate = { ...party, date: formatDateOnly(party?.date, language) };
    const imageUrl = party?.imageURL && String(party.imageURL).trim().startsWith('http') ? String(party.imageURL).trim() : null;
    const partyForCaption = imageUrl ? { ...partyForTemplate, imageURL: '' } : partyForTemplate;
    let text = config.template?.trim()
      ? replacePlaceholders(config.template, { party: partyForCaption, siteUrl, partyUrl })
      : formatNewExternalPartyNotification(party, partyUrl, language);
    text = (text || '').replace(/\n{3,}/g, '\n\n').trim();
    const parseMode = config.parseMode || 'HTML';
    let ok = true;
    for (const cid of config.chatIds) {
      if (imageUrl) {
        const sent = await sendTelegramPhoto(config.botToken, cid, imageUrl, text, parseMode);
        if (!sent) {
          const fallback = await sendTelegramNotification(text, config.botToken, cid, parseMode);
          if (!fallback) ok = false;
        }
      } else {
        const sent = await sendTelegramNotification(text, config.botToken, cid, parseMode);
        if (!sent) ok = false;
      }
    }
    return ok;
  } catch {
    return false;
  }
};


/**
 * Send a "new subscription request" notification — someone asked to become
 * a subscriber (name + phone, no account created). Admin then manually
 * creates the subscription via "ניהול מנויים" once contacted.
 */
export const sendSubscriptionRequestTelegram = async (request, language = 'he') => {
  try {
    const config = await getTelegramConfigForMessage(MESSAGE_KEYS.SUBSCRIPTION_REQUEST);
    if (!config?.enabled || !config.botToken || !config.chatIds?.length) return false;
    const text = config.template?.trim()
      ? replacePlaceholders(config.template, { request })
      : formatSubscriptionRequestNotification(request, language);
    const parseMode = config.parseMode || 'HTML';
    let ok = true;
    for (const cid of config.chatIds) {
      const sent = await sendTelegramNotification(text, config.botToken, cid, parseMode);
      if (!sent) ok = false;
    }
    return ok;
  } catch {
    return false;
  }
};
