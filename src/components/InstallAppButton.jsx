import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import './InstallAppButton.css';

const APK_URL = '/TBDSM.apk';

function getIsStandalone() {
  if (typeof window === 'undefined') return true;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

function getIsAndroidMobile() {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || navigator.vendor || '';
  return /Android/i.test(ua) && /Mobile/i.test(ua);
}

function getIsIOS() {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export default function InstallAppButton() {
  const { t } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [showApkButton, setShowApkButton] = useState(false);
  const [showIosPwaButton, setShowIosPwaButton] = useState(false);

  useEffect(() => {
    if (getIsStandalone()) return;

    if (getIsAndroidMobile()) {
      setShowApkButton(true);
      return;
    }

    if (getIsIOS()) {
      setShowIosPwaButton(true);
      return;
    }

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handlePwaClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setVisible(false);
  };

  if (showApkButton) {
    return (
      <a
        href={APK_URL}
        download="TBDSM.apk"
        className="install-app-btn"
        aria-label={t('pwa.installButton')}
      >
        <Download size={14} />
        <span>{t('pwa.installButton')}</span>
      </a>
    );
  }

  if (showIosPwaButton) {
    return (
      <div className="install-app-ios">
        <span className="install-app-btn install-app-ios-label">
          <Download size={14} />
          <span>{t('pwa.installButton')}</span>
        </span>
        <p className="install-app-ios-hint">{t('pwa.iosInstructions')}</p>
      </div>
    );
  }

  if (!visible || !deferredPrompt) return null;

  return (
    <button
      type="button"
      className="install-app-btn"
      onClick={handlePwaClick}
      aria-label={t('pwa.installButton')}
    >
      <Download size={14} />
      <span>{t('pwa.installButton')}</span>
    </button>
  );
}
