
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
    el.href = c?.role==="advertiser" ? "/advertiser-dashboard" : c?.role==="admin" ? "/admin" : "/profile";
    if (!c) return;
    const displayName = c.businessName || c.name || "מחובר/ת";
    const label = el.querySelector("small");
    if (label) label.textContent = displayName;
    el.title = "מחובר/ת בתור " + displayName;
    el.classList.add("connected");
    if (!el.nextElementSibling?.hasAttribute("data-logout")) {
      const logoutBtn = document.createElement("button");
      logoutBtn.type = "button";
      logoutBtn.setAttribute("data-logout", "1");
      logoutBtn.title = "התנתקות";
      logoutBtn.className = "logout-btn";
      logoutBtn.textContent = "⏻";
      logoutBtn.addEventListener("click", e => {
        e.preventDefault();
        localStorage.removeItem("lp_current");
        toast("התנתקת בהצלחה");
        setTimeout(() => location.href = "index.html", 500);
      });
      el.insertAdjacentElement("afterend", logoutBtn);
    }
  });

  document.querySelectorAll("[data-fav]").forEach(btn=>{
    let id=Number(btn.dataset.fav), favs=LP.favorites();
    btn.textContent=favs.includes(id)?"♥":"♡";
    btn.addEventListener("click",()=>{
      let fs=LP.favorites(); fs=fs.includes(id)?fs.filter(x=>x!==id):[...fs,id]; LP.setFavorites(fs);
      btn.textContent=fs.includes(id)?"♥":"♡"; toast(fs.includes(id)?"נוסף למועדפים":"הוסר מהמועדפים");
    });
  });
});
