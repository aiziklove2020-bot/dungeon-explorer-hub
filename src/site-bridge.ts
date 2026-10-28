// Bridge between the static LIBRAL_PARTY design (public/*.html + assets/app.js)
// and the real Firebase backend. Built as a standalone browser bundle
// (see vite.bridge.config.ts / `npm run build:bridge`) and loaded by the
// static pages as <script type="module" src="assets/site-data.js">.
//
// Exposes window.LPData — real data only. The site has no member accounts:
// parties are shown here and registration is by WhatsApp.
import { collection, doc, getDoc, query, where, getDocs, getDocsFromServer } from "firebase/firestore";
import { normalizePartyBanners } from "../shared/partyBanners.js";
import { db } from "./firebase/config";
import { getSocialLinks, getRssFeeds, getContent } from "./firebase/settings";
import {
  getSessionId,
  sendSupportMessage,
  sendSupportBotMessage,
  sendSupportToTelegram,
  subscribeToSupportMessages,
  fetchSupportMessages,
} from "./firebase/supportChat";
import { savePushSubscription } from "./firebase/pushSubscriptions";

// A bare "YYYY-MM-DD" is a local calendar date: parse it as local midnight
// (new Date("2026-10-30") would be UTC and can land on the previous day).
function lpToLocalDate(d: any): Date {
  if (d instanceof Date) return d;
  if (d?.toDate) return d.toDate();
  if (typeof d === "string") {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  }
  return new Date(d);
}

/** "יום שישי" from any Firestore/JS date shape; "" when unparseable. */
function hebrewDayFromDate(d: any): string {
  const dt = lpToLocalDate(d);
  if (!dt || Number.isNaN(dt.getTime())) return "";
  return dt.toLocaleDateString("he-IL", { weekday: "long" });
}

function formatDateLabel(d: any): string {
  const dt = lpToLocalDate(d);
  if (!dt || Number.isNaN(dt.getTime())) return "";
  return `${String(dt.getDate()).padStart(2, "0")}.${String(dt.getMonth() + 1).padStart(2, "0")}.${dt.getFullYear()}`;
}

