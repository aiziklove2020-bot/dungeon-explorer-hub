import { useEffect, useState } from 'react';
import { ChevronLeft, Send } from 'lucide-react';
import { useContent } from '../context/ContentContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useSiteAuth } from '../context/AuthContext';
import Loader from './Loader';
import './RegistrationForm.css';

import {
  createInitialFormData,
  isCoupleRegType,
  isFemaleRegType,
  resetFormForType,
} from './registration/formTypes';
import { getValidationErrors, isFormValid } from './registration/validation';
import { useActiveParties } from './registration/useActiveParties';
import { usePhoneLookup } from './registration/usePhoneLookup';
import { useCoupleOneRegistered } from './registration/useCoupleOneRegistered';
import { useSubmitRegistration } from './registration/useSubmitRegistration';
import TypePicker from './registration/TypePicker';
import SuccessScreen from './registration/SuccessScreen';
import SinglePersonFields from './registration/SinglePersonFields';
import CoupleFields from './registration/CoupleFields';
import FemaleArrivalFields from './registration/FemaleArrivalFields';
import PartyPicker from './registration/PartyPicker';

/**
 * Normalizes `siteUser.telegramUsername` into the value the form stores
 * (no leading '@'), so auto-fill matches what the user would type.
 */
function stripTelegramAt(value) {
  if (!value) return '';
  return value.startsWith('@') ? value.slice(1) : value;
}

/**
 * Applies the logged-in site user's profile onto the current form state.
 * Respects the selected regType (couple auto-fill targets male or female
 * partner based on `siteUser.gender`).
 */
function applyAutoFill(prev, siteUser) {
  const next = { ...prev };
  const tg = stripTelegramAt(siteUser.telegramUsername);

  if (isCoupleRegType(prev.regType)) {
    if (siteUser.gender === 'male') {
      next.maleName = siteUser.name || next.maleName;
      next.malePhone = siteUser.phoneNumber || next.malePhone;
      next.maleTelegram = tg || next.maleTelegram;
    } else {
      next.femaleName = siteUser.name || next.femaleName;
      next.femalePhone = siteUser.phoneNumber || next.femalePhone;
      next.femaleTelegram = tg || next.femaleTelegram;
    }
  } else {
    next.fullName = siteUser.name || next.fullName;
    next.phone = siteUser.phoneNumber || next.phone;
    next.telegram = tg || next.telegram;
  }
  return next;
}

