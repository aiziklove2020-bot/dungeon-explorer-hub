/**
 * Normalizes a party's registrations so couple halves always display as a couple.
 *
 * The public form registers a couple as two records
 * (registrationType "single-male-couple" / "single-female-couple"). Two bugs
 * made those show up as two unrelated men:
 *  - the bridge dropped `coupleId`, so the admin couldn't group them;
 *  - the record's gender was taken from an existing user account, and
 *    bulk-imported accounts default to gender "male" — so the woman became "male".
 *
 * This fixes already-saved records at display time:
 *  - gender is derived from the couple-half registrationType;
 *  - a missing coupleId is synthesized from the mutual partnerPhone link.
 */
export function coupleHalfGender(registrationType) {
  if (registrationType === "single-male-couple") return "male";
  if (registrationType === "single-female-couple") return "female";
  return null;
}

export function normalizeCoupleRegistrations(registrations) {
  const regs = (registrations || []).map((reg) => {
    const g = coupleHalfGender(reg.registrationType);
    return g && reg.gender !== g ? { ...reg, gender: g } : reg;
  });
  const byPhone = new Map();
  regs.forEach((reg) => {
    if (reg.phoneNumber) byPhone.set(reg.phoneNumber, reg);
  });
  return regs.map((reg) => {
    if (reg.coupleId || !reg.partnerPhone || !reg.phoneNumber) return reg;
    const partner = byPhone.get(reg.partnerPhone);
    if (!partner || partner.partnerPhone !== reg.phoneNumber) return reg;
    return {
      ...reg,
      coupleId: [reg.phoneNumber, reg.partnerPhone].sort().join("_"),
    };
  });
}
