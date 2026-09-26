
const LP = {
  getUsers(){ return JSON.parse(localStorage.getItem("lp_users") || "[]"); },
  setUsers(v){ localStorage.setItem("lp_users", JSON.stringify(v)); },
  current(){ return JSON.parse(localStorage.getItem("lp_current") || "null"); },
  setCurrent(v){ localStorage.setItem("lp_current", JSON.stringify(v)); },
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
  return user ? user.id : null;
}

async function lpWireFavHearts(container) {
  const root = container || document;
  const buttons = [...root.querySelectorAll("[data-fav-btn]")];
  if (buttons.length === 0) return;
  const identity = lpFavIdentity();

  // Favorites are a subscriber-only feature — a forum login alone isn't
  // enough (see toggleFavorite in site-bridge.ts). Hide the hearts entirely
  // for anyone who isn't an active subscriber, rather than showing them a
  // button that will just error out on click.
  let isSubscriber = false;
  if (identity && window.LPData?.loadMyForumPersonalArea) {
    const area = await window.LPData.loadMyForumPersonalArea(identity).catch(() => null);
    isSubscriber = !!area?.profile?.isPrivilegedSubscriber;
  }
  if (!isSubscriber) {
    buttons.forEach((btn) => { btn.style.display = "none"; });
    return;
  }

  let myFavIds = [];
  if (identity && window.LPData?.loadMyFavorites) {
    myFavIds = await window.LPData.loadMyFavorites(identity).catch(() => []);
  }
  const paint = (btn, on) => {
    btn.classList.toggle("saved", on);
    btn.textContent = on ? "♥" : "♡";
    btn.setAttribute("aria-pressed", on);
  };

  buttons.forEach((btn) => {
    const id = btn.dataset.favBtn;
    paint(btn, myFavIds.includes(id));
    btn.addEventListener("click", async (ev) => {
      ev.preventDefault();
      // addFavorite writes via setDoc on a deterministic doc id, and the
      // favorites collection's rules disallow "update" on an existing doc —
      // a fast double-tap before the first request finished used to fire a
      // second toggle whose write Firestore would reject. Guard against
      // that by ignoring clicks while one is already in flight.
      if (btn.dataset.favPending === "1") return;
      const current = lpFavIdentity();
      if (!current) {
        toast("יש להתחבר כמנוי כדי לשמור מועדפים");
        setTimeout(() => (location.href = "/login"), 900);
        return;
      }
      const nowFav = btn.classList.contains("saved");
      const next = !nowFav;
      paint(btn, next); // optimistic
      btn.dataset.favPending = "1";
      try {
        await window.LPData.toggleFavorite(current, id, next);
        toast(next ? "נוסף למועדפים" : "הוסר מהמועדפים");
      } catch (err) {
        paint(btn, nowFav); // revert
        toast(err?.message || "שגיאה בשמירת מועדף", "error");
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
