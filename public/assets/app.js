
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

  // Experimental animated starfield background — remove the block below to disable.
  (() => {
    const field = document.createElement("div");
    field.id = "starfield";
    field.style.cssText = "position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden";
    const N = 70;
    let stars = "";
    for (let i = 0; i < N; i++) {
      const x = Math.random() * 100, y = Math.random() * 100;
      const size = Math.random() * 2 + 1;
      const delay = Math.random() * 4;
      const dur = Math.random() * 3 + 2;
      stars += `<span style="position:absolute;left:${x}%;top:${y}%;width:${size}px;height:${size}px;border-radius:50%;background:#fff;opacity:.6;animation:starTwinkle ${dur}s ease-in-out ${delay}s infinite"></span>`;
    }
    field.innerHTML = stars;
    document.body.prepend(field);
    document.body.style.position = "relative";
  })();
  const menuBtn=document.querySelector("[data-menu]"), drawer=document.querySelector(".drawer"), scrim=document.querySelector(".scrim");
  const close=()=>{drawer?.classList.remove("open");scrim?.classList.remove("show")}
  menuBtn?.addEventListener("click",()=>{drawer.classList.add("open");scrim.classList.add("show")});
  document.querySelector("[data-close]")?.addEventListener("click",close); scrim?.addEventListener("click",close);
  drawer?.querySelectorAll("a").forEach(a=>a.addEventListener("click",close));

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

  // Logout lives inside the drawer (a scrollable list) instead of the fixed
  // header, so the header's icon cluster never grows/shifts when a user logs
  // in — every header icon keeps the same spot on every page.
  if (c && drawer && !drawer.querySelector("[data-logout]")) {
    const nav = drawer.querySelector("nav");
    if (nav) {
      const logoutLink = document.createElement("a");
      logoutLink.href = "#";
      logoutLink.setAttribute("data-logout", "1");
      logoutLink.innerHTML = '<span class="dr-ic-wrap"><span class="material-symbols-outlined dr-ic">logout</span></span><span class="dr-tx">התנתקות</span>';
      logoutLink.addEventListener("click", e => {
        e.preventDefault();
        close();
        localStorage.removeItem("lp_current");
        toast("התנתקת בהצלחה");
        setTimeout(() => location.href = "index.html", 500);
      });
      nav.appendChild(logoutLink);
    }
  }

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
  const iconOf = (btn) => btn.querySelector(".material-symbols-outlined") || btn;

  // Favorites are a subscriber-only feature — a forum login alone isn't
  // enough (see toggleFavorite in site-bridge.ts). Hide the hearts entirely
  // for anyone who isn't an active subscriber, rather than showing them a
  // button that will just error out on click.
  let isSubscriber = false;
  if (identity && window.LPData?.loadMyForumPersonalArea) {
    const area = await window.LPData.loadMyForumPersonalArea(identity).catch(() => null);
    isSubscriber = !!area?.profile?.hasActiveSubscription;
  }
  if (!isSubscriber) {
    buttons.forEach((btn) => { btn.style.display = "none"; });
    return;
  }

  let myFavIds = [];
  if (identity && window.LPData?.loadMyFavorites) {
    myFavIds = await window.LPData.loadMyFavorites(identity).catch(() => []);
  }
  buttons.forEach((btn) => {
    const id = btn.dataset.favBtn;
    const icon = iconOf(btn);
    icon.textContent = myFavIds.includes(id) ? "favorite" : "favorite_border";
    btn.addEventListener("click", async (ev) => {
      ev.preventDefault();
      const current = lpFavIdentity();
      if (!current) {
        toast("יש להתחבר כמנוי כדי לשמור מועדפים");
        setTimeout(() => (location.href = "/login"), 900);
        return;
      }
      const nowFav = icon.textContent === "favorite";
      const next = !nowFav;
      icon.textContent = next ? "favorite" : "favorite_border"; // optimistic
      try {
        await window.LPData.toggleFavorite(current, id, next);
        toast(next ? "נוסף למועדפים" : "הוסר מהמועדפים");
      } catch (err) {
        icon.textContent = nowFav ? "favorite" : "favorite_border"; // revert
        toast(err?.message || "שגיאה בשמירת מועדף", "error");
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
