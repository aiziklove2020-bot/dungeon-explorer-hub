// Embedded Electron can't complete passkey (WebAuthn) prompts, so hide them.
// Facebook then falls back to a code / phone approval.
try {
  Object.defineProperty(window, 'PublicKeyCredential', { value: undefined, configurable: true });
  if (navigator.credentials) {
    const deny = () => Promise.reject(new DOMException('Not supported', 'NotAllowedError'));
    navigator.credentials.get = deny;
    navigator.credentials.create = deny;
  }
} catch (e) {}
