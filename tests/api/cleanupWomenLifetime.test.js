import { describe, it, expect, vi, beforeEach } from 'vitest';

let usersDocs = [];
const updates = [];
const doc = (id, data) => ({ id, data: () => data, ref: { id } });
const db = {
  collection: (name) => ({
    where: (field, op, value) => ({
      get: async () => {
        let docs = [];
        if (name === 'users' && field === 'gender') docs = usersDocs.filter((d) => d.data().gender === value);
        return { empty: docs.length === 0, size: docs.length, docs };
      },
    }),
  }),
  batch: () => ({ update: (ref, data) => updates.push([ref.id, data]), delete: () => {}, commit: async () => {} }),
};
vi.mock('firebase-admin', () => ({
  default: { firestore: Object.assign(() => db, { Timestamp: { now: () => 'NOW' } }), apps: [1] },
}));

const { default: handler } = await import('../../api/telegram-webhook.js');

const run = async () => {
  let body;
  const res = { setHeader: () => {}, status: () => ({ json: (b) => { body = b; } }) };
  await handler({ method: 'GET', query: { job: 'cleanup-parties' }, headers: {} }, res);
  return body;
};

describe('nightly cleanup job: lifetime subscription for every woman', () => {
  beforeEach(() => { updates.length = 0; });

  it('moves women without gold to gold, keeping their other subscription and admin/blocked level', async () => {
    usersDocs = [
      doc('w-year', { gender: 'female', level: 'registered', subscriptions: { parties: { tier: 'year', startDate: '2026-01-01T00:00:00.000Z', expiry: '2027-01-01T00:00:00.000Z' }, exchangeParties: { tier: 'month', expiry: '2026-12-01T00:00:00.000Z' } } }),
      doc('w-none', { gender: 'female', level: 'regular' }),
      doc('w-gold', { gender: 'female', level: 'gold', subscriptions: { parties: { tier: 'gold', expiry: null } } }),
      doc('w-blocked', { gender: 'female', level: 'blocked', subscriptions: { parties: { tier: 'year' } } }),
      doc('man', { gender: 'male', level: 'registered', subscriptions: { parties: { tier: 'year' } } }),
    ];
    const body = await run();
    expect(body.ok).toBe(true);
    expect(body.upgradedWomen).toBe(3);
    const byId = Object.fromEntries(updates);
    expect(Object.keys(byId).sort()).toEqual(['w-blocked', 'w-none', 'w-year']);

    expect(byId['w-year'].subscriptions.parties).toMatchObject({ tier: 'gold', expiry: null, startDate: '2026-01-01T00:00:00.000Z', lastRenewalTier: 'gold' });
    expect(byId['w-year'].subscriptions.exchangeParties).toEqual({ tier: 'month', expiry: '2026-12-01T00:00:00.000Z' });
    expect(byId['w-year'].level).toBe('gold');
    expect(byId['w-year'].registrationExpiry).toBeNull();

    expect(byId['w-none'].subscriptions.parties.tier).toBe('gold');
    expect(byId['w-none'].subscriptions.exchangeParties).toBeNull();

    expect(byId['w-blocked'].subscriptions.parties.tier).toBe('gold');
    expect(byId['w-blocked']).not.toHaveProperty('level');
  });

  it('does nothing when every woman is already on gold', async () => {
    usersDocs = [doc('w-gold', { gender: 'female', subscriptions: { parties: { tier: 'gold' } } })];
    const body = await run();
    expect(body.upgradedWomen).toBe(0);
    expect(updates).toHaveLength(0);
  });
});
