import { initializeApp, getApp } from 'firebase/app';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';

const env = import.meta.env;

/** Main TBDSM Firebase project (parties, forum, settings/liveChat, notifications, …). */
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || 'AIzaSyAJv0APn-Qmv59H2Behu3PhskObCaPHW_A',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'tbdsm-5acca.firebaseapp.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'tbdsm-5acca',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || 'tbdsm-5acca.firebasestorage.app',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '905865425928',
  appId: env.VITE_FIREBASE_APP_ID || '1:905865425928:web:1898ebb5b8de87ecf3cdbd',
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || 'G-FRE3N3T6JH'
};

const app = initializeApp(firebaseConfig);

function createMainFirestore() {
  if (typeof window === 'undefined') {
    return getFirestore(app);
  }
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    });
  } catch {
    return getFirestore(app);
  }
}

export const db = createMainFirestore();

export const auth = getAuth(app);

export const storage = getStorage(app);

/**
 * Dedicated Firestore for live chat only (second Firebase project).
 * When VITE_FIREBASE_CHAT_* is unset, falls back to `db` so local builds keep working until the chat project exists.
 */
function getChatFirestore() {
  const apiKey = env.VITE_FIREBASE_CHAT_API_KEY;
  const projectId = env.VITE_FIREBASE_CHAT_PROJECT_ID;
  const appId = env.VITE_FIREBASE_CHAT_APP_ID;
  const messagingSenderId = env.VITE_FIREBASE_CHAT_MESSAGING_SENDER_ID;
  if (!apiKey || !projectId || !appId || !messagingSenderId) {
    return db;
  }
  const chatConfig = {
    apiKey,
    authDomain: env.VITE_FIREBASE_CHAT_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
    projectId,
    storageBucket:
      env.VITE_FIREBASE_CHAT_STORAGE_BUCKET || `${projectId}.firebasestorage.app`,
    messagingSenderId,
    appId,
    measurementId: env.VITE_FIREBASE_CHAT_MEASUREMENT_ID
  };
  let chatApp;
  try {
    chatApp = getApp('chat');
  } catch {
    chatApp = initializeApp(chatConfig, 'chat');
  }
  if (typeof window === 'undefined') {
    return getFirestore(chatApp);
  }
  try {
    return initializeFirestore(chatApp, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    });
  } catch {
    return getFirestore(chatApp);
  }
}

export const dbChat = getChatFirestore();

/** True when live chat reads/writes a second Firebase project (`VITE_FIREBASE_CHAT_*`). */
export function usesDedicatedChatFirebase() {
  return !!(env.VITE_FIREBASE_CHAT_API_KEY && env.VITE_FIREBASE_CHAT_PROJECT_ID);
}

/** Must match HTTPS Callable deployments (Europe default). */
export const FUNCTIONS_REGION = env.VITE_FIREBASE_FUNCTIONS_REGION || 'europe-west1';

/** Auth instance whose tokens are enforced by chat Firestore rules (primary app unless dedicated chat SDK). */
let chatAuthMemo = null;
export function getChatAuth() {
  if (chatAuthMemo) return chatAuthMemo;
  chatAuthMemo = usesDedicatedChatFirebase() ? getAuth(getApp('chat')) : auth;
  return chatAuthMemo;
}

let analytics = null;
if (typeof window !== 'undefined') {
  try {
    analytics = getAnalytics(app);
  } catch (error) {
  }
}
export { analytics };

export default app;
