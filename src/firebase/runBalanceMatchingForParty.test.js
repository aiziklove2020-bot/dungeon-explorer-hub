import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock every dependency runBalanceMatchingForParty touches so this is a pure,
// no-network unit test of the *ordering* bug: getAllUsers() is cached for 10
// minutes (see utils/cache.js), so calling it without first invalidating can
// return a stale list that's missing whoever was registered a moment ago in
// the same process/session — exactly what broke live testing of the
// auto-match feature (two registrations back-to-back in one browser tab).
const invalidateCacheMock = vi.fn().mockResolvedValue(undefined);
const getAllUsersMock = vi.fn();

vi.mock('./dataAccess', () => ({
  getActiveParties: vi.fn(),
  getBalanceMatches: vi.fn(),
  getPartyById: vi.fn(),
  getUserByPhone: vi.fn(),
  invalidateCache: (...args) => invalidateCacheMock(...args),
}));
vi.mock('./users', () => ({
  isUserBlocked: vi.fn(),
  createUserFromRegistration: vi.fn(),
  getAllUsers: (...args) => getAllUsersMock(...args),
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
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(), doc: vi.fn(), getDoc: vi.fn(), setDoc: vi.fn(), updateDoc: vi.fn(),
  deleteDoc: vi.fn(), getDocs: vi.fn(), query: vi.fn(), where: vi.fn(), arrayUnion: vi.fn(),
  arrayRemove: vi.fn(), Timestamp: { now: () => ({}) }, writeBatch: vi.fn(),
  waitForPendingWrites: vi.fn().mockResolvedValue(undefined),
  runTransaction: vi.fn().mockImplementation(async (db, fn) => {
    const snap = { exists: () => true, data: () => ({ balanceMatches: [] }) };
    return fn({ get: vi.fn().mockResolvedValue(snap), update: vi.fn() });
  }),
}));

const { getPartyById, getBalanceMatches } = await import('./dataAccess');
const { runBalanceMatchingForParty } = await import('./parties');

describe('runBalanceMatchingForParty cache freshness', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPartyById.mockResolvedValue({
      id: 'party1',
      name: 'Test Party',
      registrations: [
        { phoneNumber: '0500000001', gender: 'male', registrationType: 'single-male-balance', fullName: 'Male' },
        { phoneNumber: '0500000002', gender: 'female', registrationType: 'single-female-balance', fullName: 'Female' },
      ],
    });
    getBalanceMatches.mockResolvedValue([]);
    getAllUsersMock.mockResolvedValue([
      { phoneNumber: '0500000001' },
      { phoneNumber: '0500000002' },
    ]);
  });

  it('invalidates the allUsers cache before reading it, every call', async () => {
    await runBalanceMatchingForParty('party1');

    expect(invalidateCacheMock).toHaveBeenCalledWith('allUsers');
    // Must invalidate before reading, not after — otherwise the read still
    // sees the stale cached list.
    const invalidateOrder = invalidateCacheMock.mock.invocationCallOrder[0];
    const readOrder = getAllUsersMock.mock.invocationCallOrder[0];
    expect(invalidateOrder).toBeLessThan(readOrder);
  });
});
