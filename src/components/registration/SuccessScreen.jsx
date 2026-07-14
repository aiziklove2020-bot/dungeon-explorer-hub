import { CheckCircle2 } from 'lucide-react';

export default function SuccessScreen({ onClose, t }) {
  return (
    <div className="registration-success-container">
      <div className="registration-success-icon-container">
        <CheckCircle2 size={40} className="registration-success-icon" />
      </div>
      <h2 className="registration-success-title">{t('registration.successTitle')}</h2>
      <p className="registration-success-text">{t('registration.successText')}</p>
      <button onClick={onClose} className="registration-success-back-btn">
        {t('registration.backHome')}
      </button>
    </div>
  );
}
