/**
 * Admin-only endpoint for viewing and resolving chat message reports.
 *
 * GET  /api/chat-admin-reports?limit=100   → list reports (newest first)
 * POST /api/chat-admin-reports             → update status
 *      body: { reportId, status: 'open'|'dismissed'|'actioned', notes? }
 *
 * Auth: `Authorization: Bearer ${ADMIN_API_SECRET}` (matches `lib/apiAuth.js`).
 *
 * Why this exists:
 *   The chat report row in Supabase is protected by RLS that requires a forum-admin /
 *   global-mod JWT. The admin panel is a separate identity (per-admin password, not a
 *   forum login), so the panel often has no chat JWT — or an expired one — when the
 *   admin opens the reports tab. Without this endpoint, `listChatMessageReports` from
 *   the browser silently returns zero rows. We use the Supabase service role here so
 *   any authenticated admin can review reports.
 *
 * Backends:
 *   - Supabase (default in production): reads/updates `chat_message_reports`.
 *   - Firebase: falls back to the `chatMessageReports` collection on the chat project
 *     using the Admin SDK (works for both single-project and dedicated chat project).
 *
 * Env:
 *   - ADMIN_API_SECRET                       (required)
 *   - SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY  (Supabase backend)
 *   - GOOGLE_APPLICATION_CREDENTIALS_JSON     (Firebase backend; optional Supabase)
 */
import { requireAdminApiSecret } from '../lib/apiAuth.js';

const ALLOWED_STATUSES = new Set(['open', 'dismissed', 'actioned']);

function pickBackend() {
  const raw = String(process.env.VITE_CHAT_BACKEND || process.env.CHAT_BACKEND || '')
    .trim()
    .toLowerCase();
  if (raw === 'supabase') return 'supabase';
  if (raw === 'firebase') return 'firebase';
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) return 'supabase';
  return 'firebase';
}

let supabaseAdminMemo = null;
async function getSupabaseAdmin() {
  if (supabaseAdminMemo) return supabaseAdminMemo;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set');
  }
  const { createClient } = await import('@supabase/supabase-js');
  supabaseAdminMemo = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  return supabaseAdminMemo;
}

let firebaseAdminMemo = null;
async function getFirebaseAdmin() {
  const admin = (await import('firebase-admin')).default;
  if (firebaseAdminMemo) return admin;
  if (!admin.apps?.length) {
    const raw = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    if (!raw) throw new Error('GOOGLE_APPLICATION_CREDENTIALS_JSON not set');
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(raw)),
      projectId: process.env.GCLOUD_PROJECT || 'tbdsm-5acca'
    });
  }
  firebaseAdminMemo = true;
  return admin;
}

function mapSupabaseRow(r) {
  return {
    id: r.id,
    roomId: r.room_id,
    messageId: r.message_id,
    reporterId: r.reporter_id,
    reporterNickname: r.reporter_nickname,
    reason: r.reason,
    status: r.status,
    notes: r.notes,
    createdAt: r.created_at || null,
    processedAt: r.processed_at || null
  };
}

function mapFirebaseDoc(doc) {
  const d = doc.data() || {};
  const toIso = (v) => {
    if (!v) return null;
    if (typeof v?.toDate === 'function') return v.toDate().toISOString();
    if (typeof v?.seconds === 'number') return new Date(v.seconds * 1000).toISOString();
    return null;
  };
  return {
    id: doc.id,
    roomId: d.roomId || null,
    messageId: d.messageId || null,
    reporterId: d.reporterId || null,
    reporterNickname: d.reporterNickname || '',
    reason: d.reason || '',
    status: d.status || 'open',
    notes: d.notes || '',
    createdAt: toIso(d.createdAt),
    processedAt: toIso(d.processedAt)
  };
}

async function listSupabase(limitN) {
  const sb = await getSupabaseAdmin();
  const { data, error } = await sb
    .from('chat_message_reports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limitN);
  if (error) throw new Error(error.message || 'Supabase select failed');
  return (data || []).map(mapSupabaseRow);
}

async function listFirebase(limitN) {
  const admin = await getFirebaseAdmin();
  const snap = await admin
    .firestore()
    .collection('chatMessageReports')
    .orderBy('createdAt', 'desc')
    .limit(limitN)
    .get();
  return snap.docs.map(mapFirebaseDoc);
}

async function updateSupabase(reportId, status, notes) {
  const sb = await getSupabaseAdmin();
  const { error } = await sb
    .from('chat_message_reports')
    .update({
      status,
      notes: String(notes || '').slice(0, 500),
      processed_at: new Date().toISOString()
    })
    .eq('id', reportId);
  if (error) throw new Error(error.message || 'Supabase update failed');
}

async function updateFirebase(reportId, status, notes) {
  const admin = await getFirebaseAdmin();
  await admin
    .firestore()
    .collection('chatMessageReports')
    .doc(String(reportId))
    .update({
      status,
      notes: String(notes || '').slice(0, 500),
      processedAt: admin.firestore.Timestamp.now()
    });
}

export default async function handler(req, res) {
  if (!requireAdminApiSecret(req, res)) return;

  const backend = pickBackend();

  try {
    if (req.method === 'GET') {
      const raw = Number(req.query?.limit);
      const limitN = Number.isFinite(raw) ? Math.max(1, Math.min(500, raw)) : 100;
      const rows = backend === 'supabase' ? await listSupabase(limitN) : await listFirebase(limitN);
      return res.status(200).json({ backend, rows });
    }

    if (req.method === 'POST') {
      const body = (req.body && typeof req.body === 'object') ? req.body : {};
      const reportId = String(body.reportId || '').trim();
      const status = String(body.status || '').trim();
      const notes = body.notes != null ? String(body.notes) : '';
      if (!reportId) return res.status(400).json({ error: 'reportId required' });
      if (!ALLOWED_STATUSES.has(status)) {
        return res.status(400).json({ error: 'invalid status' });
      }
      if (backend === 'supabase') {
        await updateSupabase(reportId, status, notes);
      } else {
        await updateFirebase(reportId, status, notes);
      }
      return res.status(200).json({ ok: true, backend });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('chat-admin-reports', err);
    return res.status(500).json({ error: err.message || 'Internal error', backend });
  }
}
