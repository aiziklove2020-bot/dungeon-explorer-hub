/**
 * Server-side safety net: women get free full access automatically (see the
 * gender bypass in src/firebase/subscriptions.js's getSubscription), so no
 * admin should ever need to manually "create a user" for a female
 * registrant. The client-side auto-provision in src/firebase/parties.js only
 * covers registrations made through the React app's own /register route —
 * the public site's actual registration form (public/register-event.html)
 * goes through a separately-bundled client (public/assets/site-data.js) this
 * codebase doesn't control the source of. Running this here, on every write
 * to a party document, covers BOTH paths regardless of which one wrote the
 * registration.
 *
 * Deploy: firebase deploy --only functions
 */
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';

const db = getFirestore();

function normalizeIsraeliPhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('972') && digits.length === 12) return '0' + digits.slice(3);
  return digits;
}

function isValidLocalPhone(value) {
  return /^05\d{8}$/.test(value || '');
}

export const autoProvisionFemaleUsers = onDocumentWritten('parties/{partyId}', async (event) => {
  const after = event.data?.after;
  if (!after?.exists) return;

  const registrations = after.data()?.registrations || [];
  const femalePhones = new Set();
  registrations.forEach((reg) => {
    const phone = normalizeIsraeliPhone(reg?.phoneNumber);
    if (reg?.gender === 'female' && isValidLocalPhone(phone)) femalePhones.add(phone);
  });
  if (femalePhones.size === 0) return;

  const usersRef = db.collection('users');
  for (const phone of femalePhones) {
    try {
      const reg = registrations.find((r) => normalizeIsraeliPhone(r?.phoneNumber) === phone && r?.gender === 'female');
      const now = new Date();
      const expiry = new Date(now.getTime());
      expiry.setFullYear(expiry.getFullYear() + 1);

      // Runs on every write to every party document, so the same woman
      // registering for two parties close together can trigger two
      // concurrent invocations for the same phone. A plain query-then-add
      // lets both see "no existing user" before either write lands,
      // creating two duplicate accounts for one phone number. Doing the
      // query-then-create inside a transaction closes that: Firestore
      // tracks the query's result set as part of the transaction's read
      // set, so if a concurrent transaction creates the matching user
      // first, this one is automatically retried and its own retry finds
      // that user and skips creation instead of duplicating it.
      const created = await db.runTransaction(async (tx) => {
        const existing = await tx.get(usersRef.where('phoneNumber', '==', phone).limit(1));
        if (!existing.empty) return false; // already a user — nothing to do
        const newRef = usersRef.doc();
        tx.set(newRef, {
          name: reg?.fullName || reg?.userName || '',
          phoneNumber: phone,
          gender: 'female',
          level: 'registered',
          telegramUsername: reg?.telegramUsername || '',
          subscriptions: {
            parties: {
              tier: 'year',
              startDate: now.toISOString(),
              lastRenewedAt: now.toISOString(),
              lastRenewalTier: 'year',
              expiry: expiry.toISOString(),
            },
            exchangeParties: null,
          },
          createdAt: Timestamp.now(),
        });
        return true;
      });
      if (created) logger.info('autoProvisionFemaleUsers: created user for', phone);
    } catch (e) {
      logger.error('autoProvisionFemaleUsers failed for', phone, e);
    }
  }
});
