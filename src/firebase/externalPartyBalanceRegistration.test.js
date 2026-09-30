import { describe, it, expect, vi, beforeEach } from 'vitest';

let partyDoc;
vi.mock('./dataAccess', () => ({
  getActiveParties: vi.fn(),
  getBalanceMatches: vi.fn().mockResolvedValue([]),
  getPartyById: vi.fn().mockResolvedValue(null),
  getUserByPhone: vi.fn().mockResolvedValue(null),
  invalidateCache: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('./users', () => ({
  isUserBlocked: vi.fn().mockResolvedValue({ blocked: false }),
  createUserFromRegistration: vi.fn().mockResolvedValue(undefined),
  getAllUsers: vi.fn().mockResolvedValue([]),
}));
vi.mock('./telegram', () => ({ sendBalanceMatchNotification: vi.fn() }));
vi.mock('./pushSubscriptions', () => ({
  sendPushToPhone: vi.fn().mockResolvedValue({ hasDevice: false, ok: true }),
  notifyAllSubscribersOfNewParty: vi.fn(),
}));
vi.mock('../utils/phone', () => ({ normalizeIsraeliPhone: (p) => p }));
vi.mock('../../shared/partyExpiry.js', () => ({
  DEFAULT_PARTY_RETENTION_HOURS: 24,
  computePartyExpirationIso: vi.fn(),
  isPartyExpiredByDate: vi.fn(),
  isRegistrationClosedForPartyDate: vi.fn().mockReturnValue(false),
}));
vi.mock('./partySettings', () => ({ getPartySettings: vi.fn() }));
vi.mock('./config', () => ({ db: {} }));
const txUpdate = vi.fn();
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(), doc: vi.fn(), getDoc: vi.fn(), setDoc: vi.fn(), updateDoc: vi.fn(),
  deleteDoc: vi.fn(), getDocs: vi.fn(), query: vi.fn(), where: vi.fn(), arrayUnion: (x) => x,
  arrayRemove: vi.fn(), Timestamp: { now: () => ({}) }, writeBatch: vi.fn(),
  waitForPendingWrites: vi.fn().mockResolvedValue(undefined),
  runTransaction: vi.fn().mockImplementation(async (db, fn) => {
    const snap = { exists: () => true, data: () => partyDoc };
    return fn({ get: vi.fn().mockResolvedValue(snap), update: txUpdate });
  }),
}));

const { registerToPartyNew } = await import('./parties');

const reg = (registrationType, gender) => ({
  fullName: 'Test', phoneNumber: '0500000001', registrationType, gender,
});

describe('registering on an advertiser external-ticket party', () => {
  beforeEach(() => {
    txUpdate.mockClear();
    partyDoc = { partyType: 'external', registrationLink: 'https://t.example', registrations: [], date: new Date() };
  });

  it('is refused when the advertiser did not opt into balance registration', async () => {
    await expect(registerToPartyNew('p1', reg('single-male-balance', 'male'))).rejects.toThrow('לינק הכרטיסים');
    expect(txUpdate).not.toHaveBeenCalled();
  });

  it('only accepts the solo balance types when opted in', async () => {
    partyDoc.allowBalanceRegistration = true;
    await expect(registerToPartyNew('p1', reg('single-male-couple', 'male'))).rejects.toThrow('לאיזון מגדרי בלבד');
    await expect(registerToPartyNew('p1', reg('single-female-discount', 'female'))).rejects.toThrow('לאיזון מגדרי בלבד');
    expect(txUpdate).not.toHaveBeenCalled();
  });

  it('accepts a solo balance registration when opted in', async () => {
    partyDoc.allowBalanceRegistration = true;
    await registerToPartyNew('p1', reg('single-female-balance', 'female'));
    expect(txUpdate).toHaveBeenCalledTimes(1);
  });

  it('leaves internal parties unaffected', async () => {
    partyDoc = { partyType: 'internal', registrations: [], date: new Date(), maleLimit: 10, femaleLimit: 10 };
    await registerToPartyNew('p1', reg('single-male-couple', 'male'));
    expect(txUpdate).toHaveBeenCalledTimes(1);
  });
});
