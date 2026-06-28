import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { dbChat } from '../config';

export async function submitChatMessageReport({
  roomId,
  messageId,
  reporterId,
  reporterNickname,
  reason
}) {
  if (!roomId || !messageId || !reporterId) throw new Error('חסר מידע');
  await addDoc(collection(dbChat, 'chatMessageReports'), {
    roomId,
    messageId,
    reporterId,
    reporterNickname: (reporterNickname || '').slice(0, 40),
    reason: (reason || '').slice(0, 500),
    createdAt: serverTimestamp(),
    status: 'open'
  });
}

export async function listChatMessageReports(limitN = 80) {
  const q = query(
    collection(dbChat, 'chatMessageReports'),
    orderBy('createdAt', 'desc'),
    limit(limitN)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function updateChatReportStatus(reportId, status, notes = '') {
  const allowed = ['open', 'dismissed', 'actioned'];
  if (!allowed.includes(status)) throw new Error('סטטוס לא תקין');
  await updateDoc(doc(dbChat, 'chatMessageReports', reportId), {
    status,
    notes: (notes || '').slice(0, 500),
    processedAt: Timestamp.now()
  });
}