// Machine-sortable/filterable form (YYYY-MM-DD) alongside the display label —
// the events page date filter compares against this, not the DD.MM.YYYY text.
function formatDateISO(d: any): string {
  const dt = lpToLocalDate(d);
  if (!dt || Number.isNaN(dt.getTime())) return "";
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

// Real parties have no admin-managed "category" field yet — derive one from
// the title/description text the organizer already wrote, so the filter
// reflects real content instead of a fake fixed value. Order matters: more
// specific keywords are checked first.
const CATEGORY_KEYWORDS: { category: string; words: string[] }[] = [
  { category: "בדסמ", words: ["בדסמ", "בדס\"מ", "בדס״מ", "פמדום", "דאנג'ון", "דאנגאון", "פטיש", "fetish", "bdsm", "שליטה"] },
  { category: "חילופי זוגות", words: ["חילופי זוגות", "סווינגר", "swinger", "חילופי-זוגות", "no limit", "בוטיק", "פנתאון", "ליברל", "liberal", "זוגות"] },
  { category: "מאנץ'", words: ["מאנץ", "munch"] },
  { category: "פסטיבל", words: ["פסטיבל", "festival"] },
];

function detectCategory(title: string, desc: string): string {
  const text = `${title} ${desc}`.toLowerCase();
  for (const { category, words } of CATEGORY_KEYWORDS) {
    if (words.some((w) => text.includes(w.toLowerCase()))) return category;
  }
  return "";
}

// Real parties have no admin-managed "city" field yet either — derive one
// from the title the organizer already wrote, based on which venue/brand
// name maps to which real city.
const CITY_KEYWORDS: { city: string; words: string[] }[] = [
  { city: "פתח תקווה", words: ["אבי"] },
  { city: "תל אביב", words: ["דאנג'ון", "דאנגאון", "דאנג'ן", "סווינגרס", "סדום"] },
  { city: "נתניה", words: ["no limit", "נו לימיט"] },
];

function detectCity(title: string): string {
  const text = title.toLowerCase();
  for (const { city, words } of CITY_KEYWORDS) {
    if (words.some((w) => text.includes(w.toLowerCase()))) return city;
  }
  return "";
}

function toEventShape(p: any) {
  const title = p.title || "";
  const desc = p.description || "";
  return {
    id: p.id,
    title,
    // Fall back to deriving the Hebrew weekday from the date: parties created
    // outside the admin's PartyEditor (which auto-fills `day` on date change)
    // can land in Firestore with an empty `day`, and the card then rendered a
    // bare date with no weekday next to parties that had one.
    day: p.day || hebrewDayFromDate(p.date),
    date: formatDateLabel(p.date),
    dateISO: formatDateISO(p.date),
    time: p.time || "",
    dj: p.dj || "",
    category: p.category || detectCategory(title, desc),
    city: p.city || detectCity(title),
    badge: p.badge || "",
    // Real parties have no city field yet — badge falls back to a
    // generic label instead of showing something misleading.
    type: p.partyType === "external" ? "אירוע חיצוני" : "מסיבה",
    img: p.imageURL || "",
    desc,
    registrationLink: p.registrationLink || "",
    whatsappNumber: p.whatsappNumber || "",
    partyType: p.partyType || "internal",
  };
}

function partyDateMs(p: any): number {
  const d = p?.date instanceof Date ? p.date : p?.date?.toDate ? p.date.toDate() : new Date(p?.date);
  const t = d?.getTime?.();
  return Number.isFinite(t) ? t : Infinity;
}

/**
 * Always reads the party list straight from the server.
 *
 * getActiveParties() goes through two caches — an in-memory app cache and
 * Firestore's IndexedDB persistence (see persistentLocalCache in
 * firebase/config.js). IndexedDB survives a normal refresh, so visitors kept
 * seeing a stale list and only clearing browser history fixed it.
 * getDocsFromServer bypasses both, which is the right trade-off for a small
 * public list that must always be current. Falls back to the cached path if
 * the network read fails, so an offline visitor still sees something.
 */
async function loadEvents() {
  let parties: any[] | null = null;
  const activeParties = query(collection(db, "parties"), where("status", "==", "active"));
  const toParty = (d: any) => {
    const data: any = d.data();
    return { id: d.id, ...data, date: data.date?.toDate?.() || new Date(data.date) };
  };
  try {
    parties = (await getDocsFromServer(activeParties)).docs.map(toParty);
  } catch {
    parties = await getDocs(activeParties).then((snap) => snap.docs.map(toParty)).catch(() => []);
  }
  // status stays "active" in Firestore after a party's date has passed —
  // nothing flips it automatically — so expired parties kept showing on the
  // site indefinitely. Drop anything whose explicit `expiration` timestamp
  // (or, lacking one, its party date) is in the past.
  const now = Date.now();
  const notExpired = (parties || []).filter((p: any) => {
    const exp = p.expiration?.toDate?.() || (p.expiration ? new Date(p.expiration) : null);
    if (exp) return exp.getTime() >= now;
    return partyDateMs(p) >= now - 24 * 60 * 60 * 1000;
  });
  // Filtering above only hides expired parties from THIS response — the docs
  // stay in Firestore until something actually deletes them. Fire the cleanup
  // endpoint in the background (not awaited, errors ignored) so real visits
  // drive near-real-time permanent deletion instead of relying solely on the
  // infrequent cron backstop.
  if (parties && parties.length !== notExpired.length) {
    fetch("/api/telegram-webhook?job=cleanup-parties").catch(() => {});
  }
  const sorted = notExpired.sort((a, b) => partyDateMs(a) - partyDateMs(b));
  return sorted.map(toEventShape);
}

/** The banners shown between the parties (admin panel "באנרים באתר"), enabled ones only. */
async function loadPartyBanners() {
  let stored: any;
  try {
    stored = (await getDoc(doc(db, "settings", "siteConfig"))).data()?.partyBanners;
  } catch {
    stored = undefined;
  }
  return normalizePartyBanners(stored).filter((b: any) => b.enabled);
}

/** Real about-page content, managed from the admin panel's "אודות" section. */
async function loadAbout() {
  const content = await getContent().catch(() => ({}));
  return (content as any)?.about || {};
}

/** Real contact-page content, managed from the admin panel's "צור קשר" section. */
async function loadContact() {
  const content = await getContent().catch(() => ({}));
  return (content as any)?.contact || {};
}

/** Real support chat — same Firestore-backed widget as the old site, relayed to Telegram. */
function supportChat() {
  return {
    sessionId: getSessionId(),
    send: (text: string, displayName?: string | null) => sendSupportMessage(text, getSessionId()!),
    notifyTelegram: (text: string, displayName?: string | null) =>
      sendSupportToTelegram(getSessionId()!, text, displayName || null).catch(() => null),
    subscribe: (cb: (messages: any[]) => void) => subscribeToSupportMessages(getSessionId()!, cb),
    fetchOnce: () => fetchSupportMessages(getSessionId()!),
  };
}

async function loadSocialLinks() {
  const links = await getSocialLinks().catch(() => ({}));
  const out: { type: string; label: string; url: string }[] = [];
  const map: Record<string, string> = {
    instagram: "אינסטגרם",
    facebook: "פייסבוק",
    telegramChannel: "ערוץ טלגרם",
    telegramGroup: "קבוצת טלגרם",
    whatsapp: "וואטסאפ",
  };
  Object.entries(map).forEach(([key, label]) => {
    const url = (links as any)?.[key];
    if (url) out.push({ type: key, label, url });
  });
  return out;
}

async function registerPushSubscription(phoneNumber: string, subscription: any) {
  return savePushSubscription(phoneNumber, subscription);
}

async function loadNewsFeed() {
  const feeds = await getRssFeeds().catch(() => []);
  return (feeds || [])
    .filter((f: any) => f?.enabled !== false && f?.text)
    .map((f: any) => f.text);
}

(window as any).LPData = {
  loadEvents,
  loadPartyBanners,
  loadSocialLinks,
  loadNewsFeed,
  loadAbout,
  loadContact,
  supportChat,
  registerPushSubscription,
};

/**
 * Free, zero-dependency FAQ auto-responder for the support chat — no paid
 * API, no external service, just keyword matching against real answers
 * already published on the site (faq.html, the homepage's balance-cutoff
 * rule). Every match still relays to Telegram too (a human always sees the
 * full conversation and can jump in), this only adds an instant reply while
 * they're offline. Returns null (no auto-reply, human-only) when nothing
 * matches well enough — never guesses.
 */
const SUPPORT_FAQ_KB: { keywords: string[]; answer: string }[] = [
  {
    keywords: ["נרשם", "נרשמים", "נרשמת", "להירשם", "הרשמה", "להצטרף", "הצטרפות", "מנוי"],
    answer: "ההרשמה למסיבות בוואטסאפ בלבד: לוחצים על 'הרשמה בוואטסאפ' ליד המסיבה ושולחים הודעה. אבי חוזר אליכם עם כל הפרטים.",
  },
  {
    keywords: ["תשלום", "לשלם", "אשראי", "סליקה", "עולה", "מחיר"],
    answer: "התשלום מתואם ישירות מול אבי. באתר עצמו אין סליקה או חיוב בכרטיס אשראי.",
  },
  {
    keywords: ["Liberal Suite", "סוויטה", "להשכיר מקום", "חדר פרטי", "פליירום"],
    answer: "Liberal Suite היא סוויטה פרטית להשכרה למפגשים ומסיבות, לזוג אחד ועד 10 זוגות — כוללת Playroom, מתחם אבזור וחדר רחצה מרהיב. כל הפרטים וההזמנה בעמוד 'Liberal Suite' באתר.",
  },
  {
    keywords: ["לוח אירועים", "מתי המסיבה הבאה", "אילו מסיבות יש", "מה יש בקרוב"],
    answer: "את כל המסיבות הקרובות אפשר לראות בעמוד 'לוח האירועים' או ברשימת 'כל המסיבות' באתר.",
  },
  {
    keywords: ["קוד אתי", "כללי התנהגות", "בטיחות באירוע", "כללי הקהילה"],
    answer: "כללי ההתנהגות והבטיחות של הקהילה מפורטים בעמוד 'הקהילה שלנו'. הכלל המרכזי: כל מפגש מתחיל בכבוד הדדי, ולכל אחד ואחת הזכות לבחור ולהציב גבולות.",
  },
  {
    keywords: ["תמונות מהמסיבות", "גלריה", "איך זה נראה שם"],
    answer: "אפשר לראות רגעים מהאווירה בעמוד 'גלריה' באתר.",
  },
  {
    keywords: ["איך פונים", "מספר טלפון של הצוות", "ליצור קשר"],
    answer: "אפשר לפנות לצוות דרך עמוד 'יצירת קשר' באתר, או ישירות כאן בצ'אט.",
  },
];

function matchFaqAnswer(userText: string): string | null {
  const text = (userText || "").trim();
  if (!text) return null;
  let best: { answer: string; score: number } | null = null;
  for (const entry of SUPPORT_FAQ_KB) {
    const score = entry.keywords.reduce((n, kw) => (text.includes(kw) ? n + 1 : n), 0);
    if (score > 0 && (!best || score > best.score)) best = { answer: entry.answer, score };
  }
  return best?.answer || null;
}

/**
 * Site-wide floating support chat — same real Firestore-backed widget the old
 * site had (messages relay to the team's Telegram), restyled to the new
 * site's chat-bubble language (see .chat-window/.chat-msg in styles.css).
 * Self-mounts once this module loads, so every static page that imports
 * site-data.js gets it automatically.
 */
function mountSupportChatWidget() {
  if (document.getElementById("lpSupportChat")) return;

  const wrap = document.createElement("div");
  wrap.id = "lpSupportChat";
  wrap.innerHTML = `
    <button id="lpSupportChatToggle" aria-label="תמיכה" style="position:fixed;left:16px;bottom:86px;z-index:300;width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#e11d48,#be0037);border:0;color:#fff;box-shadow:0 10px 30px rgba(225,29,72,.45);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:transform .2s" onmouseover="this.style.transform='scale(1.06)'" onmouseout="this.style.transform='scale(1)'">
      <svg viewBox='0 0 24 24' width='26' height='26' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true' style='flex-shrink:0;'><path d='M21 11.5a8.4 8.4 0 0 1-12.3 7.4L3 20.5l1.7-5.4A8.4 8.4 0 1 1 21 11.5Z'/></svg>
    </button>
    <div id="lpSupportChatPanel" style="display:none;position:fixed;left:16px;bottom:150px;z-index:300;width:min(360px,calc(100vw - 32px));max-height:65vh;background:rgba(19,19,23,.96);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border:1px solid rgba(255,255,255,.08);border-radius:22px;box-shadow:0 20px 60px rgba(0,0,0,.55);overflow:hidden;flex-direction:column;font-family:'Inter',Arial,sans-serif">
      <div style="padding:14px 16px;background:linear-gradient(135deg,#e11d48,#be0037);display:flex;justify-content:space-between;align-items:center">
        <div style="display:flex;gap:10px;align-items:center">
          <div style="width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center">
            <svg viewBox='0 0 24 24' width='19' height='19' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true' style='flex-shrink:0;color:#fff'><path d='M4 14v-2a8 8 0 0 1 16 0v2M4 14h3v4H4zM17 14h3v4h-3zM20 18c0 2-2 3-5 3'/></svg>
          </div>
          <div>
            <b style="font-size:15px;display:block;color:#fff">צ'אט תמיכה</b>
            <small style="font-size:11px;color:rgba(255,255,255,.85);display:flex;align-items:center;gap:4px"><span style="width:6px;height:6px;border-radius:50%;background:#35c76f;display:inline-block"></span>מגיב בהקדם</small>
          </div>
        </div>
        <div style="display:flex;gap:6px;align-items:center">
          <button id="lpSupportChatMin" title="מזעור" style="background:rgba(255,255,255,.16);border:0;color:#fff;width:28px;height:28px;border-radius:9px;cursor:pointer;display:flex;align-items:center;justify-content:center"><svg viewBox='0 0 24 24' width='17' height='17' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true' style='flex-shrink:0;'><path d='M5 12h14'/></svg></button>
          <button id="lpSupportChatClose" title="סגירה" style="background:rgba(255,255,255,.16);border:0;color:#fff;width:28px;height:28px;border-radius:9px;cursor:pointer;display:flex;align-items:center;justify-content:center"><svg viewBox='0 0 24 24' width='17' height='17' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true' style='flex-shrink:0;'><path d='M6 6l12 12M18 6 6 18'/></svg></button>
        </div>
      </div>

      <div id="lpSupportChatGate" style="padding:26px 20px;text-align:center">
        <div style="width:48px;height:48px;border-radius:50%;background:rgba(225,29,72,.15);display:flex;align-items:center;justify-content:center;margin:0 auto 14px">
          <svg viewBox='0 0 24 24' width='24' height='24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true' style='flex-shrink:0;color:#e11d48'><path d='M7 11V6a1.5 1.5 0 0 1 3 0v4M10 10V4.5a1.5 1.5 0 0 1 3 0V10M13 10V5.5a1.5 1.5 0 0 1 3 0V12l1.5-1.5a1.6 1.6 0 0 1 2.3 2.2L16 18a6 6 0 0 1-9-1l-2-3.5a1.5 1.5 0 0 1 2.6-1.5L7 13'/></svg>
        </div>
        <p style="margin:0 0 14px;font-size:14px;color:#e4e1e7">הזן את שמך כדי להתחיל את הצ'אט</p>
        <input id="lpSupportChatName" placeholder="שם" style="width:100%;box-sizing:border-box;text-align:center;margin-bottom:14px;background:#1f1f23;border:1px solid rgba(255,255,255,.1);border-radius:12px;color:#fff;padding:12px;font-size:14px;outline:none">
        <button id="lpSupportChatStart" style="width:100%;border:0;border-radius:12px;background:linear-gradient(135deg,#e11d48,#be0037);color:#fff;font-weight:700;padding:12px;cursor:pointer;font-size:14px">התחל צ'אט</button>
      </div>

      <div id="lpSupportChatBody" style="display:none;flex-direction:column;flex:1;min-height:0">
        <div id="lpSupportChatMsgs" class="chat-window" style="flex:1;overflow-y:auto;padding:12px;min-height:160px"></div>
        <div style="display:flex;gap:8px;padding:10px 12px;align-items:center">
          <input id="lpSupportChatInput" placeholder="כתבו הודעה..." style="flex:1;background:#1f1f23;border:1px solid rgba(255,255,255,.1);border-radius:999px;color:#fff;padding:10px 16px;font-size:14px;outline:none">
          <button id="lpSupportChatSend" aria-label="שליחה" style="flex-shrink:0;width:40px;height:40px;border-radius:50%;border:0;background:linear-gradient(135deg,#e11d48,#be0037);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center">
            <svg viewBox='0 0 24 24' width='19' height='19' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true' style='flex-shrink:0;transform:scaleX(-1)'><path d='M3 11.5 21 3l-5 18-4.5-7zM11.5 14 21 3'/></svg>
          </button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(wrap);

  const panel = wrap.querySelector("#lpSupportChatPanel") as HTMLElement;
  const toggleBtn = wrap.querySelector("#lpSupportChatToggle") as HTMLElement;
  const closeBtn = wrap.querySelector("#lpSupportChatClose") as HTMLElement;
  const minBtn = wrap.querySelector("#lpSupportChatMin") as HTMLElement;
  const gate = wrap.querySelector("#lpSupportChatGate") as HTMLElement;
  const nameInput = wrap.querySelector("#lpSupportChatName") as HTMLInputElement;
  const startBtn = wrap.querySelector("#lpSupportChatStart") as HTMLElement;
  const body = wrap.querySelector("#lpSupportChatBody") as HTMLElement;
  const msgsBox = wrap.querySelector("#lpSupportChatMsgs") as HTMLElement;
  const input = wrap.querySelector("#lpSupportChatInput") as HTMLInputElement;
  const sendBtn = wrap.querySelector("#lpSupportChatSend") as HTMLElement;

  const chat = supportChat();
  let subscribed = false;

  const getGuestName = () => localStorage.getItem("lp_support_chat_name") || "";
  const setGuestName = (name: string) => localStorage.setItem("lp_support_chat_name", name);
  const currentDisplayName = () => getGuestName() || "אורח/ת";

  const renderMessages = (messages: any[]) => {
    msgsBox.innerHTML = messages
      .map((m) => {
        const own = m.role === "user";
        const senderLabel = own ? "את/ה" : m.role === "bot" ? `התמיכה <span class="bot-tag">תשובה אוטומטית</span>` : "התמיכה";
        const time = m.createdAt instanceof Date
          ? m.createdAt.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })
          : "";
        return `<div class="chat-msg${own ? " own" : ""}"><span class="chat-sender">${senderLabel}</span><div class="chat-bubble"></div><span class="chat-time">${time}</span></div>`;
      })
      .join("");
    [...msgsBox.querySelectorAll(".chat-bubble")].forEach((el, i) => {
      (el as HTMLElement).textContent = messages[i].text || "";
    });
    msgsBox.scrollTop = msgsBox.scrollHeight;
  };

  const startChatBody = () => {
    gate.style.display = "none";
    body.style.display = "flex";
    if (!subscribed) {
      subscribed = true;
      chat.fetchOnce().then(renderMessages).catch(() => {});
      chat.subscribe(renderMessages);
    }
  };

  const openPanel = () => {
    panel.style.display = "flex";
    const known = getGuestName();
    if (known) startChatBody();
    else gate.style.display = "block";
  };

  toggleBtn.addEventListener("click", () => {
    if (panel.style.display === "flex") panel.style.display = "none";
    else openPanel();
  });
  closeBtn.addEventListener("click", () => { panel.style.display = "none"; });
  minBtn.addEventListener("click", () => { panel.style.display = "none"; });

  startBtn.addEventListener("click", () => {
    const name = nameInput.value.trim();
    if (!name) { nameInput.focus(); return; }
    setGuestName(name);
    startChatBody();
  });
  nameInput.addEventListener("keydown", (e) => { if (e.key === "Enter") startBtn.click(); });

  const send = async () => {
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    try {
      await chat.send(text);
      chat.notifyTelegram(text, currentDisplayName());
      const faqAnswer = matchFaqAnswer(text);
      if (faqAnswer) sendSupportBotMessage(faqAnswer, chat.sessionId!).catch(() => {});
    } catch (err) {
      // Message is already written to Firestore even if the Telegram relay fails.
    }
  };
  sendBtn.addEventListener("click", send);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") send(); });
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountSupportChatWidget);
  } else {
    mountSupportChatWidget();
  }
}
