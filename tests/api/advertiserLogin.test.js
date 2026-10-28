import { describe, it, expect, vi, beforeAll } from 'vitest';
import bcrypt from 'bcryptjs';

let accounts = [];
const throttle = {};
const col = {
  where: (_f, _o, v) => ({ get: async () => ({ docs: accounts.filter((a) => a.phoneNumber === v).map((a) => ({ id: a.id, data: () => a })) }) }),
  get: async () => ({ docs: accounts.map((a) => ({ id: a.id, data: () => a })) }),
};
const db = {
  collection: (name) => name === 'forumAuthThrottle'
    ? { doc: (id) => ({ get: async () => ({ exists: !!throttle[id], data: () => throttle[id] }), delete: async () => { delete throttle[id]; } }) }
    : { ...col, doc: (id) => ({ get: async () => { const a = accounts.find((x) => x.id === id); return { exists: !!a, data: () => a }; }, update: async (u) => { Object.assign(accounts.find((x) => x.id === id), u); } }) },
};
process.env.ADVERTISER_LOGIN_OPEN = '1';
process.env.ADMIN_API_SECRET = 'admin-secret-for-tests-0123456789';
vi.mock('../../lib/forumAuthApi.js', async (orig) => ({
  ...(await orig()),
  getFirebaseAdmin: async () => ({ firestore: () => db }),
  isRateLimited: async () => false,
}));

const handler = (await import('../../api/advertiser-auth.js')).default;
const adminCall = async (action, body) => {
  const res = { setHeader() {}, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; }, end() { return this; } };
  await handler({ method: 'POST', query: { action }, headers: { authorization: 'Bearer admin-secret-for-tests-0123456789' }, body: { action, ...body } }, res);
  return res.body;
};
const login = async (phoneNumber, password) => {
  const res = { setHeader() {}, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; }, end() { return this; } };
  await handler({ method: 'POST', query: { action: 'login' }, headers: {}, body: { action: 'login', phoneNumber, password } }, res);
  return res.body;
};

describe('advertiser login closed', () => {
  it('refuses every login while the owner keeps it closed', async () => {
    delete process.env.ADVERTISER_LOGIN_OPEN;
    try {
      accounts = [{ id: 'a1', phoneNumber: '0501234567', status: 'approved', password: await bcrypt.hash('9600', 4) }];
      expect(await login('0501234567', '9600')).toMatchObject({ authenticated: false, closed: true, error: 'כניסת המפרסמים סגורה כרגע' });
    } finally { process.env.ADVERTISER_LOGIN_OPEN = '1'; }
  });
});

describe('advertiser login', () => {
  let hashOld; let hashNew;
  beforeAll(async () => { hashOld = await bcrypt.hash('oldpass', 4); hashNew = await bcrypt.hash('9600', 4); });

  it('finds an account whose phone was stored with dashes', async () => {
    accounts = [{ id: 'a1', businessName: 'MOJO', phoneNumber: '050-1234567', status: 'approved', password: hashNew }];
    const r = await login('0501234567', '9600');
    expect(r.authenticated).toBe(true);
    expect(r.advertiser.id).toBe('a1');
    expect(r.advertiser.password).toBeUndefined();
  });

  it('accepts the new password when the same phone was registered twice and the reset reached only one', async () => {
    accounts = [
      { id: 'dup1', phoneNumber: '0501234567', status: 'approved', password: hashOld },
      { id: 'dup2', phoneNumber: '0501234567', status: 'approved', password: hashNew },
    ];
    const r = await login('0501234567', '9600');
    expect(r.authenticated).toBe(true);
    expect(r.advertiser.id).toBe('dup2');
  });

  it('rejects a wrong password and does not reveal the account status without the right password', async () => {
    accounts = [{ id: 'p1', phoneNumber: '0501234567', status: 'pending', password: hashNew }];
    expect((await login('0501234567', 'nope')).error).toBe('פרטי התחברות שגויים');
    expect((await login('0501234567', '9600')).error).toContain('ממתינה לאישור');
  });

  it('a broken stored hash is a plain failure, not a crash or a hang', async () => {
    accounts = [{ id: 'b1', phoneNumber: '0501234567', status: 'approved', password: '9600' }];
    expect((await login('0501234567', '9600')).error).toBe('פרטי התחברות שגויים');
  });

  it('admin reset stores the phone in clean form, so a dashed phone logs in afterwards', async () => {
    accounts = [{ id: 'm1', businessName: 'MOJO', phoneNumber: '+972-50-5647030', status: 'approved', password: 'garbage' }];
    const r = await adminCall('reset-password', { advertiserId: 'm1', newPassword: '9600' });
    expect(r.ok).toBe(true);
    expect(accounts[0].phoneNumber).toBe('0505647030');
    expect((await login('0505647030', '9600')).authenticated).toBe(true);
  });

  it('admin check explains the account state', async () => {
    accounts = [
      { id: 'm1', businessName: 'MOJO', phoneNumber: '050-5647030', status: 'pending', password: 'x' },
      { id: 'm2', businessName: 'MOJO 2', phoneNumber: '0505647030', status: 'approved', password: hashNew },
    ];
    const r = await adminCall('check', { advertiserId: 'm1' });
    expect(r).toMatchObject({ status: 'pending', phoneClean: '0505647030', phoneValid: true, hashValid: false, loginBlocked: false });
    expect(r.duplicates.map((d) => d.id)).toEqual(['m2']);
  });
});
