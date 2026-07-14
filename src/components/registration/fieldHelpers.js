/**
 * Controlled-input helpers shared across child form components.
 *
 * The phone input allows only the prefix `05` followed by up to 8 extra
 * digits so the UI prevents invalid entries from ever reaching state.
 * The telegram input strips every `@` the user types because we add a
 * single `@` at submit time.
 */

export function handlePhoneChange(event, setField) {
  const value = event.target.value.replace(/\D/g, '');
  if (value.length > 10) return;
  if (value.length === 0 || value === '0' || value.startsWith('05')) {
    setField(value);
  }
}

export function handleTelegramChange(event, setField) {
  setField(event.target.value.replace(/@/g, ''));
}

export function shakeKey(errorField, shakeTrigger, hasTriedSubmit) {
  return hasTriedSubmit && errorField ? `shake-${shakeTrigger}` : undefined;
}

export function shakeWrapClass(errorField, hasTriedSubmit) {
  return hasTriedSubmit && errorField ? 'registration-field-shake-wrap' : '';
}

export function inputErrorClass(errorField, hasTriedSubmit, extraError = false) {
  const isError = (hasTriedSubmit && errorField) || extraError;
  return isError ? 'registration-form-input-error' : '';
}
