
// A logged-in session (advertiser or forum account) used to live only in
// localStorage — but that gets wiped on its own in several real cases: iOS
// Safari's Intelligent Tracking Prevention caps script-writable storage at 7
// days of inactivity, and in-app browsers (the webview WhatsApp/Telegram
// open when someone taps a shared link) frequently don't persist
// localStorage across app restarts at all. Reported live as "an advertiser
// has to type phone+password in again every single time". A long-lived
// cookie survives both of those cases, so it's kept as a second copy and
// used to silently restore the session (re-hydrating localStorage) whenever
// localStorage itself comes back empty.
function lpSetSessionCookie_(value) {
  try {
    const maxAgeSeconds = 365 * 24 * 60 * 60;
    document.cookie = `lp_current=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
  } catch {}
}
function lpGetSessionCookie_() {
  try {
    const match = document.cookie.split("; ").find((row) => row.startsWith("lp_current="));
    return match ? decodeURIComponent(match.slice("lp_current=".length)) : null;
  } catch {
    return null;
  }
}
function lpClearSessionCookie_() {
  try { document.cookie = "lp_current=; path=/; max-age=0; SameSite=Lax"; } catch {}
}

const LP = {
  getUsers(){ return JSON.parse(localStorage.getItem("lp_users") || "[]"); },
  setUsers(v){ localStorage.setItem("lp_users", JSON.stringify(v)); },
  current(){
    try {
      const raw = localStorage.getItem("lp_current");
      if (raw) return JSON.parse(raw);
    } catch {}
    try {
      const cookieRaw = lpGetSessionCookie_();
      if (cookieRaw) {
        localStorage.setItem("lp_current", cookieRaw);
        return JSON.parse(cookieRaw);
      }
    } catch {}
    return null;
  },
  setCurrent(v){
    const raw = JSON.stringify(v);
    localStorage.setItem("lp_current", raw);
    lpSetSessionCookie_(raw);
  },
  clearCurrent(){
    localStorage.removeItem("lp_current");
    lpClearSessionCookie_();
  },
  events(){ return JSON.parse(localStorage.getItem("lp_events") || "[]"); },
  setEvents(v){ localStorage.setItem("lp_events", JSON.stringify(v)); },
  favorites(){ return JSON.parse(localStorage.getItem("lp_favs") || "[]"); },
  setFavorites(v){ localStorage.setItem("lp_favs", JSON.stringify(v)); },
  seed(){
    if(!localStorage.getItem("lp_users")){
      this.setUsers([
        {id:1,name:"Demo User",email:"user@libral.party",password:"123456",role:"user"},
        {id:2,name:"Libral Events",email:"ads@libral.party",password:"123456",role:"advertiser"},
        {id:3,name:"Admin",email:"admin@libral.party",password:"123456",role:"admin"}
      ]);
    }
    if(!localStorage.getItem("lp_events")){
      this.setEvents([
        {id:101,title:"Secret Desires",city:"תל אביב",date:"2026-08-22",time:"22:00",type:"מסיבה יוקרתית",status:"live",img:"https://images.unsplash.com/photo-1545128485-c400e7702796?auto=format&fit=crop&w=1200&q=80",desc:"ערב יוקרתי, דיסקרטי ומוקפד לקהילה."},
        {id:102,title:"Liberate Night",city:"חיפה",date:"2026-08-23",time:"21:00",type:"פתוחה לזוגות",status:"live",img:"https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80",desc:"מוזיקה, חופש וחיבורים באווירה פתוחה."},
        {id:103,title:"Playground",city:"הרצליה",date:"2026-08-21",time:"22:00",type:"אירוע פרטי",status:"live",img:"https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=80",desc:"אירוע פרטי ומעוצב עם חוויה ייחודית."},
        {id:104,title:"Red Room",city:"ירושלים",date:"2026-08-29",time:"22:00",type:"מסיבה יוקרתית",status:"pending",img:"https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=80",desc:"לילה אדום, אינטימי ומדויק."},
        {id:105,title:"White Party",city:"באר שבע",date:"2026-09-05",time:"21:00",type:"פתוחה לזוגות",status:"live",img:"https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1200&q=80",desc:"מסיבת לבן גדולה לקהילה."}
      ]);
    }
  }
};
LP.seed();

function escapeHtml(str){
  if(str === null || str === undefined) return "";
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}
window.escapeHtml = escapeHtml;

function toast(msg, kind="success"){
  // Centered above the mobile bottom-nav. Previously pinned to left:20px,
  // which landed directly on top of the support-chat bubble (same corner)
  // and read as a detached stray message on an RTL page.
  let el=document.createElement("div"); el.className="lp-toast "+kind;
  el.textContent=msg; document.body.appendChild(el);
  requestAnimationFrame(()=>el.classList.add("show"));
  setTimeout(()=>{el.classList.remove("show");setTimeout(()=>el.remove(),250)},3200);
}
// Chrome fires this before the DOM handler below runs, so capture it at
// module scope and let the banner's button replay it on demand.
let lpInstallPrompt = null;
window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); lpInstallPrompt = e; });

document.addEventListener("DOMContentLoaded",()=>{
  document.querySelectorAll(".cyear").forEach(el=>el.textContent=new Date().getFullYear());

  // "Install the app" banner (homepage). Uses the native PWA install prompt
  // where the browser offers one, and falls back to per-platform manual
  // instructions everywhere else (notably iOS Safari, which has no API).
  const installBtn = document.getElementById("appInstallBtn");
  const howBtn = document.getElementById("appHowBtn");
  const howPanel = document.getElementById("appHowPanel");
  if (installBtn) {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
    if (standalone) {
      const banner = installBtn.closest(".app-banner");
      if (banner) banner.style.display = "none";
    }
    installBtn.addEventListener("click", async () => {
      if (lpInstallPrompt) {
        lpInstallPrompt.prompt();
        const { outcome } = await lpInstallPrompt.userChoice;
        lpInstallPrompt = null;
        if (outcome === "accepted") toast("האפליקציה מותקנת! 🎉");
        return;
      }
      howPanel.style.display = "";
      howPanel.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    howBtn?.addEventListener("click", () => {
      const open = howPanel.style.display !== "none";
      howPanel.style.display = open ? "none" : "";
      if (!open) howPanel.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  // Header "כניסה" dropdown offering subscriber vs advertiser login — the
  // header itself has no way to know which the visitor wants, so it opens a
  // small picker rather than guessing. Purely a UI toggle; which link the
  // visitor picks (/login vs /advertiser-login) is unchanged.
  document.querySelectorAll(".login-picker").forEach(picker => {
    const btn = picker.querySelector(".member-login");
    const menu = picker.querySelector(".login-options");
    if (!btn || !menu) return;
    const closePicker = () => { menu.hidden = true; btn.setAttribute("aria-expanded", "false"); };
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const willOpen = menu.hidden;
      document.querySelectorAll(".login-options").forEach(m => { m.hidden = true; });
      document.querySelectorAll(".member-login").forEach(b => b.setAttribute("aria-expanded", "false"));
      menu.hidden = !willOpen;
      btn.setAttribute("aria-expanded", String(willOpen));
    });
    document.addEventListener("click", (e) => { if (!picker.contains(e.target)) closePicker(); });
  });
  // Mobile hamburger menu — toggles on tap, closes on an outside tap or on
  // picking a link. The header markup used to also carry an inline
  // onclick="...classList.toggle('open')" on this same button (copied
  // verbatim from the design file); with this listener also attached, every
  // tap toggled the class twice and the menu never visibly opened. The
  // inline onclick has been removed from every page's header.
  document.querySelectorAll(".mobile-menu").forEach(btn => {
    const nav = btn.closest(".nav");
    if (!nav) return;
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      nav.classList.toggle("open");
    });
    nav.querySelector("nav")?.addEventListener("click", (e) => {
      if (e.target.closest("a")) nav.classList.remove("open");
    });
    document.addEventListener("click", (e) => {
      if (!nav.contains(e.target)) nav.classList.remove("open");
    });
  });

  const c=LP.current();
  document.querySelectorAll("[data-auth-label]").forEach(el=>el.textContent=c?c.name:"כניסה");
  // Header "כניסה" button: once logged into a real forum account, swap the
  // generic person icon for a small initial-letter avatar so it's obvious at
  // a glance that this profile is signed in (not just relabeled text).
  document.querySelectorAll(".member-login").forEach(btn=>{
    const avatar = btn.querySelector("[data-auth-avatar]");
    if (!avatar) return;
    if (c) {
      btn.classList.add("connected");
      avatar.textContent = (c.name || "?").trim().charAt(0).toUpperCase();
    } else {
      btn.classList.remove("connected");
    }
  });
  document.querySelectorAll("[data-dashboard-link]").forEach(el=>{
    if (!c) return; // keep the anchor's own href (/login) — it's only a dashboard link once logged in
    el.href = c.role==="advertiser" ? "/advertiser-dashboard" : c.role==="admin" ? "/admin" : "/profile";
    const displayName = c.businessName || c.name || "מחובר/ת";
    const label = el.querySelector("small");
    if (label) label.textContent = displayName;
    el.title = "מחובר/ת בתור " + displayName;
    el.classList.add("connected");
  });

  document.querySelectorAll("[data-fav]").forEach(btn=>{
    let id=btn.dataset.fav, favs=LP.favorites();
    btn.textContent=favs.includes(id)?"♥":"♡";
    btn.addEventListener("click",()=>{
      let fs=LP.favorites(); fs=fs.includes(id)?fs.filter(x=>x!==id):[...fs,id]; LP.setFavorites(fs);
      btn.textContent=fs.includes(id)?"♥":"♡"; toast(fs.includes(id)?"נוסף למועדפים":"הוסר מהמועדפים");
    });
  });
});

/**
 * Real (Firestore-backed) favorites — separate from the old anonymous
 * LP.favorites()/[data-fav] pair above, which just persisted to this
 * browser's localStorage for anyone. Identity here is either a real
 * logged-in forum account (LP.current()) or the phone number saved by
 * /my-area (localStorage "lp_my_area_phone") — both are valid "who" to
 * attach a favorite to; favorites.js/firestore.rules accept any userId
 * string, so a phone number works exactly like a forum user id.
 *
 * Call lpWireFavHearts() after injecting any [data-fav-btn="<partyId>"]
 * heart buttons into the page (see events.html / index.html card templates).
 */
function lpFavIdentity() {
  // Favorites are a member-only feature — only a real logged-in account
  // (LP.current()) counts, not the phone-only personal-area lookup
  // (my-area.html), which has no password and isn't a subscriber login.
  const user = LP.current();
  // Producers (advertisers) have no favourites.
  return user && user.role !== "advertiser" ? user.id : null;
}

async function lpWireFavHearts(container) {
  const root = container || document;
  const buttons = [...root.querySelectorAll("[data-fav-btn]")];
  if (buttons.length === 0) return;
  const identity = lpFavIdentity();

  // The click handlers are attached right away. The slow part (checking the subscription and loading the
  // current favourites) runs in the background, and a tap simply waits for it — before, the hearts were
  // visible but did nothing until that finished, which looked like "I can't press the heart".
  let isProducer = false;
  try { isProducer = LP.current()?.role === "advertiser"; } catch {}
  let isSubscriber = false;
  let myFavIds = [];
  const subKey = identity ? "lp_fav_sub_" + identity : "";
  try { if (subKey && sessionStorage.getItem(subKey) === "1") isSubscriber = true; } catch {}

  const paint = (btn, on) => {
    btn.classList.toggle("saved", on);
    btn.textContent = on ? "במועדפים" : "הוספה למועדפים";
    btn.setAttribute("aria-pressed", on);
  };

  const ready = (async () => {
    if (identity && window.LPData?.loadMyForumPersonalArea) {
      const area = await window.LPData.loadMyForumPersonalArea(identity).catch(() => null);
      isSubscriber = !!area?.profile?.isPrivilegedSubscriber;
      try { if (subKey) sessionStorage.setItem(subKey, isSubscriber ? "1" : "0"); } catch {}
    }
    if (!isSubscriber || isProducer) {
      // Favorites are a subscriber-only feature: hide the hearts for everyone else.
      buttons.forEach((btn) => { btn.style.display = "none"; });
      return;
    }
    if (identity && window.LPData?.loadMyFavorites) {
      myFavIds = await window.LPData.loadMyFavorites(identity).catch(() => []);
    }
    buttons.forEach((btn) => paint(btn, myFavIds.includes(btn.dataset.favBtn)));
  })();

  if (isProducer) {
    buttons.forEach((btn) => { btn.style.display = "none"; });
    return;
  }

  buttons.forEach((btn) => {
    const id = btn.dataset.favBtn;
    btn.addEventListener("click", async (ev) => {
      ev.preventDefault();
      // addFavorite writes via setDoc on a deterministic doc id, and the favorites collection's rules
      // disallow "update" on an existing doc — ignore taps while a request is in flight.
      if (btn.dataset.favPending === "1") return;
      const current = lpFavIdentity();
      if (!current) {
        toast("יש להתחבר כמנוי כדי לשמור מועדפים");
        setTimeout(() => (location.href = "/login"), 900);
        return;
      }
      btn.dataset.favPending = "1";
      try {
        await ready;
        if (!isSubscriber) return;
        const nowFav = btn.classList.contains("saved");
        const next = !nowFav;
        paint(btn, next); // optimistic
        try {
          await window.LPData.toggleFavorite(current, id, next);
          toast(next ? "נוסף למועדפים" : "הוסר מהמועדפים");
        } catch (err) {
          paint(btn, nowFav); // revert
          toast(err?.message || "שגיאה בשמירת מועדף", "error");
        }
      } finally {
        delete btn.dataset.favPending;
      }
    });
  });
}
window.lpWireFavHearts = lpWireFavHearts;

/**
 * In-app reminder bell for a logged-in user: shows a red dot when any
 * favorited party is happening within the next few days, and a small list
 * on click. No push/SMS — just visible next time they open the site.
 * Call lpWireFavBell() once per page that has a [data-fav-bell] button.
 */
async function lpWireFavBell() {
  const btn = document.querySelector("[data-fav-bell]");
  if (!btn) return;
  const identity = lpFavIdentity();
  if (!identity || !window.LPData?.loadFavoriteAlerts) {
    btn.style.display = "none";
    return;
  }
  btn.style.display = "";
  const alerts = await window.LPData.loadFavoriteAlerts(identity).catch(() => []);
  const dot = btn.querySelector("[data-fav-bell-dot]");
  if (alerts.length > 0 && dot) dot.style.display = "";
  btn.addEventListener("click", () => {
    const existing = document.getElementById("lpFavBellPopup");
    if (existing) { existing.remove(); return; }
    const popup = document.createElement("div");
    popup.id = "lpFavBellPopup";
    popup.style.cssText = "position:fixed;top:64px;left:16px;right:16px;max-width:360px;margin-inline-start:auto;background:#1f1f23;border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:14px;z-index:400;box-shadow:0 20px 50px rgba(0,0,0,.5)";
    popup.innerHTML = alerts.length
      ? `<div style="font-weight:800;margin-bottom:8px">מסיבות מועדפות שמתקרבות</div>` +
        alerts.map(e => `<a href="/event?id=${e.id}" style="display:block;padding:8px 0;border-top:1px solid rgba(255,255,255,.08);color:#fff;text-decoration:none">
          <div style="font-weight:700">${e.title}</div>
          <div style="font-size:12px;color:#94A3B8">${e.day || ""}${e.day && e.date ? ", " : ""}${e.date || ""}</div>
        </a>`).join("")
      : `<div style="color:#94A3B8">אין עדכונים כרגע על מסיבות מועדפות</div>`;
    document.body.appendChild(popup);
    setTimeout(() => document.addEventListener("click", function close(ev) {
      if (!popup.contains(ev.target) && ev.target !== btn) { popup.remove(); document.removeEventListener("click", close); }
    }), 0);
  });
}
window.lpWireFavBell = lpWireFavBell;

/**
 * Mobile push notifications (balance-match alerts etc.) — works while the
 * site/app is fully closed, on Android Chrome and on iOS Safari **only**
 * when the site was added to the home screen first (iOS doesn't support
 * push in a regular browser tab, only in an installed PWA, iOS 16.4+).
 */
const LP_VAPID_PUBLIC_KEY = "BEKO6poc32JAn1MYTdwdvzRve1BRIwZ85AgtEUQe_JqWLTYal5sdwJK-TossqFQzWmnE9Hoj0nxRQtA4nMjTb7Y";

function lpUrlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

function lpIsIosNotInstalled() {
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  return isIos && !isStandalone;
}

// Returns "ok" | "ios-not-installed" | "unsupported" | "denied" | "error"
async function lpEnablePushNotifications(phone) {
  if (lpIsIosNotInstalled()) return "ios-not-installed";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !phone) return "unsupported";
  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return "denied";
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: lpUrlBase64ToUint8Array(LP_VAPID_PUBLIC_KEY),
      });
    }
    await window.LPData.registerPushSubscription(phone, sub.toJSON());
    return "ok";
  } catch (err) {
    return "error";
  }
}
window.lpEnablePushNotifications = lpEnablePushNotifications;

// A visitor's "identity" for push purposes: a real phone if we already know
// one (logged-in forum account, or the phone-only /my-area lookup), else a
// stable per-browser anonymous id so someone can still opt in on their very
// first visit, before ever registering. Firestore's pushSubscriptions rules
// only require a short non-empty string in the "phone" field (max 20 chars),
// so this anonymous id is written there like any other identity — the "new
// party" broadcast then reaches everyone who opted in, subscriber or not,
// while a real match/balance notification (sent separately, elsewhere) only
// ever targets a genuine phone number.
function lpPushIdentity() {
  const forumPhone = LP.current()?.phone;
  if (forumPhone) return forumPhone;
  const areaPhone = localStorage.getItem("lp_my_area_phone");
  if (areaPhone) return areaPhone;
  let anon = localStorage.getItem("lp_anon_id");
  if (!anon) {
    anon = "anon" + Math.random().toString(36).slice(2, 12);
    try { localStorage.setItem("lp_anon_id", anon); } catch {}
  }
  return anon;
}

// Easier typing in every form on the site (also forms added later by scripts):
// the right mobile keyboard per field (digits for phones), no auto-capitalising or
// autocorrect for Telegram handles, links and passwords, a "next / done" key on the
// keyboard, Enter moving to the next field instead of submitting half a form, the
// focused field scrolled above the keyboard, and phone numbers cleaned up when
// typed or pasted (spaces, dashes, "+972" and Hebrew-style digits).
function lpNormalizePhone_(raw) {
  let v = String(raw || "").replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632)).replace(/[^\d+]/g, "");
  if (v.startsWith("+972")) v = "0" + v.slice(4);
  else if (v.startsWith("972")) v = "0" + v.slice(3);
  return v.replace(/\D/g, "");
}
function lpEnhanceField_(el) {
  if (el.dataset.lpEasy) return;
  el.dataset.lpEasy = "1";
  const type = (el.getAttribute("type") || "text").toLowerCase();
  const name = `${el.name || ""} ${el.id || ""}`.toLowerCase();
  if (el.tagName === "INPUT") {
    if (type === "tel") {
      el.setAttribute("inputmode", "numeric");
      if (!el.getAttribute("autocomplete")) el.setAttribute("autocomplete", "tel");
      el.setAttribute("autocapitalize", "off");
      const clean = () => { const v = lpNormalizePhone_(el.value); if (v !== el.value) el.value = v; };
      el.addEventListener("input", clean);
      el.addEventListener("paste", (e) => {
        const text = (e.clipboardData || window.clipboardData)?.getData("text");
        if (text == null) return;
        e.preventDefault();
        const v = lpNormalizePhone_(text);
        const max = parseInt(el.getAttribute("maxlength"), 10);
        el.value = max > 0 ? v.slice(0, max) : v;
        el.dispatchEvent(new Event("input", { bubbles: true }));
      });
    } else if (type === "password") {
      el.setAttribute("autocapitalize", "off");
      el.setAttribute("autocorrect", "off");
      el.setAttribute("spellcheck", "false");
    } else if (type === "url") {
      el.setAttribute("inputmode", "url");
      el.setAttribute("autocapitalize", "off");
      el.setAttribute("autocorrect", "off");
      el.setAttribute("spellcheck", "false");
    } else if (type === "search") {
      el.setAttribute("enterkeyhint", "search");
    } else if (type === "text") {
      if (/telegram/.test(name) || el.getAttribute("dir") === "ltr") {
        el.setAttribute("autocapitalize", "off");
        el.setAttribute("autocorrect", "off");
        el.setAttribute("spellcheck", "false");
        if (!el.getAttribute("autocomplete")) el.setAttribute("autocomplete", "off");
      } else if (/name|שם/.test(name) && !/business|nick/.test(name)) {
        el.setAttribute("autocapitalize", "words");
      }
    }
    // Enter on a text field moves to the next field; only the last one submits.
    if (!["checkbox", "radio", "file", "hidden", "submit", "button", "date", "time"].includes(type) && type !== "search") {
      el.addEventListener("keydown", (e) => {
        if (e.key !== "Enter" || e.isComposing || !el.form) return;
        const fields = [...el.form.querySelectorAll("input,select,textarea")].filter((f) => !f.disabled && f.type !== "hidden" && f.type !== "checkbox" && f.type !== "file" && f.offsetParent !== null);
        const i = fields.indexOf(el);
        if (i >= 0 && i < fields.length - 1) { e.preventDefault(); fields[i + 1].focus(); }
      });
    }
  }
  // Keyboard action key: "next" on every field but the last of a form, "send" on the last.
  if (el.form && !el.hasAttribute("enterkeyhint") && el.tagName !== "SELECT") {
    const fields = [...el.form.querySelectorAll("input,textarea")].filter((f) => f.type !== "hidden" && f.type !== "checkbox" && f.type !== "file");
    if (el.tagName !== "TEXTAREA") el.setAttribute("enterkeyhint", fields[fields.length - 1] === el ? "send" : "next");
  }
  // Keep the focused field visible above the on-screen keyboard.
  if (el.tagName !== "SELECT" && !["checkbox", "radio", "file", "hidden", "date", "time"].includes(type)) {
    el.addEventListener("focus", () => {
      if (window.matchMedia("(max-width:800px)").matches) setTimeout(() => { try { el.scrollIntoView({ block: "center", behavior: "smooth" }); } catch {} }, 350);
    });
  }
}
function lpEasyForms(root) {
  (root || document).querySelectorAll("form input, form textarea, #regForm input, #regForm textarea").forEach(lpEnhanceField_);
}
document.addEventListener("DOMContentLoaded", () => {
  lpEasyForms();
  try {
    new MutationObserver((muts) => {
      for (const m of muts) m.addedNodes.forEach((n) => { if (n.nodeType === 1) lpEasyForms(n.matches?.("form") || n.closest?.("form") ? n.closest("form") || n : n); });
    }).observe(document.body, { childList: true, subtree: true });
  } catch {}
});

// Cookie notice, same look as the notifications banner below. The site only uses
// a cookie that keeps a member signed in (lp_current), so the notice informs and
// asks for an OK; the answer is remembered in this browser ("lp_cookie_ok").
function lpCookieDecided() {
  try { return !!localStorage.getItem("lp_cookie_ok"); } catch { return true; }
}
function lpWireCookieBanner() {
  if (lpCookieDecided()) return;
  const el = document.createElement("div");
  el.id = "lpCookieBanner";
  el.setAttribute("role", "status");
  el.innerHTML = `
    <span>האתר משתמש בעוגיות הכרחיות לתפקודו, למשל כדי לזכור שהתחברתם. פרטים ב<a href="/privacy" style="color:#ff9fc3;text-decoration:underline">מדיניות הפרטיות</a>. </span>
    <button type="button" id="lpCookieBannerYes" class="btn gold">אישור</button>
  `;
  el.style.cssText = "position:fixed;z-index:22;bottom:calc(64px + env(safe-area-inset-bottom,0px));inset-inline:0;display:flex;align-items:center;justify-content:flex-start;flex-wrap:wrap;gap:10px;padding:12px 16px;background:#1c1120ee;backdrop-filter:blur(10px);border-top:1px solid #ffffff22;font-size:14px;color:#e5e1e4";
  document.body.appendChild(el);
  document.getElementById("lpCookieBannerYes").addEventListener("click", () => {
    try { localStorage.setItem("lp_cookie_ok", "1"); } catch {}
    el.remove();
    document.dispatchEvent(new Event("lp-cookie-decided"));
  });
}
document.addEventListener("DOMContentLoaded", lpWireCookieBanner);

// Site-wide "enable notifications" banner — every previous entry point to
// lpEnablePushNotifications lived deep inside /my-area or /profile, which a
// first-time or anonymous visitor has no reason to ever open. This surfaces
// the same opt-in on every page, for every visitor. It should keep greeting
// someone who hasn't actually decided yet, so closing it with the × only
// hides it for this page view — it comes back on the next visit. Once a real
// decision exists (granted or denied, tracked natively by the browser via
// Notification.permission, not our own storage) the "!== 'default'" check
// below is what stops it from ever showing again — no separate "dismissed"
// flag needed, and none is set here.
function lpWirePushBanner() {
  // One banner at a time: the cookie notice comes first, this one follows once it is answered.
  if (!lpCookieDecided()) { document.addEventListener("lp-cookie-decided", lpWirePushBanner, { once: true }); return; }
  if (lpIsIosNotInstalled()) return; // can't work here at all; nothing to offer
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
  if (typeof Notification === "undefined" || Notification.permission !== "default") return;

  const el = document.createElement("div");
  el.id = "lpPushBanner";
  el.setAttribute("role", "status");
  el.innerHTML = `
    <span>רוצים לקבל התראות לנייד על מסיבות חדשות ועל התאמות איזון? מי שלא יאשר לא יקבל אותן. </span>
    <button type="button" id="lpPushBannerYes" class="btn gold">כן, רוצה התראות</button>
    <button type="button" id="lpPushBannerNo" class="btn">לא, תודה</button>
  `;
  // bottom offset clears the fixed mobile-bottom nav bar (64px + safe area)
  // instead of stacking on top of it; on desktop, where that bar is hidden,
  // this just leaves a small harmless gap above the edge.
  el.style.cssText = "position:fixed;z-index:21;bottom:calc(64px + env(safe-area-inset-bottom,0px));inset-inline:0;display:flex;align-items:center;justify-content:flex-start;flex-wrap:wrap;gap:10px;padding:12px 16px;background:#1c1120ee;backdrop-filter:blur(10px);border-top:1px solid #ffffff22;font-size:14px;color:#e5e1e4";
  document.body.appendChild(el);

  document.getElementById("lpPushBannerNo").addEventListener("click", () => el.remove());
  document.getElementById("lpPushBannerYes").addEventListener("click", async () => {
    const btn = document.getElementById("lpPushBannerYes");
    btn.disabled = true;
    const result = await lpEnablePushNotifications(lpPushIdentity());
    if (result === "ok") {
      toast("התראות הופעלו בהצלחה");
      el.remove();
    } else if (result === "denied") {
      toast("ההתראות נחסמו בדפדפן — אפשר לאשר אותן דרך הגדרות האתר", "error");
      el.remove();
    } else {
      btn.disabled = false;
    }
  });
}
document.addEventListener("DOMContentLoaded", lpWirePushBanner);

// sw.js was only ever registered when someone tapped "enable notifications",
// so every other visit had no service worker and tools that check PWA
// installability (PWABuilder, Lighthouse) reported the site as having none.
// sw.js does no caching — every request passes straight through to the
// network — so registering it everywhere changes nothing about what visitors
// see; it just makes the site a complete installable PWA.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

// "רשום אותי למסיבה זו" buttons on the favourite cards of the personal area (data-quick-reg="<partyId>").
window.lpQuickRegisterHtml = function (e) {
  const canRegister = (e.partyType !== "external" || e.allowBalanceRegistration) && !e.registrationClosed;
  return canRegister ? `<button type="button" class="btn gold" data-quick-reg="${String(e.id).replace(/"/g, "")}">רשום אותי למסיבה זו</button>` : "";
};
window.lpWireQuickRegister = function (container, phone) {
  container.querySelectorAll("[data-quick-reg]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-quick-reg");
      btn.disabled = true;
      const label = btn.textContent;
      btn.textContent = "נרשם...";
      try {
        await window.LPData.registerMeQuick(phone, id);
        btn.textContent = "נרשמת ✓";
        if (window.toast) toast("נרשמת למסיבה, ההודעה נשלחה");
      } catch (err) {
        if (String(err && err.message) === "NEED_FORM") {
          location.href = "/event?id=" + encodeURIComponent(id);
          return;
        }
        btn.disabled = false;
        btn.textContent = label;
        if (window.toast) toast(err && err.message ? err.message : "ההרשמה נכשלה, נסו שוב", "error");
      }
    });
  });
};

