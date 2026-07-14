/**
 * Mints Firebase custom token after verifying forum nickname + password.
 * Claims: forumUid (doc id), forumAdmin, chatGlobalMod (forum admin OR linked site-level admin).
 * Requires forumUsers docs (with password hash) in the SAME Firebase project as this function.
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import bcrypt from 'bcryptjs';
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

export const issueForumChatToken = onCall({ region: 'europe-west1' }, async (request) => {
  const nickname = typeof request.data?.nickname === 'string' ? request.data.nickname.trim() : '';
  const password = typeof request.data?.password === 'string' ? request.data.password : '';
  if (nickname.length < 2 || !password) {
    throw new HttpsError('invalid-argument', 'nickname and password required');
  }

  const col = db.collection('forumUsers');
  const trimmed = nickname.slice(0, 30);
  const lower = trimmed.toLowerCase();
  let snap = await col.where('nicknameLower', '==', lower).limit(1).get();
  if (snap.empty) {
    // Legacy fallback for accounts predating the case-insensitive migration.
    snap = await col.where('nickname', '==', trimmed).limit(1).get();
    if (snap.empty && trimmed !== lower) {
      snap = await col.where('nickname', '==', lower).limit(1).get();
    }
  }
  if (snap.empty) {
    throw new HttpsError('not-found', 'Invalid credentials');
  }
  const userDoc = snap.docs[0];
  const data = userDoc.data();
  const hash = data?.password;
  if (typeof hash !== 'string') {
    throw new HttpsError('failed-precondition', 'Account misconfigured');
  }
  let ok = false;
  try {
    ok = await bcrypt.compare(password, hash);
  } catch {
    ok = false;
  }
  if (!ok || data?.isBlocked === true) {
    throw new HttpsError('permission-denied', 'Invalid credentials');
  }

  const forumUid = userDoc.id;
  const forumAdmin = data?.role === 'forumAdmin';
  let chatGlobalMod = !!forumAdmin;
  const linkedUserId = data?.linkedUserId;
  if (!chatGlobalMod && linkedUserId) {
    try {
      const site = await db.collection('users').doc(String(linkedUserId)).get();
      const lvl = site.data()?.level;
      if (lvl === 'admin' || site.data()?.isAdmin === true) {
        chatGlobalMod = true;
      }
    } catch {
      /* ignore */
    }
  }

  const customClaims = {
    forumUid,
    forumAdmin,
    chatGlobalMod
  };

  const token = await admin.auth().createCustomToken(forumUid, customClaims);
  return {
    token,
    forumUid,
    forumAdmin,
    chatGlobalMod
  };
});
