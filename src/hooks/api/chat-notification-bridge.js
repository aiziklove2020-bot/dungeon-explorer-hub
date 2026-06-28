/**
 * Supabase -> Firebase notifications bridge for chat events.
 * Intended caller: Supabase webhook / edge function.
 *
 * Header: x-chat-bridge-secret: <SUPABASE_CHAT_BRIDGE_SECRET>
 * Body:
 * {
 *   "type": "chatMention" | "chatRoomInvite",
 *   "userId": "...",
 *   "fromUserId": "...",
 *   "fromUserName": "...",
 *   "refId": "<roomId>",
 *   "refTitle": "...",
 *   "message": "..."
 * }
 */

import crypto from 'node:crypto';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-chat-bridge-secret');
  res.setHeader('Access-Control-Max-Age', '86400');
}

function safeEq(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const ab = Buffer.from(a, 'utf-8');
  const bb = Buffer.from(b, 'utf-8');
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

let adminReady = false;
async function getAdmin() {
  const admin = (await import('firebase-admin')).default;
  if (adminReady) return admin;
  if (!admin.apps?.length) {
    const raw = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    if (!raw) throw new Error('GOOGLE_APPLICATION_CREDENTIALS_JSON missing');
    const cred = admin.credential.cert(JSON.parse(raw));
    admin.initializeApp({
      credential: cred,
      projectId: process.env.GCLOUD_PROJECT || 'tbdsm-5acca'
    });
  }
  adminReady = true;
  return admin;
}

async function createNotificationIfNew(db, payload) {
  const { userId, type, fromUserId, fromUserName, refId, refTitle, message } = payload;
  if (!userId || userId === fromUserId) return;
  const col = db.collection('notifications');
  const existing = await col
    .where('userId', '==', userId)
    .where('type', '==', type)
    .where('fromUserId', '==', fromUserId ?? null)
    .where('refId', '==', refId ?? null)
    .where('read', '==', false)
    .limit(1)
    .get();
  if (!existing.empty) return;
  await col.add({
    userId,
    type,
    fromUserId: fromUserId || null,
    fromUserName: String(fromUserName || '').slice(0, 40),
    refId: refId || null,
    refTitle: String(refTitle || '').slice(0, 100),
    message: String(message || '').slice(0, 200),
    read: false,
    createdAt: new Date()
  });
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const expectedSecret = process.env.SUPABASE_CHAT_BRIDGE_SECRET || '';
  const provided = req.headers['x-chat-bridge-secret'];
  if (!expectedSecret || !safeEq(String(provided || ''), expectedSecret)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const type = String(body.type || '');
    if (type !== 'chatMention' && type !== 'chatRoomInvite') {
      return res.status(400).json({ error: 'Unsupported type' });
    }
    const admin = await getAdmin();
    const db = admin.firestore();
    await createNotificationIfNew(db, {
      type,
      userId: body.userId,
      fromUserId: body.fromUserId || null,
      fromUserName: body.fromUserName || '',
      refId: body.refId || null,
      refTitle: body.refTitle || '',
      message: body.message || ''
    });
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('chat-notification-bridge', e);
    return res.status(500).json({ error: e.message || 'Internal error' });
  }
}

