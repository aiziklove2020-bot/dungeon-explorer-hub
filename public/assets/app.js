
function escapeHtml(str){
  if(str === null || str === undefined) return "";
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}
window.escapeHtml = escapeHtml;

// Registration is by WhatsApp only, with Avi. A party's own WhatsApp number
// wins; otherwise the site's number.
const LP_WHATSAPP_NUMBER = "0559364370";
function lpWhatsappHref(number, text) {
  const digits = String(number || LP_WHATSAPP_NUMBER).replace(/\D/g, "").replace(/^0/, "972");
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
function lpRegisterLink(e) {
  return { href: lpWhatsappHref(e.whatsappNumber, `היי, אני רוצה להירשם למסיבה: ${e.title || ""}`), label: "הרשמה בוואטסאפ" };
}
window.lpWhatsappHref = lpWhatsappHref;
window.lpRegisterLink = lpRegisterLink;

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
});

/**
 * Mobile push notifications (new parties) — works while the
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

// A visitor's "identity" for push purposes: a stable per-browser anonymous id.
// Firestore's pushSubscriptions rules only require a short non-empty string in
// the "phone" field (max 20 chars), and the "new party" broadcast reaches
// everyone who opted in.
function lpPushIdentity() {
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
    <span>האתר משתמש בעוגיות הכרחיות לתפקודו. פרטים ב<a href="/privacy" style="color:#ff9fc3;text-decoration:underline">מדיניות הפרטיות</a>. </span>
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

// Entry page: every visitor confirms phone notifications (new parties, balance matches) before using
// the site. The button asks the browser for permission; where the browser cannot grant it (iPhone outside
// "Add to Home Screen", a browser without push, or a visitor who blocked it before) we explain how, and
// the visitor still enters after pressing it. Search-engine crawlers are never shown the gate.
function lpPushGateDone() {
  try { return localStorage.getItem("lp_push_gate_done") === "1"; } catch { return false; }
}
function lpWirePushGate() {
  if (/bot|crawl|spider|slurp|lighthouse|headless/i.test(navigator.userAgent || "")) return;
  if (lpPushGateDone()) return;
  if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    try { localStorage.setItem("lp_push_gate_done", "1"); } catch {}
    return;
  }
  const el = document.createElement("div");
  el.id = "lpPushGate";
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-modal", "true");
  el.setAttribute("aria-labelledby", "lpPushGateTitle");
  el.innerHTML = `
    <div class="lp-gate-card">
      <img src="/assets/design/couples-logo-128.png" width="84" height="84" alt="">
      <h1 id="lpPushGateTitle">רגע לפני שנכנסים</h1>
      <p>האתר שולח התראות לנייד על <b>מסיבות חדשות</b>. כדי להיכנס, מאשרים התראות.</p>
      <button type="button" class="btn gold full" id="lpPushGateBtn">אישור התראות וכניסה לאתר</button>
      <p class="lp-gate-note" id="lpPushGateNote" hidden></p>
      <button type="button" class="btn full" id="lpPushGateGo" hidden>כניסה לאתר</button>
    </div>`;
  el.style.cssText = "position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:16px;background:radial-gradient(ellipse at 50% 0,#4a1230,#100910 70%);overflow:auto";
  document.body.appendChild(el);
  document.documentElement.style.overflow = "hidden";
  const finish = () => {
    try { localStorage.setItem("lp_push_gate_done", "1"); } catch {}
    document.documentElement.style.overflow = "";
    el.remove();
  };
  const note = el.querySelector("#lpPushGateNote");
  const go = el.querySelector("#lpPushGateGo");
  go.addEventListener("click", finish);
  el.querySelector("#lpPushGateBtn").addEventListener("click", async (ev) => {
    const btn = ev.currentTarget;
    btn.disabled = true;
    btn.textContent = "רגע...";
    // Some browsers (Edge, Chrome with "quieter messaging") show no popup: the request waits silently
    // behind a bell icon in the address bar. Never wait forever; after 8 seconds explain and let them in.
    const pending = lpEnablePushNotifications(lpPushIdentity());
    const result = await Promise.race([pending, new Promise((r) => setTimeout(() => r("timeout"), 8000))]);
    // If they approve through the bell afterwards, close the page by itself.
    if (result === "timeout") pending.then((r) => { if (r === "ok" && el.isConnected) { toast("התראות הופעלו ✅"); finish(); } });
    if (result === "ok") { toast("התראות הופעלו ✅"); finish(); return; }
    btn.hidden = true;
    note.hidden = false;
    go.hidden = false;
    note.textContent = result === "timeout"
      ? "הדפדפן מחכה לאישור שלכם: לחצו על סמל הפעמון או המנעול ליד שורת הכתובת ובחרו \"אפשר\". אפשר גם להיכנס עכשיו ולאשר אחר כך."
      : result === "ios-not-installed"
      ? "באייפון מאשרים התראות רק מהאתר שבמסך הבית: לוחצים על כפתור השיתוף, בוחרים \"הוסף למסך הבית\", פותחים את האתר משם ומאשרים."
      : result === "denied"
        ? "ההתראות חסומות בדפדפן. כדי לקבל עדכונים, מאשרים אותן בהגדרות האתר בדפדפן (סמל המנעול ליד הכתובת)."
        : "הדפדפן הזה לא תומך בהתראות. מומלץ להיכנס מ-Chrome או מהאפליקציה שלנו.";
  });
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", lpWirePushGate);
else lpWirePushGate();

// Site-wide "enable notifications" banner: the same opt-in on every page,
// for every visitor. It should keep greeting
// someone who hasn't actually decided yet, so closing it with the × only
// hides it for this page view — it comes back on the next visit. Once a real
// decision exists (granted or denied, tracked natively by the browser via
// Notification.permission, not our own storage) the "!== 'default'" check
// below is what stops it from ever showing again — no separate "dismissed"
// flag needed, and none is set here.
function lpWirePushBanner() {
  if (document.getElementById("lpPushGate")) return; // the entry page already asks
  // One banner at a time: the cookie notice comes first, this one follows once it is answered.
  if (!lpCookieDecided()) { document.addEventListener("lp-cookie-decided", lpWirePushBanner, { once: true }); return; }
  if (lpIsIosNotInstalled()) return; // can't work here at all; nothing to offer
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
  if (typeof Notification === "undefined" || Notification.permission !== "default") return;

  const el = document.createElement("div");
  el.id = "lpPushBanner";
  el.setAttribute("role", "status");
  el.innerHTML = `
    <span>רוצים לקבל התראות לנייד על מסיבות חדשות? מי שלא יאשר לא יקבל אותן. </span>
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

