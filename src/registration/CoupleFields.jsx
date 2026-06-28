import { useId } from 'react';
import {
  handlePhoneChange,
  handleTelegramChange,
  inputErrorClass,
  shakeKey,
  shakeWrapClass,
} from './fieldHelpers';

function CouplePartnerFields({
  title,
  formData,
  setFormData,
  keys,
  validationErrors,
  hasTriedSubmit,
  shakeTrigger,
  t,
}) {
  const nameKey = keys.name;
  const phoneKey = keys.phone;
  const telegramKey = keys.telegram;
  const nameId = useId();
  const phoneId = useId();
  const telegramId = useId();
  const nameErrorId = useId();
  const phoneErrorId = useId();

  return (
    <>
      <h3 className="registration-form-section-title">{title}</h3>

      <div className="registration-form-field">
        <label htmlFor={nameId} className="registration-form-label">{`${t('registration.fullName')} *`}</label>
        <div
          key={shakeKey(validationErrors[nameKey], shakeTrigger, hasTriedSubmit)}
          className={shakeWrapClass(validationErrors[nameKey], hasTriedSubmit)}
        >
          <input
            id={nameId}
            required
            type="text"
            autoComplete="name"
            aria-invalid={hasTriedSubmit && !!validationErrors[nameKey]}
            aria-describedby={hasTriedSubmit && validationErrors[nameKey] ? nameErrorId : undefined}
            className={`registration-form-input ${inputErrorClass(
              validationErrors[nameKey],
              hasTriedSubmit
            )}`}
            value={formData[nameKey]}
            onChange={(e) => setFormData({ ...formData, [nameKey]: e.target.value })}
          />
        </div>
        {hasTriedSubmit && validationErrors[nameKey] && (
          <p id={nameErrorId} className="registration-form-error">{t('registration.fullNameRequired')}</p>
        )}
      </div>

      <div className="registration-form-field">
        <label htmlFor={phoneId} className="registration-form-label">{`${t('registration.phone')} *`}</label>
        <div
          key={shakeKey(validationErrors[phoneKey], shakeTrigger, hasTriedSubmit)}
          className={shakeWrapClass(validationErrors[phoneKey], hasTriedSubmit)}
        >
          <input
            id={phoneId}
            required
            type="tel"
            autoComplete="tel"
            inputMode="numeric"
            aria-invalid={hasTriedSubmit && !!validationErrors[phoneKey]}
            aria-describedby={hasTriedSubmit && validationErrors[phoneKey] ? phoneErrorId : undefined}
            className={`registration-form-input ${inputErrorClass(
              validationErrors[phoneKey],
              hasTriedSubmit
            )}`}
            value={formData[phoneKey]}
            onChange={(e) =>
              handlePhoneChange(e, (value) => setFormData({ ...formData, [phoneKey]: value }))
            }
            placeholder="05XXXXXXXX"
            maxLength={10}
          />
        </div>
        {hasTriedSubmit && validationErrors[phoneKey] && (
          <p id={phoneErrorId} className="registration-form-error">{t('registration.phoneRequired')}</p>
        )}
      </div>

      <div className="registration-form-field">
        <label htmlFor={telegramId} className="registration-form-label">{t('registration.telegram')}</label>
        <input
          id={telegramId}
          type="text"
          className="registration-form-input"
          value={formData[telegramKey]}
          onChange={(e) =>
            handleTelegramChange(e, (value) => setFormData({ ...formData, [telegramKey]: value }))
          }
          placeholder="@username"
        />
      </div>
    </>
  );
}

export default function CoupleFields({
  formData,
  setFormData,
  validationErrors,
  hasTriedSubmit,
  shakeTrigger,
  telegramError,
  coupleOneRegisteredInfo,
  t,
}) {
  return (
    <div className="registration-form-couple-fields">
      {hasTriedSubmit && validationErrors.coupleSamePhone && (
        <p className="registration-form-error registration-form-error--couple" role="alert">
          {t('registration.coupleSamePhone')}
        </p>
      )}
      {coupleOneRegisteredInfo && (
        <p className="registration-form-info registration-form-info--couple" role="status">
          {coupleOneRegisteredInfo}
        </p>
      )}
      {telegramError && (
        <p className="registration-form-error registration-form-error--couple" role="alert">
          {telegramError}
        </p>
      )}

      <CouplePartnerFields
        title={t('registration.maleDetails') || 'פרטי הגבר'}
        formData={formData}
        setFormData={setFormData}
        keys={{ name: 'maleName', phone: 'malePhone', telegram: 'maleTelegram' }}
        validationErrors={validationErrors}
        hasTriedSubmit={hasTriedSubmit}
        shakeTrigger={shakeTrigger}
        t={t}
      />
      <CouplePartnerFields
        title={t('registration.femaleDetails') || 'פרטי האישה'}
        formData={formData}
        setFormData={setFormData}
        keys={{ name: 'femaleName', phone: 'femalePhone', telegram: 'femaleTelegram' }}
        validationErrors={validationErrors}
        hasTriedSubmit={hasTriedSubmit}
        shakeTrigger={shakeTrigger}
        t={t}
      />
    </div>
  );
}
