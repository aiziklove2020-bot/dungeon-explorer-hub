import Loader from '../../../Loader';

function formatPartyDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  return {
    full: d.toLocaleDateString('he-IL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'long',
    }),
    dayName: d.toLocaleDateString('he-IL', { weekday: 'long' }),
  };
}

export default function PartyPicker({
  activeParties,
  loadingParties,
  selectedParties,
  onToggle,
  validationErrors,
  hasTriedSubmit,
  shakeTrigger,
  t,
}) {
  const errorClass =
    hasTriedSubmit && validationErrors.parties ? 'registration-parties-section-error' : '';

  return (
    <div className={`registration-parties-section ${errorClass}`}>
      <label className="registration-parties-label">{`${t('registration.selectParties')} *`}</label>

      {loadingParties ? (
        <div className="registration-parties-empty flex items-center justify-center p-8 min-h-[200px]">
          <Loader size="medium" />
        </div>
      ) : activeParties.length === 0 ? (
        <div className="registration-parties-empty">
          {t('registration.noActiveParties')}
        </div>
      ) : (
        <div
          key={
            hasTriedSubmit && validationErrors.parties
              ? `shake-parties-${shakeTrigger}`
              : undefined
          }
          className={
            hasTriedSubmit && validationErrors.parties
              ? 'registration-field-shake-wrap'
              : ''
          }
        >
          {hasTriedSubmit && validationErrors.parties && (
            <p className="registration-form-error registration-parties-message">
              {t('registration.selectAtLeastOneParty')}
            </p>
          )}
          <div className="registration-parties-grid">
            {activeParties.map((party) => {
              const isSelected = selectedParties.includes(party.id);
              const { full, dayName } = formatPartyDate(party.date);

              return (
                <button
                  key={party.id}
                  type="button"
                  onClick={() => onToggle(party.id)}
                  aria-pressed={isSelected}
                  className={`registration-party-button ${
                    isSelected
                      ? 'registration-party-button-selected'
                      : 'registration-party-button-unselected'
                  }`}
                >
                  <div className="registration-party-content">
                    <span className="registration-party-name">
                      {party.name || party.title || t('party.defaultName')}
                    </span>
                    <div className="registration-party-details">
                      <span>{dayName}</span>
                      <span>{full}</span>
                      {party.day && (
                        <span className="opacity-75">{`${t('party.day')} ${party.day}`}</span>
                      )}
                    </div>
                    {party.description && (
                      <span className="registration-party-description">
                        {party.description}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
