/**
 * Returns a tel: href for the given phone number (Israeli format supported).
 * Use for click-to-dial links. Returns null if phone is empty or just a dash.
 */
export const getTelHref = (phone) => {
  if (!phone || String(phone).trim() === '' || String(phone).trim() === '-') return null;
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length < 9) return null;
  // Israeli: 05xxxxxxxx -> +9725xxxxxxxx
  if (digits.startsWith('0')) return `tel:+972${digits.slice(1)}`;
  if (digits.length >= 9 && !digits.startsWith('972')) return `tel:+972${digits}`;
  return `tel:+${digits}`;
};
