import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
  getDocs,
  deleteDoc
} from 'firebase/firestore';
import { db } from './config';

const SUPPORT_CHAT_COLLECTION = 'supportChat';

const getOrCreateSessionId = () => {
  let sessionId = localStorage.getItem('support_chat_session');
  if (!sessionId) {
    sessionId = `sc_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    localStorage.setItem('support_chat_session', sessionId);
  }
  return sessionId;
};

export const getSessionId = getOrCreateSessionId;

export const sendSupportMessage = async (text, sessionId = getOrCreateSessionId()) => {
  if (!text || !text.trim()) return null;
  const messagesRef = collection(db, SUPPORT_CHAT_COLLECTION, sessionId, 'messages');
  const docRef = await addDoc(messagesRef, {
    role: 'user',
    text: text.trim(),
    createdAt: serverTimestamp()
  });
  return docRef.id;
};

/**
 * Notify Telegram via same-origin API (Telegram Bot API has no CORS; token stays server-side).
 * displayName is optional.
 */
export const sendSupportToTelegram = async (sessionId, text, displayName = null) => {
  if (!sessionId || !text?.trim()) return null;
  const base = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL
    ? String(import.meta.env.BASE_URL).replace(/\/+$/, '')
    : '') || '';
  const url = `${base}/api/support-chat-send`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId,
      text: text.trim(),
      displayName: displayName?.trim() || null
    })
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(data.error || resp.statusText || 'Telegram relay failed');
  }
  return data.telegramMessageId ?? null;
};

export const subscribeToSupportMessages = (sessionId, callback) => {
  const messagesRef = collection(db, SUPPORT_CHAT_COLLECTION, sessionId, 'messages');
  const q = query(messagesRef, orderBy('createdAt', 'asc'), limit(100));
  const handleSnapshot = (snapshot) => {
    const messages = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: d.data().createdAt?.toDate?.() || d.data().createdAt
    }));
    callback(messages);
  };
  return onSnapshot(q, handleSnapshot, (err) => console.error('supportChat onSnapshot error:', err));
};

/** One-time fetch from server - use when tab becomes visible to force fresh data */
export const fetchSupportMessages = async (sessionId) => {
  const messagesRef = collection(db, SUPPORT_CHAT_COLLECTION, sessionId, 'messages');
  const q = query(messagesRef, orderBy('createdAt', 'asc'), limit(100));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    createdAt: d.data().createdAt?.toDate?.() || d.data().createdAt
  }));
};

/** Delete all messages in this chat session (client-side). */
export const deleteSupportChatSession = async (sessionId) => {
  const messagesRef = collection(db, SUPPORT_CHAT_COLLECTION, sessionId, 'messages');
  const q = query(messagesRef, limit(200));
  const snapshot = await getDocs(q);
  await Promise.all(snapshot.docs.map((d) => deleteDoc(d.ref)));
};

// getSupportChatSettings and updateSupportChatSettings are in settings.js (same pattern as Telegram, etc.)
