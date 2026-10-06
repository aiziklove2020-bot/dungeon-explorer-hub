const { chromium } = require('playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const ctx=await b.newContext({viewport:{width:430,height:932},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const pg=await ctx.newPage();
  const ev=Array.from({length:5},(_,i)=>({id:'p'+i,title:'מסיבה '+i,day:'שלישי',date:'06.10.2026',dateISO:'2026-10-06',time:'22',category:'ליין',city:'פ"ת',img:'assets/design/pool.webp',desc:'x',type:'מסיבה',partyType:'internal',producerId:'P'}));
  await pg.route('**/site-data.js*', r=>r.fulfill({contentType:'text/javascript',body:`window.LPData={loadSocialLinks:async()=>[],loadEvents:async()=>${JSON.stringify(ev)},loadMyForumPersonalArea:async()=>({profile:{isPrivilegedSubscriber:true}}),loadMyFavorites:async()=>[],toggleFavorite:async()=>{window.__fav=(window.__fav||0)+1}};`}));
  await pg.goto('http://localhost:8940/index.html');
  await pg.evaluate(()=>{ LP.setCurrent({id:'u1',name:'x',role:'member'}); });
  await pg.reload(); await pg.waitForTimeout(1500);
  await pg.click('#lpCookieBanner button').catch(()=>{});
  const h=(await pg.$$('[data-fav-btn]'))[0]; await h.scrollIntoViewIfNeeded(); await pg.waitForTimeout(300);
  await h.tap(); await pg.waitForTimeout(500);
  console.log('fav calls',await pg.evaluate(()=>window.__fav), await h.textContent());
  await pg.screenshot({path:'/tmp/h3.png'});
  await b.close();
})();
