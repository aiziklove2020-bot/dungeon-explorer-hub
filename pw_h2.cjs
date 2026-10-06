const { chromium } = require('playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const ctx=await b.newContext({viewport:{width:430,height:932},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const pg=await ctx.newPage();
  const ev=Array.from({length:5},(_,i)=>({id:'p'+i,title:'מסיבה '+i,day:'שלישי',date:'06.10.2026',dateISO:'2026-10-06',time:'22',category:'ליין',city:'פ"ת',img:'assets/design/pool.webp',desc:'x',type:'מסיבה',partyType:'internal',producerId:'P'}));
  await pg.route('**/site-data.js*', r=>r.fulfill({contentType:'text/javascript',body:`window.LPData={loadSocialLinks:async()=>[],loadEvents:async()=>${JSON.stringify(ev)},loadMyForumPersonalArea:async()=>({profile:{isPrivilegedSubscriber:true}}),loadMyFavorites:async()=>[],toggleFavorite:async()=>{window.__fav=(window.__fav||0)+1}};`}));
  await pg.goto('http://localhost:8940/index.html');
  await pg.evaluate(()=>{ try{ LP.setCurrent({id:'u1',name:'x',role:'member'}); }catch(e){ localStorage.setItem('lp_session',JSON.stringify({id:'u1',role:'member'})) } });
  await pg.reload(); await pg.waitForTimeout(1500);
  const hearts=await pg.$$('[data-fav-btn]'); console.log('hearts',hearts.length);
  for (const h of hearts.slice(0,5)) {
    await h.scrollIntoViewIfNeeded(); const r=await h.boundingBox();
    const top=await pg.evaluate(([x,y])=>{const e=document.elementFromPoint(x,y);return e?e.tagName+'#'+e.id+'.'+String(e.className).slice(0,40):null},[r.x+r.width/2,r.y+r.height/2]);
    console.log(Math.round(r.x),Math.round(r.y),'top=',top);
  }
  await b.close();
})();
