import { describe, it, expect } from 'vitest';
import { purgeMembers, MEMBER_COLLECTIONS } from '../../lib/purgeMembers.js';

// A tiny in-memory Firestore: collections of { id, data } with delete/update.
function fakeDb(initial) {
  const cols = JSON.parse(JSON.stringify(initial));
  const ref = (name, id) => ({
    path: `${name}/${id}`,
    delete: () => { cols[name] = cols[name].filter((d) => d.id !== id); },
    update: (u) => {
      const d = cols[name].find((x) => x.id === id);
      for (const [k, v] of Object.entries(u)) { if (v === 'DELETE') delete d.data[k]; else d.data[k] = v; }
    },
  });
  return {
    cols,
    collection: (name) => ({ get: async () => ({ docs: (cols[name] || []).map((d) => ({ id: d.id, ref: ref(name, d.id), data: () => d.data })) }) }),
    batch: () => { const ops = []; return { delete: (r) => ops.push(r), commit: async () => ops.forEach((r) => r.delete()) }; },
    recursiveDelete: async (r) => r.delete(),
  };
}
const FieldValue = { delete: () => 'DELETE' };

describe('purge members', () => {
  it('deletes every member and site account, keeps admins and parties', async () => {
    const db = fakeDb({
      users: [{ id: 'm1', data: { name: 'מנוי', gender: 'male' } }, { id: 'a1', data: { name: 'מנהל', isAdmin: true } }],
      forumUsers: [{ id: 'f1', data: { nickname: 'x' } }],
      subscriptionRequests: [{ id: 's1', data: {} }],
      advertisers: [{ id: 'ad1', data: {} }],
      matchChats: [{ id: 'c1', data: {} }],
      parties: [{ id: 'p1', data: { title: 'מסיבה', registrations: [{ phoneNumber: '050' }], balanceMatches: [] } }, { id: 'p2', data: { title: 'אחרת' } }],
    });
    const out = await purgeMembers(db, FieldValue);
    expect(db.cols.users.map((d) => d.id)).toEqual(['a1']);
    for (const name of ['forumUsers', 'subscriptionRequests', 'advertisers', 'matchChats']) expect(db.cols[name]).toEqual([]);
    expect(db.cols.parties).toHaveLength(2);
    expect(db.cols.parties[0].data).toEqual({ title: 'מסיבה' });
    expect(out).toMatchObject({ users: 1, forumUsers: 1, advertisers: 1, matchChats: 1, partiesCleared: 1 });
  });

  it('never lists the collections the site still needs', () => {
    for (const keep of ['users', 'parties', 'settings', 'pushSubscriptions', 'supportChat', 'rssFeeds']) {
      expect(MEMBER_COLLECTIONS).not.toContain(keep);
    }
  });
});
