import { useId } from 'react';
import {
  handlePhoneChange,
  handleTelegramChange,
  inputErrorClass,
  shakeKey,
  shakeWrapClass,
} from './fieldHelpers';

function RegistrationInfoBanner({ info, t }) {
  if (!info) return null;

  const toneClass = info.isGold
    ? 'registration-info-gold'
    : info.isExpired
    ? 'registration-info-expired'
    : info.isExpiringSoon
    ? 'registration-info-expiring'
    : 'registration-info-active';

  return (
    <div className={toneClass}>
      {info.isGold ? (
        <div className="registration-info-content">
          <span className="registration-info-text">⭐</span>
          <span>{t('registration.goldUser')}</span>
        </div>
      ) : (
        <div>
          <div className="registration-info-title">
            {info.isExpired
              ? `⚠️ ${t('registration.expired')}`
              : info.isExpiringSoon
              ? `⚠️ ${t('registration.expiringSoon')}`
              : `✅ ${t('registration.registeredUser')}`}
          </div>
          <div>
            {info.isExpired
              ? `${t('registration.expiredDaysAgo')} ${Math.abs(info.daysRemaining)} ${t(
                  'registration.daysAgo'
                )}`
              : `${t('registration.daysRemaining')} ${info.daysRemaining} ${t(
                  'registration.daysUntilExpiry'
                )}`}
          </div>
          <div className="registration-info-details">
            {t('registration.expiryDate')}{' '}
            {info.expiryDate.toLocaleDateString('he-IL', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Picks the most specific error label to display under the phone input,
 * matching the original form's precedence rules.
 */
function resolvePhoneErrorLabel(phone, t) {
  if (phone.length === 0) return t('registration.phoneRequired');
  if (phone.length < 10) return t('registration.phoneError');
  if (!phone.startsWith('05')) return t('registration.phoneStartError');
  return t('registration.phoneRequired');
}

export default function SinglePersonFields({
  formData,
  setFormData,
  validationErrors,
  hasTriedSubmit,
  shakeTrigger,
  telegramError,
  setTelegramError,
  registrationInfo,
  t,
}) {
  const { fullName, phone, telegram } = formData;
  const fullNameId = useId();
  const phoneId = useId();
  const telegramId = useId();
  const fullNameErrorId = useId();
  const phoneErrorId = useId();
  const telegramErrorId = useId();

  const phoneError = hasTriedSubmit && validationErrors.phone
    ? resolvePhoneErrorLabel(phone, t)
    : (!hasTriedSubmit && phone.length > 0 && phone.length < 10
      ? t('registration.phoneError')
      : (!hasTriedSubmit && phone.length > 0 && !phone.startsWith('05') ? t('registration.phoneStartError') : ''));

  return (
    <>
      <div className="registration-form-field">
        <label htmlFor={fullNameId} className="registration-form-label">
          {`${t('registration.fullName')} *`}
        </label>
        <div
          key={shakeKey(validationErrors.fullName, shakeTrigger, hasTriedSubmit)}
          className={shakeWrapClass(validationErrors.fullName, hasTriedSubmit)}
        >
          <input
            id={fullNameId}
            required
            type="text"
            autoComplete="name"
            aria-invalid={hasTriedSubmit && !!validationErrors.fullName}
            aria-describedby={hasTriedSubmit && validationErrors.fullName ? fullNameErrorId : undefined}
            className={`registration-form-input ${inputErrorClass(
              validationErrors.fullName,
              hasTriedSubmit
            )}`}
            value={fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
          />
        </div>
        {hasTriedSubmit && validationErrors.fullName && (
          <p id={fullNameErrorId} className="registration-form-error">{t('registration.fullNameRequired')}</p>
        )}
      </div>

      <div className="registration-form-grid">
        <div className="registration-form-field">
          <label htmlFor={phoneId} className="registration-form-label">{`${t('registration.phone')} *`}</label>
          <div
            key={shakeKey(validationErrors.phone, shakeTrigger, hasTriedSubmit)}
            className={shakeWrapClass(validationErrors.phone, hasTriedSubmit)}
          >
            <input
              id={phoneId}
              required
              type="tel"
              autoComplete="tel"
              inputMode="numeric"
              aria-invalid={!!phoneError}
              aria-describedby={phoneError ? phoneErrorId : undefined}
              className={`registration-form-input ${inputErrorClass(
                validationErrors.phone,
                hasTriedSubmit,
                Boolean(telegramError)
              )}`}
              value={phone}
              onChange={(e) =>
                handlePhoneChange(e, (value) => setFormData({ ...formData, phone: value }))
              }
              placeholder="05XXXXXXXX"
              maxLength={10}
            />
          </div>

          {phoneError && (
            <p id={phoneErrorId} className="registration-form-error">{phoneError}</p>
          )}
          <RegistrationInfoBanner info={registrationInfo} t={t} />
        </div>

        <div className="registration-form-field">
          <label htmlFor={telegramId} className="registration-form-label">{t('registration.telegram')}</label>
          <input
            id={telegramId}
            type="text"
            aria-invalid={!!telegramError}
            aria-describedby={telegramError ? telegramErrorId : undefined}
            className={`registration-form-input ${inputErrorClass(false, false, Boolean(telegramError))}`}
            placeholder="@username"
            value={telegram}
            onChange={(e) =>
              handleTelegramChange(e, (value) => {
                setFormData({ ...formData, telegram: value });
                if (value) setTelegramError('');
              })
            }
            onBlur={(e) => {
              if (e.target.value.trim().replace(/@/g, '')) setTelegramError('');
            }}
          />
          {telegramError && <p id={telegramErrorId} className="registration-form-error">{telegramError}</p>}
        </div>
      </div>
    </>
  );
}
