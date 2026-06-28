/**
 * Bridges forum login to Firebase Auth for Firestore chat security rules (custom claims).
 * Skips when chat uses a dedicated Firebase project unless you deploy callable + forumUsers there.
 */
import { signInWithCustomToken, signOut } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app, {
  auth,
  getChatAuth,
  usesDedicatedChatFirebase,
  FUNCTIONS_REGION
} from './config';

/**
 * Issues a custom chat token via Cloud Function + signs into Auth used by chat Firestore.
 */
export async function signInForumForChatFirebase(nickname, password) {
  if (typeof nickname !== 'string' || typeof password !== 'string') return false;
  if (usesDedicatedChatFirebase()) {
    // Tokens from the main app's Callable target the primary Firebase Auth issuer; signing into
    // a separate chat app's Auth fails unless you deploy mirrored callables/mint on that project.
    console.warn(
      '[TBDSM chat] Dedicated Firestore chat project detected: Firebase Auth bridging is disabled until chat + forum share one project identity.'
    );
    return false;
  }

  try {
    const fn = httpsCallable(getFunctions(app, FUNCTIONS_REGION), 'issueForumChatToken');
    const res = await fn({ nickname: nickname.trim(), password });
    const token = res.data?.token;
    if (!token || typeof token !== 'string') {
      console.error('[TBDSM chat] issueForumChatToken: empty token');
      return false;
    }
    await signInWithCustomToken(getChatAuth(), token);
    return true;
  } catch (e) {
    console.error('[TBDSM chat] signInForumForChatFirebase', e);
    return false;
  }
}

export async function signOutChatFirebase() {
  try {
    const a = usesDedicatedChatFirebase() ? getChatAuth() : auth;
    if (a?.currentUser) {
      await signOut(a);
    }
  } catch {
    /* ignore */
  }
}
