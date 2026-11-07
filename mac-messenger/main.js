const { app, BrowserWindow, Menu, shell, session } = require('electron');
const path = require('path');

// Modern Chrome UA so WhatsApp Web / Messenger accept the embedded browser.
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    titleBarStyle: 'hiddenInset',
    webPreferences: { webviewTag: true, contextIsolation: false, nodeIntegration: true },
  });
  win.loadFile(path.join(__dirname, 'index.html'));

  // Cmd+1/2/3 switches tabs.
  const send = (i) => win.webContents.executeJavaScript(`window.selectTab(${i})`);
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      { role: 'appMenu' },
      {
        label: 'Chats',
        submenu: [
          { label: 'WhatsApp 1', accelerator: 'CmdOrCtrl+1', click: () => send(0) },
          { label: 'WhatsApp 2', accelerator: 'CmdOrCtrl+2', click: () => send(1) },
          { label: 'Messenger', accelerator: 'CmdOrCtrl+3', click: () => send(2) },
          { type: 'separator' },
          { role: 'reload' },
        ],
      },
      { role: 'editMenu' },
      { role: 'windowMenu' },
    ])
  );
}

app.whenReady().then(() => {
  for (const p of ['persist:wa1', 'persist:wa2', 'persist:messenger']) {
    const s = session.fromPartition(p);
    s.setUserAgent(UA);
    s.setPermissionRequestHandler((_wc, perm, cb) =>
      cb(['notifications', 'media', 'clipboard-read', 'clipboard-sanitized-write'].includes(perm))
    );
  }
  createWindow();
  app.on('activate', () => BrowserWindow.getAllWindows().length || createWindow());
});

// Open external links in the default browser.
app.on('web-contents-created', (_e, wc) => {
  wc.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
});

app.on('window-all-closed', () => process.platform === 'darwin' || app.quit());
