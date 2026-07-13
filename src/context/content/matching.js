/**
 * Matching helpers extracted from ContentContext (Phase 3.1 split).
 *
 * These are pure functions that take a registrations array; they do not read
 * React state directly. Callers wrap them with access to the cache.
 */

/** Pair single males with single females by any overlapping selectedDay. */
export function buildMatchingTable(registrations) {
  const list = Array.isArray(registrations) ? registrations : [];
  const singleMales = list.filter((r) => r.regType === 'single_male');
  const singleFemales = list.filter((r) => r.regType === 'single_female');

  const matches = [];
  const matchedFemaleIds = new Set();

  singleMales.forEach((male) => {
    const matchingFemale = singleFemales.find((female) => {
      if (matchedFemaleIds.has(female.id)) return false;
      if (!male.selectedDays || !female.selectedDays) return false;
      return male.selectedDays.some((day) => female.selectedDays.includes(day));
    });

    if (matchingFemale) {
      matchedFemaleIds.add(matchingFemale.id);
      const commonDates = male.selectedDays.filter(
        (day) => matchingFemale.selectedDays && matchingFemale.selectedDays.includes(day)
      );
      matches.push({
        id: `${male.id}-${matchingFemale.id}`,
        maleName: male.fullName,
        femaleName: matchingFemale.fullName,
        malePhone: male.phone,
        femalePhone: matchingFemale.phone,
        matchedDates: commonDates,
        isMatched: true
      });
    } else {
      matches.push({
        id: male.id,
        maleName: male.fullName,
        femaleName: '',
        malePhone: male.phone,
        femalePhone: '',
        matchedDates: male.selectedDays || [],
        isMatched: false
      });
    }
  });

  return matches;
}

/** Build and download a CSV of the matching table. */
export function exportMatchesToCsv(registrations) {
  const matches = buildMatchingTable(registrations);
  const headers = ['גברים', 'נשים', 'טלפון גבר', 'טלפון אישה', 'תאריכים'];
  const csvContent = [
    headers.join(','),
    ...matches.map((m) =>
      [
        `"${m.maleName || ''}"`,
        `"${m.femaleName || ''}"`,
        `"${m.malePhone || ''}"`,
        `"${m.femalePhone || ''}"`,
        `"${m.matchedDates.join('; ')}"`
      ].join(',')
    )
  ].join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `matches-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
