// Memorial closure: from 7 Oct 2026 00:00 until 8 Oct 2026 06:00 (Israel time)
// the whole site shows only the memorial screen. Removes itself from the
// way automatically afterwards — no cleanup deploy needed.
(function () {
  var start = Date.parse('2026-10-06T21:00:00Z');
  var end = Date.parse('2026-10-08T03:00:00Z');
  var now = Date.now();
  if (now < start || now >= end) return;
  if (window.stop) window.stop(); // halt the original page first, then draw ours
  document.documentElement.setAttribute('lang', 'he');
  document.documentElement.setAttribute('dir', 'rtl');
  document.documentElement.innerHTML =
    '<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>לזכר הנרצחים</title>' +
    '<style>html,body{margin:0;height:100%;background:#000}body{display:flex;align-items:center;justify-content:center}img{max-width:100%;max-height:100vh;object-fit:contain}</style></head>' +
    '<body><img src="/assets/memorial-710.jpg" alt="מסיבות ליברליות מתייחדת עם זכר נרצחי ה-7.10. יהי זכרם ברוך"></body>';
})();

// Site closure switch: the "סגירת האתר" button in the admin panel sets
// settings/siteConfig.siteClosed (and an optional siteClosedText). While it is
// on, every public page shows only the closure screen; the admin panel and
// the API are not affected. Works at once, no deploy needed. The last answer
// is remembered so a closed site does not flash its pages while checking.
(function () {
  var KEY = 'lp_site_closed';
  var SRC = 'https://firestore.googleapis.com/v1/projects/tbdsm-5acca/databases/(default)/documents/settings/siteConfig'
    + '?mask.fieldPaths=siteClosed&mask.fieldPaths=siteClosedText';
  var root = document.documentElement;
  var known = null;
  try { known = localStorage.getItem(KEY); } catch (e) {}
  if (known) root.style.visibility = 'hidden';

  function remember(v) { try { v ? localStorage.setItem(KEY, v) : localStorage.removeItem(KEY); } catch (e) {} }
  function reveal() { root.style.visibility = ''; }
  function close(text) {
    if (window.stop) window.stop();
    root.setAttribute('lang', 'he');
    root.setAttribute('dir', 'rtl');
    root.innerHTML =
      '<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>האתר סגור | LIBRAL PARTY</title>' +
      '<style>html,body{margin:0;min-height:100%;background:radial-gradient(ellipse at 50% 0,#4a1230,#100910 70%);color:#f4f1eb;font:16px/1.7 Rubik,Arial,sans-serif}' +
      'main{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box}' +
      '.card{width:min(460px,100%);text-align:center;background:#1c1120f2;border:1px solid #ff5aa055;border-radius:20px;padding:32px 22px;box-shadow:0 20px 60px #000a}' +
      'h1{font-size:30px;margin:12px 0 10px}p{color:#e9d7e2;margin:0;white-space:pre-line}</style></head>' +
      '<body><main><div class="card"><img src="/assets/design/couples-logo-128.png" width="90" height="90" alt="LIBRAL PARTY"><h1>האתר סגור כרגע</h1><p></p></div></main></body>';
    var p = root.querySelector('p');
    if (p) p.textContent = text || '';
    reveal();
  }

  var ctrl = window.AbortController ? new AbortController() : null;
  var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 5000);
  fetch(SRC, { cache: 'no-store', signal: ctrl ? ctrl.signal : undefined })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (d) {
      var f = (d && d.fields) || {};
      var closed = !!(f.siteClosed && f.siteClosed.booleanValue);
      var text = (f.siteClosedText && f.siteClosedText.stringValue) || '';
      remember(closed ? (text || ' ') : null);
      if (closed) close(text.trim());
      else reveal();
    })
    .catch(function () {
      // No answer: keep the last known state.
      if (known) close(known.trim());
      else reveal();
    })
    .then(function () { clearTimeout(timer); });
})();
