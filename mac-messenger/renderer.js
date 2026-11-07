const ACCOUNTS = [
  { name: 'WA 1', url: 'https://web.whatsapp.com/', partition: 'persist:wa1', color: '#25d366' },
  { name: 'WA 2', url: 'https://web.whatsapp.com/', partition: 'persist:wa2', color: '#128c7e' },
  { name: 'Msgr', url: 'https://www.messenger.com/', partition: 'persist:messenger', color: '#0084ff' },
];
const tabs = document.getElementById('tabs');
const views = document.getElementById('views');
const items = ACCOUNTS.map((a, i) => {
  const btn = document.createElement('button');
  btn.className = 'tab';
  btn.style.background = a.color;
  btn.innerHTML = `${a.name}<span class="badge"></span>`;
  btn.onclick = () => selectTab(i);
  tabs.appendChild(btn);

  const wv = document.createElement('webview');
  wv.setAttribute('partition', a.partition); // separate login/cookies per account
  wv.setAttribute('allowpopups', '');
  wv.setAttribute('webpreferences', 'contextIsolation=no');
  wv.setAttribute('preload', new URL('webview-preload.js', location.href).href);
  wv.src = a.url;
  // Unread count comes from the page title, e.g. "(3) WhatsApp".
  wv.addEventListener('page-title-updated', (e) => {
    const m = e.title.match(/\((\d+)\)/);
    btn.querySelector('.badge').textContent = m ? m[1] : '';
  });
  views.appendChild(wv);
  return { btn, wv };
});
window.selectTab = (i) =>
  items.forEach((it, j) => {
    it.btn.classList.toggle('active', i === j);
    it.wv.classList.toggle('active', i === j);
  });
selectTab(0);
