import { useEffect, useState } from 'react';
import {
  DEFAULT_PARTY_RETENTION_HOURS,
  getIsraelLocalDateComponents,
  isPartyExpiredByExpiration,
} from '../../../shared/partyExpiry.js';

/** Parse a published "DD.MM" label into a local Date for display (year anchored to Israel "today"). */
function parsePartyDisplayDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const [day, month] = dateStr.split('.').map(Number);
  if (!day || !month) return null;
  const today = getIsraelLocalDateComponents(new Date()) || { year: new Date().getFullYear() };
  return new Date(today.year, month - 1, day);
}

/**
 * Same visibility rule as the homepage: honour per-event `expiration` when
 * present, otherwise recompute from "DD.MM" + the configured retention window.
 */
function buildActiveParties(events, retentionHours = DEFAULT_PARTY_RETENTION_HOURS) {
  return (events || [])
    .filter((ev) => !isPartyExpiredByExpiration(ev?.expiration, ev?.date, retentionHours))
    .map((ev) => ({
      id: ev.id,
      day: ev.day,
      date: parsePartyDisplayDate(ev.date) || new Date(),
      title: ev.title || '',
      name: ev.title || '',
      description: ev.description || '',
      partyType: ev.partyType || 'internal',
    }));
}

/**
 * @param {Array|undefined} events             - `content.events` from ContentContext.
 * @param {boolean}         isInitialized      - content loader readiness flag.
 * @param {number|undefined} partyRetentionHours - retention window from content.json / settings.
 * @returns {{ activeParties: Array, loadingParties: boolean }}
 */
export function useActiveParties(events, isInitialized, partyRetentionHours) {
  const [activeParties, setActiveParties] = useState([]);
  const [loadingParties, setLoadingParties] = useState(true);
  const [expiryTick, setExpiryTick] = useState(0);
  const retentionHours = partyRetentionHours ?? DEFAULT_PARTY_RETENTION_HOURS;

  useEffect(() => {
    const id = setInterval(() => setExpiryTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!isInitialized) {
      setLoadingParties(true);
      return;
    }
    setLoadingParties(false);
    setActiveParties(buildActiveParties(events || [], retentionHours));
  }, [events, isInitialized, retentionHours, expiryTick]);

  return { activeParties, loadingParties };
}