// Anonymous chat with the balance match (personal area). The two sides never see a name or a phone number
// here; the chat is removed together with the party. Server side: api/telegram-webhook.js ?job=match-chat.
window.lpMountMatchChat = function (container, phone, partyId) {
  if (!container || !phone || !partyId) return;
  container.innerHTML = `<div class="match-chat">
    <button type="button" class="match-chat-toggle">💬 צ'אט אנונימי עם ההתאמה שלך</button>
    <div class="match-chat-body" hidden>
      <p class="meta">השיחה אנונימית: אף אחד לא רואה שם או מספר טלפון. הצ'אט נמחק אחרי שהמסיבה מסתיימת.</p>
      <div class="match-chat-msgs" role="log" aria-live="polite"></div>
      <form class="match-chat-form" autocomplete="off">
        <input type="text" maxlength="500" placeholder="כתבו הודעה..." aria-label="הודעה">
        <button class="btn gold" type="submit">שלח</button>
      </form>
    </div>
  </div>`;
  const toggle = container.querySelector(".match-chat-toggle");
  const body = container.querySelector(".match-chat-body");
  const list = container.querySelector(".match-chat-msgs");
  const form = container.querySelector(".match-chat-form");
  const input = form.querySelector("input");
  let last = 0;
  let timer = null;
  const seen = new Set();

  const call = async (payload) => {
    const res = await fetch("/api/telegram-webhook?job=match-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, partyId, after: last, ...payload }),
    });
    const data = await res.json().catch(() => ({ ok: false, error: "שגיאת רשת" }));
    if (!data.ok) throw new Error(data.error || "שגיאה");
    return data.messages || [];
  };
  const render = (messages) => {
    messages.forEach((m) => {
      if (seen.has(m.id)) return;
      seen.add(m.id);
      last = Math.max(last, m.at);
      const row = document.createElement("div");
      row.className = "match-chat-row" + (m.mine ? " mine" : "");
      const bubble = document.createElement("div");
      bubble.className = "match-chat-bubble";
      bubble.textContent = m.text;
      row.appendChild(bubble);
      list.appendChild(row);
    });
    if (messages.length) list.scrollTop = list.scrollHeight;
  };
  const poll = async () => {
    if (document.hidden || body.hidden) return;
    try { render(await call({ action: "list" })); } catch { /* quiet: next poll retries */ }
  };
  toggle.addEventListener("click", () => {
    body.hidden = !body.hidden;
    if (!body.hidden) {
      poll();
      timer = timer || setInterval(poll, 6000);
      input.focus();
    }
  });
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    const btn = form.querySelector("button");
    btn.disabled = true;
    try {
      render(await call({ action: "send", text }));
      input.value = "";
    } catch (err) {
      if (window.toast) toast(err.message || "ההודעה לא נשלחה", "error");
    } finally {
      btn.disabled = false;
    }
  });
};