const RegistrationForm = ({ onCancel, partyId }) => {
  const { content, saveRegistration } = useContent();
  const { t } = useLanguage();
  const { siteUser } = useSiteAuth();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(() => createInitialFormData(partyId));
  const [hasTriedSubmit, setHasTriedSubmit] = useState(false);
  const [shakeTrigger, setShakeTrigger] = useState(0);

  const { activeParties, loadingParties } = useActiveParties();

  // Pre-select a party when the URL pre-binds one and it's still in the future.
  useEffect(() => {
    if (!partyId) return;
    if (!activeParties.some((p) => p.id === partyId)) return;
    setFormData((prev) =>
      prev.selectedParties.includes(partyId)
        ? prev
        : { ...prev, selectedParties: [partyId] }
    );
  }, [partyId, activeParties]);

  // Auto-fill from the logged-in user when moving to step 2.
  useEffect(() => {
    if (!siteUser || step !== 2) return;
    setFormData((prev) => applyAutoFill(prev, siteUser));
  }, [siteUser, step, formData.regType]);

  const selectedParty = activeParties.find(p => p.id === formData.selectedParties[0]);
  const partyType = selectedParty?.partyType || 'internal';
  const registrationInfo = usePhoneLookup(formData.phone, partyType);
  const coupleOneRegisteredInfo = useCoupleOneRegistered({ formData, activeParties, t });

  const { loading, telegramError, setTelegramError, submit } = useSubmitRegistration({
    saveRegistration,
    activeParties,
    t,
  });

  const validationErrors = getValidationErrors(formData);
  const formValid = isFormValid(formData);

  function selectType(type) {
    setHasTriedSubmit(false);
    setFormData(resetFormForType(type, partyId));
    setStep(2);
  }

  function toggleParty(id) {
    setFormData((prev) => ({
      ...prev,
      selectedParties: prev.selectedParties.includes(id)
        ? prev.selectedParties.filter((p) => p !== id)
        : [...prev.selectedParties, id],
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const errors = getValidationErrors(formData);
    if (Object.keys(errors).length > 0) {
      setHasTriedSubmit(true);
      setShakeTrigger((n) => n + 1);
      setTelegramError('');
      return;
    }
    const ok = await submit(formData);
    if (ok) {
      setStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  if (step === 3) {
    return <SuccessScreen onClose={onCancel} t={t} />;
  }

  const showCoupleFields = isCoupleRegType(formData.regType);
  const showSingleFields = !showCoupleFields;
  const showArrivalSection = isFemaleRegType(formData.regType);

  return (
    <div className="registration-form-container">
      <div className="registration-form-header">
        <h1 className="registration-form-title">
          מסיבות בישראל
        </h1>
        <p className="registration-form-subtitle">
          הרשמה למסיבה
        </p>
      </div>

      <div className="registration-step-tracker">
        <div className={`registration-step-tracker-item ${step >= 1 ? 'registration-step-tracker-item-done' : ''}`}>
          <span className="registration-step-tracker-badge">{step > 1 ? '✓' : '1'}</span>
          <span className="registration-step-tracker-label">בחירת סוג</span>
        </div>
        <div className="registration-step-tracker-line" />
        <div className={`registration-step-tracker-item ${step >= 2 ? 'registration-step-tracker-item-active' : ''}`}>
          <span className="registration-step-tracker-badge">2</span>
          <span className="registration-step-tracker-label">פרטים ואיזון</span>
        </div>
      </div>

      {step === 1 ? (
        <TypePicker
          registration={content.registration}
          onSelect={selectType}
          onCancel={onCancel}
          t={t}
        />
      ) : (
        <div className="registration-step2-container">
          <button
            type="button"
            onClick={() => {
              setHasTriedSubmit(false);
              setStep(1);
            }}
            className="registration-back-btn"
          >
            <ChevronLeft size={14} /> {t('registration.backToSelection')}
          </button>

          <form onSubmit={handleSubmit} className="registration-form">
            {showSingleFields && (
              <SinglePersonFields
                formData={formData}
                setFormData={setFormData}
                validationErrors={validationErrors}
                hasTriedSubmit={hasTriedSubmit}
                shakeTrigger={shakeTrigger}
                telegramError={telegramError}
                setTelegramError={setTelegramError}
                registrationInfo={registrationInfo}
                t={t}
              />
            )}

            {showCoupleFields && (
              <CoupleFields
                formData={formData}
                setFormData={setFormData}
                validationErrors={validationErrors}
                hasTriedSubmit={hasTriedSubmit}
                shakeTrigger={shakeTrigger}
                telegramError={telegramError}
                coupleOneRegisteredInfo={coupleOneRegisteredInfo}
                t={t}
              />
            )}

            {showArrivalSection && (
              <FemaleArrivalFields
                formData={formData}
                setFormData={setFormData}
                validationErrors={validationErrors}
                hasTriedSubmit={hasTriedSubmit}
                shakeTrigger={shakeTrigger}
                t={t}
              />
            )}

            <PartyPicker
              activeParties={activeParties}
              loadingParties={loadingParties}
              selectedParties={formData.selectedParties}
              onToggle={toggleParty}
              validationErrors={validationErrors}
              hasTriedSubmit={hasTriedSubmit}
              shakeTrigger={shakeTrigger}
              t={t}
            />

            {content.about?.entryNote && (
              <div className="registration-entry-note">
                <div className="registration-entry-note-title">הנחיות כניסה לאירוע</div>
                <p className="registration-entry-note-phrase">{content.about.entryNote}</p>
              </div>
            )}

            {hasTriedSubmit && !formValid && !loading && (
              <p className="registration-form-error registration-form-hint" role="alert">
                {t('registration.fillRequiredFieldsHint')}
              </p>
            )}

            <button type="submit" disabled={loading} aria-disabled={loading} className="registration-submit-btn">
              {loading ? (
                <div className="loader-inline">
                  <Loader size="small" />
                </div>
              ) : (
                <>
                  <Send size={18} className="registration-submit-icon" />
                  <span className="registration-submit-text">{t('registration.submit')}</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default RegistrationForm;
