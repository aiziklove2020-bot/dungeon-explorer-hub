// Bridge between the static LIBRAL_PARTY design (public/*.html + assets/app.js)
// and the real Firebase backend. Built as a standalone browser bundle
// (see vite.bridge.config.ts / `npm run build:bridge`) and loaded by the
// static pages as <script type="module" src="assets/site-data.js">.
//
// Exposes window.LPData — real data only. window.LP (assets/app.js) still
// owns local UI state (current logged-in user session, favorites list) until
// auth is migrated too.
import { getActiveParties, registerToPartyNew, createParty, getAllParties, getPartyById, updateParty, deleteParty } from "./firebase/parties";
import { collection, query, where, getDocsFromServer } from "firebase/firestore";
import { db } from "./firebase/config";
import { sendRegistrationTelegram, sendManualPartyAnnouncement } from "./firebase/telegram";
import { getSocialLinks, getRssFeeds, getContent } from "./firebase/settings";
import { registerForumUser, loginForumUser, getForumUserByEmail, updateForumUser, getForumUserById } from "./firebase/forumUsers";
import {
  getSessionId,
  sendSupportMessage,
  sendSupportToTelegram,
  subscribeToSupportMessages,
  fetchSupportMessages,
} from "./firebase/supportChat";
import { getStoreSettings, getProducts, createOrder } from "./firebase/store";
import { uploadPartyImage } from "./firebase/storage";
import { registerAdvertiser, authenticateAdvertiser } from "./firebase/advertisers";
import { ensureMainRoom, subscribeMessages, sendChatMessage, joinRoom } from "./firebase/liveChat";

/** "יום שישי" from any Firestore/JS date shape; "" when unparseable. */
function hebrewDayFromDate(d: any): string {
  const dt = d instanceof Date ? d : d?.toDate ? d.toDate() : new Date(d);
  if (!dt || Number.isNaN(dt.getTime())) return "";
  return dt.toLocaleDateString("he-IL", { weekday: "long" });
}

function formatDateLabel(d: any): string {
  const dt = d instanceof Date ? d : d?.toDate ? d.toDate() : new Date(d);
  if (!dt || Number.isNaN(dt.getTime())) return "";
  return `${String(dt.getDate()).padStart(2, "0")}.${String(dt.getMonth() + 1).padStart(2, "0")}.${dt.getFullYear()}`;
}

