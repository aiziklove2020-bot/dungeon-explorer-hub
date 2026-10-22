import { describe, it, expect, vi, beforeAll } from 'vitest';
import bcrypt from 'bcryptjs';

let accounts = [];
const col = {
  where: (_f, _o, v) => ({ get: async () => ({ docs: accounts.filter((a) => a.phoneNumber === v).map((a) => ({ id: a.id, data: () => a })) }) }),
  get: async () => ({ docs: accounts.map((a) => ({ id: a.id, data: () => a })) }),
};
const db = { collection: () => col };
vi.mock('../../lib/forumAuthApi.js', async (orig) => ({
  ...(await orig()),
  getFirebaseAdmin: async () => ({ firestore: () => db }),
  isRateLimited: async () => false,
}));

const handler = (await import('../../api/advertiser-auth.js')).default;
const login = async (phoneNumber, password) => {
  const res = { setHeader() {}, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; }, end() { return this; } };
  await handler({ method: 'POST', query: { action: 'login' }, headers: {}, body: { action: 'login', phoneNumber, password } }, res);
  return res.body;
};

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
});
