// Deletes every member / site-account record. The site has no accounts any more:
// registration is by WhatsApp only. Admin accounts (users with isAdmin) and the
// parties themselves are kept; each party only loses its registrations and
// balance lists. Called from the admin panel (api/admin-settings.js, action
// "purge-members") after the owner confirms.

// Collections that only ever held member / account data.
export const MEMBER_COLLECTIONS = [
  'forumUsers', 'subscriptionRequests', 'registrations', 'advertisers', 'favorites', 'bookmarks',
  'notifications', 'privateMessages', 'conversations', 'deleteRequests', 'leads',
  'forumAuthThrottle', 'forumPasswordResets', 'forumEmailTokens', 'blogComments', 'blogAuthorFollows',
];
// Collections whose documents have their own subcollections (the anonymous match chats).
const NESTED_COLLECTIONS = ['matchChats'];
const PARTY_MEMBER_FIELDS = ['registrations', 'balanceMatches'];

async function deleteDocs(db, docs) {
  for (let i = 0; i < docs.length; i += 400) {
    const batch = db.batch();
    docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  return docs.length;
}

export async function purgeMembers(db, FieldValue) {
  const deleted = {};

  const users = (await db.collection('users').get()).docs;
  deleted.users = await deleteDocs(db, users.filter((d) => d.data()?.isAdmin !== true));

  for (const name of MEMBER_COLLECTIONS) {
    deleted[name] = await deleteDocs(db, (await db.collection(name).get()).docs);
  }
  for (const name of NESTED_COLLECTIONS) {
    const docs = (await db.collection(name).get()).docs;
    for (const d of docs) await db.recursiveDelete(d.ref);
    deleted[name] = docs.length;
  }

  let partiesCleared = 0;
  for (const d of (await db.collection('parties').get()).docs) {
    const data = d.data() || {};
    const present = PARTY_MEMBER_FIELDS.filter((f) => data[f] !== undefined);
    if (!present.length) continue;
    await d.ref.update(Object.fromEntries(present.map((f) => [f, FieldValue.delete()])));
    partiesCleared += 1;
  }
  deleted.partiesCleared = partiesCleared;
  return deleted;
}