// Machine-sortable/filterable form (YYYY-MM-DD) alongside the display label —
// the events page date filter compares against this, not the DD.MM.YYYY text.
function formatDateISO(d: any): string {
  const dt = d instanceof Date ? d : d?.toDate ? d.toDate() : new Date(d);
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
  try {
    const snap = await getDocsFromServer(
      query(collection(db, "parties"), where("status", "==", "active"))
    );
    parties = snap.docs.map((d) => {
      const data: any = d.data();
      return { id: d.id, ...data, date: data.date?.toDate?.() || new Date(data.date) };
    });
  } catch {
    parties = await getActiveParties().catch(() => []);
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

function sanitizeNickname(name: string): string {
  return String(name || "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}_-]/gu, "");
}

/** Real registration: creates a forum user (the site's actual account system). */
async function register(name: string, email: string, password: string, gender?: string) {
  const nickname = sanitizeNickname(name);
  if (nickname.length < 2) throw new Error("השם קצר מדי — נא להזין לפחות 2 תווים (אותיות/ספרות)");
  const user = await registerForumUser(nickname, password, email);
  if (gender) await updateForumUser(user.id, { gender }).catch(() => {});
  return { id: user.id, name: user.nickname, email: user.email || email, gender: gender || null, role: "user" };
}

/** Real login: looks up the account by email, then verifies via the real password check. */
async function login(email: string, password: string) {
  const found = await getForumUserByEmail(email).catch(() => null);
  if (!found) throw new Error("לא נמצא חשבון עם האימייל הזה");
  const user = await loginForumUser(found.nickname, password);
  return { id: user.id, name: user.nickname, email: user.email || email, gender: (found as any).gender || null, role: "user" };
}

/**
 * Membership status shown on the personal area (profile.html).
 * Women get unconditional gold status (free, no expiry) per site policy.
 * Men's status is whatever an admin set on their forum account (subscriptionExpiry) —
 * there's no self-serve payment flow yet, so unset means "not subscribed".
 */
/** Real profile update — writes phone/bio straight to the forum account doc. */
async function updateMyProfile(userId: string, data: { phone?: string; bio?: string }) {
  await updateForumUser(userId, { phone: data.phone || "", bio: data.bio || "" });
}

async function getMembershipStatus(userId: string, gender: string | null) {
  if (gender === "female") {
    return { active: true, tier: "gold", label: "מנוי זהב — חינם לנשים", expiry: null as string | null };
  }
  const user = await getForumUserById(userId).catch(() => null) as any;
  const expiry = user?.subscriptionExpiry || null;
  const active = expiry ? new Date(expiry).getTime() > Date.now() : false;
  return {
    active,
    tier: active ? "standard" : null,
    label: active ? "מנוי פעיל" : "אין מנוי פעיל",
    expiry,
  };
}

/**
 * Real party registration — writes to the same `registrations` array the admin panel reads.
 * registrationType must match what the admin panel itself uses (see src/firebase/parties.js):
 * "single-male-balance" | "single-female-balance" | "single-female-discount" | "couple".
 */
async function registerForParty(partyId: string, data: {
  fullName: string;
  phoneNumber: string;
  telegramUsername?: string;
  registrationType: "single-male-balance" | "single-female-balance" | "single-female-discount" | "couple";
  partnerName?: string;
  partnerPhone?: string;
}) {
  const registrationType = data.registrationType;
  const gender = registrationType === "couple" ? "couple" : registrationType.startsWith("single-female") ? "female" : "male";
  const result = await registerToPartyNew(partyId, {
    fullName: data.fullName,
    phoneNumber: data.phoneNumber,
    telegramUsername: data.telegramUsername || "",
    gender,
    registrationType,
    partnerName: data.partnerName || null,
    partnerPhone: data.partnerPhone || null,
  });

  // Same client-side Telegram alert the old site's registration form sent —
  // pure Firestore-config + direct Telegram API call, no server credential
  // needed. Never blocks/fails the registration itself if it errors.
  try {
    const party = await getPartyById(partyId);
    if (party) {
      await sendRegistrationTelegram(
        { ...data, registrationType, gender },
        party,
        null,
        null,
        "he"
      );
    }
  } catch (err) {
    // best-effort only
  }

  return result;
}

/** Real store — products/orders managed in the admin panel's "חנות" section. */
async function loadStore() {
  const settings = await getStoreSettings().catch(() => ({ enabled: false }));
  if (!(settings as any)?.enabled) return { enabled: false, products: [] };
  const products = await getProducts(true).catch(() => []);
  return {
    enabled: true,
    products: (products || []).map((p: any) => ({
      id: p.id,
      name: p.name || "",
      description: p.description || "",
      price: p.price || 0,
      priceOnRequest: !!p.priceOnRequest,
      images: p.images || [],
      stock: p.stock ?? 0,
      recommended: !!p.recommended,
    })),
  };
}

async function createStoreOrder(data: {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  customerName: string;
  customerPhone: string;
  customerTelegram?: string;
  notes?: string;
}) {
  const totalPrice = data.price * data.quantity;
  return createOrder({
    customerName: data.customerName,
    customerPhone: data.customerPhone,
    customerTelegram: data.customerTelegram || "",
    items: [{ productId: data.productId, productName: data.productName, quantity: data.quantity, price: data.price }],
    totalPrice,
    discountApplied: 0,
    finalPrice: totalPrice,
    userType: "store",
    notes: data.notes || "",
  });
}

/**
 * Real community chat (the same rooms-based live chat as the old site),
 * scoped to the single main room. Requires a logged-in forum account —
 * window.LP.current() (set by register()/login() above) supplies the
 * nickname sendChatMessage needs for attribution.
 */
function communityChat() {
  let roomIdPromise: Promise<string> | null = null;
  const getRoomId = () => {
    if (!roomIdPromise) roomIdPromise = ensureMainRoom().then((r: any) => r.id);
    return roomIdPromise;
  };
  return {
    subscribe: async (cb: (messages: any[]) => void) => {
      const roomId = await getRoomId();
      return subscribeMessages(roomId, cb);
    },
    send: async (text: string, currentUser: { id: string; name: string }) => {
      if (!currentUser) throw new Error("יש להתחבר כדי לשלוח הודעות בצ'אט");
      const roomId = await getRoomId();
      const forumUser = { id: currentUser.id, nickname: currentUser.name };
      await joinRoom(roomId, forumUser, null).catch(() => {});
      return sendChatMessage(roomId, forumUser, null, text);
    },
  };
}

/** Real advertiser party publishing — writes straight to the live parties collection. */
/**
 * Upload a party image straight from the browser (phone gallery/camera or a
 * desktop file picker) to the same Cloudinary bucket the admin panel uses.
 * The preset is unsigned, so no server credential is involved.
 */
async function uploadImage(file: File) {
  const result: any = await uploadPartyImage(file, `adv_${Date.now()}`);
  return typeof result === "string" ? result : result?.url || "";
}

async function createAdvertiserParty(advertiserId: string, data: {
  title: string; date: string; time: string; dj?: string; imageURL?: string; description: string; category?: string; city?: string; whatsappNumber?: string; registrationLink?: string;
}) {
  return createParty({
    city: data.city || "",
    whatsappNumber: data.whatsappNumber || "",
    // An external ticket link makes this an "external" party, which is what
    // event.html keys off to send visitors straight to the seller.
    registrationLink: data.registrationLink || "",
    title: data.title,
    name: data.title,
    date: data.date,
    time: data.time || "",
    dj: data.dj || "",
    imageURL: data.imageURL || "",
    description: data.description,
    category: data.category || "",
    partyType: data.registrationLink ? "external" : "internal",
    // Must be `createdBy` — this is the exact field the Telegram broadcast
    // filter (api/telegram-webhook.js: partyAllowedFor) and the admin's
    // per-advertiser party lookup (firebase/parties.js: query('createdBy'))
    // both key off. A different field name here means the filter can never
    // identify the real advertiser and silently falls back to its "admin-only"
    // branch — which caused parties from any advertiser to leak into any
    // restricted channel whose allowlist happened to include "__admin__".
    createdBy: advertiserId,
  });
}

/** All real parties an advertiser has published, newest first. */
async function loadAdvertiserParties(advertiserId: string) {
  const all = await getAllParties();
  return (all || [])
    .filter((p: any) => p.createdBy === advertiserId)
    .sort((a: any, b: any) => partyDateMs(b) - partyDateMs(a))
    .map(toEventShape);
}

/** Fetches one of an advertiser's own parties (for the edit form), refusing anything not theirs. */
async function getAdvertiserParty(advertiserId: string, partyId: string) {
  const party: any = await getPartyById(partyId);
  if (!party || party.createdBy !== advertiserId) throw new Error("המסיבה לא נמצאה");
  return toEventShape({ ...party, id: partyId });
}

/**
 * Lets an advertiser edit their own party. Re-checks `createdBy` against the
 * live doc (not just what the caller claims) so an advertiser can never
 * overwrite someone else's party by guessing/reusing an id.
 */
async function updateAdvertiserParty(advertiserId: string, partyId: string, data: {
  title: string; date: string; time: string; dj?: string; imageURL?: string; description: string; whatsappNumber?: string; registrationLink?: string;
}) {
  const existing: any = await getPartyById(partyId);
  if (!existing || existing.createdBy !== advertiserId) throw new Error("המסיבה לא נמצאה");
  await updateParty(partyId, {
    title: data.title,
    name: data.title,
    date: data.date,
    time: data.time || "",
    dj: data.dj || "",
    imageURL: data.imageURL || "",
    description: data.description,
    partyType: data.registrationLink ? "external" : "internal",
    registrationLink: data.registrationLink || "",
    whatsappNumber: data.whatsappNumber || "",
  });
  return true;
}

/** Lets an advertiser delete their own party — same ownership check as above. */
async function deleteAdvertiserParty(advertiserId: string, partyId: string) {
  const existing: any = await getPartyById(partyId);
  if (!existing || existing.createdBy !== advertiserId) throw new Error("המסיבה לא נמצאה");
  await deleteParty(partyId);
  return true;
}

/**
 * Lets an advertiser publish one of their own parties to Telegram right now,
 * instead of waiting for the scheduled broadcast. Looks the raw party doc up
 * by id (event.html-shaped objects from loadAdvertiserParties don't carry the
 * raw `createdBy`/`imageURL` fields the Telegram formatter needs) so the same
 * advertiser-allowlist filter in sendManualPartyAnnouncement sees the real
 * `createdBy`, and can never reach a channel that advertiser isn't allowed into.
 */
async function publishPartyToTelegram(partyId: string) {
  const party = await getPartyById(partyId);
  if (!party) throw new Error("המסיבה לא נמצאה");
  const result = await sendManualPartyAnnouncement(party);
  await updateParty(partyId, { manualTelegramPublishedAt: new Date().toISOString() });
  return result;
}

/** Real advertiser signup — creates a pending account awaiting admin approval. */
async function registerAdvertiserAccount(data: { businessName: string; contactName: string; phoneNumber: string; password: string }) {
  const advertiser = await registerAdvertiser(data);
  return { id: advertiser.id, businessName: advertiser.businessName, name: advertiser.contactName, role: "advertiser" };
}

/** Real advertiser login — only succeeds once an admin has approved the account. */
async function loginAdvertiser(phoneNumber: string, password: string) {
  const result = await authenticateAdvertiser(phoneNumber, password);
  if (!result.authenticated) throw new Error(result.error || "פרטי התחברות שגויים");
  const a = result.advertiser as any;
  return { id: a.id, businessName: a.businessName, name: a.contactName, role: "advertiser" };
}

async function loadNewsFeed() {
  const feeds = await getRssFeeds().catch(() => []);
  return (feeds || [])
    .filter((f: any) => f?.enabled !== false && f?.text)
    .map((f: any) => f.text);
}

(window as any).LPData = {
  loadEvents,
  loadSocialLinks,
  loadNewsFeed,
  loadAbout,
  loadContact,
  supportChat,
  loadStore,
  createStoreOrder,
  communityChat,
  registerAdvertiserAccount,
  loginAdvertiser,
  register,
  login,
  getMembershipStatus,
  updateMyProfile,
  uploadImage,
  createAdvertiserParty,
  loadAdvertiserParties,
  getAdvertiserParty,
  updateAdvertiserParty,
  deleteAdvertiserParty,
  publishPartyToTelegram,
  registerForParty,
};

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
    <button id="lpSupportChatToggle" aria-label="תמיכה" style="position:fixed;left:16px;bottom:86px;z-index:300;width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#ff1739,#cf0026);border:0;color:#fff;font-size:22px;box-shadow:0 10px 25px rgba(0,0,0,.4);cursor:pointer">💬</button>
    <div id="lpSupportChatPanel" style="display:none;position:fixed;left:16px;bottom:148px;z-index:300;width:min(340px,calc(100vw - 32px));max-height:65vh;background:#0c0c0f;border:1px solid #33333a;border-radius:20px;box-shadow:0 18px 45px rgba(0,0,0,.5);overflow:hidden;flex-direction:column">
      <div style="padding:14px 16px;background:linear-gradient(135deg,#ff1739,#cf0026);display:flex;justify-content:space-between;align-items:center">
        <div style="display:flex;gap:8px;align-items:center">
          <button id="lpSupportChatClose" title="סגירה" style="background:rgba(255,255,255,.18);border:0;color:#fff;font-size:15px;width:26px;height:26px;border-radius:8px;cursor:pointer">✕</button>
          <button id="lpSupportChatMin" title="מזעור" style="background:rgba(255,255,255,.18);border:0;color:#fff;font-size:15px;width:26px;height:26px;border-radius:8px;cursor:pointer">–</button>
        </div>
        <div style="display:flex;gap:10px;align-items:center">
          <div style="text-align:center">
            <b style="font-size:15px;display:block">צ'אט תמיכה</b>
            <small style="font-size:11px;color:rgba(255,255,255,.85)">מגיב בהקדם</small>
          </div>
          <div style="width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center;font-size:16px">💬</div>
        </div>
      </div>

      <div id="lpSupportChatGate" style="padding:22px 18px;text-align:center">
        <p style="margin:0 0 14px;font-size:14px">הזן את שמך כדי להתחיל את הצ'אט</p>
        <input id="lpSupportChatName" class="input" placeholder="שם" style="width:100%;box-sizing:border-box;text-align:center;margin-bottom:14px">
        <button id="lpSupportChatStart" class="btn primary full">התחל צ'אט</button>
      </div>

      <div id="lpSupportChatBody" style="display:none;flex-direction:column;flex:1;min-height:0">
        <div id="lpSupportChatMsgs" class="chat-window" style="flex:1;overflow-y:auto;padding:12px;min-height:160px"></div>
        <div class="form-row" style="padding:10px 12px;margin:0">
          <input id="lpSupportChatInput" class="input" placeholder="כתבו הודעה..." style="flex:1">
          <button id="lpSupportChatSend" class="btn primary">שליחה</button>
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
  const currentDisplayName = () => (window as any).LP?.current?.()?.name || getGuestName() || "אורח/ת";

  const renderMessages = (messages: any[]) => {
    msgsBox.innerHTML = messages
      .map((m) => {
        const own = m.role === "user";
        const time = m.createdAt instanceof Date
          ? m.createdAt.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })
          : "";
        return `<div class="chat-msg${own ? " own" : ""}"><span class="chat-sender">${own ? "את/ה" : "התמיכה"}</span><div class="chat-bubble"></div><span class="chat-time">${time}</span></div>`;
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
    const known = (window as any).LP?.current?.()?.name || getGuestName();
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
