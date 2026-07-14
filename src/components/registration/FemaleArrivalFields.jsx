import { MapPin, Navigation as NavigationIcon } from 'lucide-react';
import { inputErrorClass, shakeKey, shakeWrapClass } from './fieldHelpers';

export default function FemaleArrivalFields({
  formData,
  setFormData,
  validationErrors,
  hasTriedSubmit,
  shakeTrigger,
  t,
}) {
  const { arrivalMethod, pickupAddress } = formData;
  const showPickup = arrivalMethod === 'pickup';

  return (
    <div className="registration-arrival-section">
      <label className="registration-arrival-label">{t('registration.arrivalMethod')}</label>
      <div className="registration-arrival-buttons">
        <button
          type="button"
          onClick={() =>
            setFormData({ ...formData, arrivalMethod: 'independent', pickupAddress: '' })
          }
          className={`registration-arrival-btn ${
            arrivalMethod === 'independent'
              ? 'registration-arrival-btn-independent'
              : 'registration-arrival-btn-inactive'
          }`}
        >
          <NavigationIcon size={14} />
          {t('registration.independent')}
        </button>
        <button
          type="button"
          onClick={() => setFormData({ ...formData, arrivalMethod: 'pickup' })}
          className={`registration-arrival-btn ${
            arrivalMethod === 'pickup'
              ? 'registration-arrival-btn-pickup'
              : 'registration-arrival-btn-inactive'
          }`}
        >
          <MapPin size={14} />
          {t('registration.pickup')}
        </button>
      </div>

      {showPickup && (
        <div className="registration-form-field">
          <div
            key={shakeKey(validationErrors.pickupAddress, shakeTrigger, hasTriedSubmit)}
            className={shakeWrapClass(validationErrors.pickupAddress, hasTriedSubmit)}
          >
            <input
              required
              placeholder={t('registration.pickupCity')}
              className={`registration-pickup-input ${inputErrorClass(
                validationErrors.pickupAddress,
                hasTriedSubmit
              )}`}
              value={pickupAddress}
              onChange={(e) => setFormData({ ...formData, pickupAddress: e.target.value })}
            />
          </div>
          {hasTriedSubmit && validationErrors.pickupAddress && (
            <p className="registration-form-error">{t('registration.pickupAddressRequired')}</p>
          )}
        </div>
      )}
    </div>
  );
}
