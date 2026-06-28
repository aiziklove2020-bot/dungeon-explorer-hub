import { useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import SEO from '../components/SEO';
import { submitDeleteRequest } from '../firebase/deleteRequests';
import './DeleteAccount.css';

const DeleteAccount = () => {
  const { t } = useLanguage();
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState('idle'); // idle | submitting | success | error
  const [errorCode, setErrorCode] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleaned = (phone || '').replace(/\D/g, '');
    if (cleaned.length !== 10 || !cleaned.startsWith('05')) {
      setStatus('error');
      setErrorCode('invalid_phone');
      return;
    }
    setStatus('submitting');
    setErrorCode(null);
    const result = await submitDeleteRequest(cleaned);
    if (result.success) {
      setStatus('success');
      setPhone('');
    } else {
      setStatus('error');
      setErrorCode(result.error || 'request_failed');
    }
  };

  return (
    <div className="container delete-account-container">
      <SEO
        title="בקשת מחיקת חשבון | מדברים BDSM"
        description="בקשת מחיקת חשבון ומספר טלפון מהמערכת. Account deletion request – Talking BDSM."
        canonicalPath="/deleterequest"
        noindex
      />
      <div className="delete-account-header">
        <h1 className="delete-account-title logo-font">{t('deleteAccount.title')}</h1>
        <p className="delete-account-subtitle">{t('deleteAccount.subtitle')}</p>
      </div>

      <div className="glass-panel delete-account-main">
        <p className="delete-account-intro">{t('deleteAccount.intro')}</p>

        {status === 'success' && (
          <div className="delete-account-message delete-account-success" role="alert">
            {t('deleteAccount.success')}
          </div>
        )}
        {status === 'error' && (
          <div className="delete-account-message delete-account-error" role="alert">
            {t(errorCode === 'invalid_phone' ? 'deleteAccount.errorInvalidPhone' : 'deleteAccount.errorGeneric')}
          </div>
        )}

        <form onSubmit={handleSubmit} className="delete-account-form">
          <label htmlFor="delete-account-phone" className="delete-account-label">
            {t('deleteAccount.phoneLabel')}
          </label>
          <input
            id="delete-account-phone"
            type="tel"
            inputMode="numeric"
            placeholder={t('deleteAccount.phonePlaceholder')}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="delete-account-input"
            disabled={status === 'submitting'}
            dir="ltr"
            autoComplete="tel"
          />
          <p className="delete-account-hint">{t('deleteAccount.hint')}</p>
          <button
            type="submit"
            className="delete-account-submit"
            disabled={status === 'submitting'}
          >
            {status === 'submitting' ? t('deleteAccount.submitting') : t('deleteAccount.submit')}
          </button>
        </form>

        <p className="delete-account-note">{t('deleteAccount.note')}</p>
      </div>
    </div>
  );
};

export default DeleteAccount;
