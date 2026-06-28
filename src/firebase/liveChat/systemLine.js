import { collection, addDoc, updateDoc, doc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { httpsCallable, getFunctions } from 'firebase/functions';
import app, { dbChat, getChatAuth, FUNCTIONS_REGION } from '../config';
import { getLiveChatSettings } from '../settings';
import { ROOMS_COL } from './constants.js';
import { computeExpireAtFromDays } from './helpers.js';

function useCallableSystemLine() {
  return (
    typeof import.meta !== 'undefined' &&
    String(import.meta.env?.VITE_CHAT_CALLABLE_SEND ?? 'false').toLowerCase() === 'true'
  );
}

async function sendSystemLineDirect(roomId, text) {
  const settings = await getLiveChatSettings();
  const expireAt = computeExpireAtFromDays(settings.retentionDays);
  await addDoc(collection(dbChat, ROOMS_COL, roomId, 'messages'), {
    authorId: 'system',
    authorNickname: '',
    text: (text || '').slice(0, 500),
    createdAt: serverTimestamp(),
    deleted: false,
    expireAt,
    isSystem: true
  });
  await updateDoc(doc(dbChat, ROOMS_COL, roomId), {
    lastActivityAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });
}

export async function sendSystemLine(roomId, text) {
  if (!useCallableSystemLine()) {
    return sendSystemLineDirect(roomId, text);
  }
  if (!getChatAuth()?.currentUser) {
    throw new Error('נדרש התחברות לצ׳אט');
  }
  const fn = httpsCallable(getFunctions(app, FUNCTIONS_REGION), 'sendLiveChatSystemLine');
  try {
    await fn({ roomId, text });
  } catch {
    if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
      return sendSystemLineDirect(roomId, text);
    }
    throw new Error('שגיאה בשליחת שורת מערכת');
  }
}
