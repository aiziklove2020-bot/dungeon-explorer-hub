import { useEffect, useState } from 'react';
import { DEFAULT_PARTY_RETENTION_HOURS, isPartyExpiredByDate } from '../../../shared/partyExpiry.js';
import { getActiveParties } from '../../firebase/parties';
import { getPartySettings } from '../../firebase/partySettings';

/**
 * Same visibility rule as the homepage: reads parties live from Firestore
 * (same source the admin panel writes to) instead of the GitHub-published
 * content.json, so a party added in /admin shows up here immediately.
 */
function buildActiveParties(parties, retentionHours = DEFAULT_PARTY_RETENTION_HOURS) {
  return (parties || [])
    .filter((p) => !isPartyExpiredByDate(p.date, retentionHours))
    // Only on-site-registration parties belong on /register. External parties
    // (register via their own link) and WhatsApp-contact parties (contact via
    // WhatsApp) don't take registrations through the site, so they're excluded.
    .filter((p) => (p.partyType || 'internal') !== 'external' && !p.whatsappNumber)
    .map((p) => ({
      id: p.id,
      day: p.day,
      date: p.date,
      title: p.title || '',
      name: p.title || '',
      description: p.description || '',
      partyType: p.partyType || 'internal',
    }))
    // Chronological order — earliest upcoming party first.
    .sort((a, b) => {
      const toMs = (d) => {
        const dt = d instanceof Date ? d : d?.toDate ? d.toDate() : new Date(d);
        const t = dt?.getTime?.();
        return Number.isFinite(t) ? t : Number.MAX_SAFE_INTEGER;
      };
      return toMs(a.date) - toMs(b.date);
    });
}

/** @returns {{ activeParties: Array, loadingParties: boolean }} */
export function useActiveParties() {
  const [activeParties, setActiveParties] = useState([]);
  const [loadingParties, setLoadingParties] = useState(true);
  const [expiryTick, setExpiryTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setExpiryTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getActiveParties(), getPartySettings()])
      .then(([parties, settings]) => {
        if (cancelled) return;
        setActiveParties(buildActiveParties(parties, settings?.retentionHours));
        setLoadingParties(false);
      })
      .catch(() => {
        if (!cancelled) {
          setActiveParties([]);
          setLoadingParties(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [expiryTick]);

  return { activeParties, loadingParties };
}
