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
