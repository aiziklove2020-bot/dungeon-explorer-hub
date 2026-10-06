const { chromium } = require('playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  for (const w of [390,1280]) {
    const pg=await b.newPage({viewport:{width:w,height:900}});
    const ev=Array.from({length:7},(_,i)=>({id:'e'+i,title:'מסיבה '+i,day:'שבת',date:'1.1',dateISO:'2026-11-0'+(i+1),time:'22:00',category:'חילופי זוגות',city:'ת"א',img:'',desc:'x',type:'מסיבה',partyType:'internal'}));
    await pg.route('**/site-data.js*', r=>r.fulfill({contentType:'text/javascript',body:'window.LPData={loadSocialLinks:async()=>[],loadEvents:async()=>'+JSON.stringify(ev)+'};'}));
    await pg.goto('http://localhost:8940/index.html'); await pg.waitForTimeout(1000);
    const seq=await pg.evaluate(()=>[...document.querySelectorAll('#event-grid > *')].map(e=>e.className.includes('insta')?'IG':e.id==='whatsapp-party-group'||e.className.includes('whatsapp')?'WA':e.querySelector&&e.querySelector('a[href*="facebook"]')?'FB':'card'));
    console.log(w,seq.join(','), await pg.evaluate('document.documentElement.scrollWidth'));
    await pg.close();
  }
  await b.close();
})();
