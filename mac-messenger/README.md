# Mac Messenger

One Mac window with two separate WhatsApp accounts and Facebook Messenger.
Each account has its own isolated session, so logins persist and never mix.
It loads the official web clients (no unofficial APIs).

## Run
```bash
cd mac-messenger && npm install && npm start
```
Scan the QR code in WA 1 and WA 2 (WhatsApp → Linked devices), and log in to Messenger.
Shortcuts: Cmd+1 / Cmd+2 / Cmd+3.

## Build a .dmg
```bash
npm run dist
```
