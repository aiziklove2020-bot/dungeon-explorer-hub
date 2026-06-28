import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  arrayUnion,
  arrayRemove,
  increment,
  runTransaction
} from 'firebase/firestore';
import { db } from './config';

const SECTIONS_COL = 'forumSections';
const TOPICS_COL = 'forumTopics';
const REPLIES_COL = 'forumReplies';

// Defensive caps so a runaway section/topic cannot cost thousands of reads
// per page view. TODO: introduce real pagination (cursor + load-more) when
// any single section/topic legitimately approaches these caps.
const TOPICS_HARD_LIMIT = 500;
const REPLIES_HARD_LIMIT = 1000;
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dya5cymnl';
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'TBDSM-ING';

// --------------- Image upload ---------------

export const uploadForumImage = async (file) => {
  if (!file.type.startsWith('image/')) throw new Error('File must be an image');
  if (file.size > 5 * 1024 * 1024) throw new Error('Image must be under 5 MB');

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  );
  const data = await res.json();
  if (res.ok && data?.secure_url) return data.secure_url;
  throw new Error(data?.error?.message || 'Image upload failed');
};

// --------------- Sections ---------------

export const getForumSections = async () => {
  const q = query(collection(db, SECTIONS_COL), orderBy('order', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const getVisibleForumSections = async () => {
  const all = await getForumSections();
  return all.filter(s => s.visible !== false);
};

export const getForumSectionById = async (id) => {
  if (!id) return null;
  const snap = await getDoc(doc(db, SECTIONS_COL, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const createForumSection = async (data) => {
  const all = await getForumSections();
  const maxOrder = all.reduce((m, s) => Math.max(m, s.order || 0), 0);
  const ref = doc(collection(db, SECTIONS_COL));
  const payload = {
    title: data.title || '',
    description: data.description || '',
    order: maxOrder + 1,
    visible: true,
    topicCount: 0,
    lastTopicAt: null,
    createdAt: Timestamp.now()
  };
  await setDoc(ref, payload);
  return { id: ref.id, ...payload };
};

export const updateForumSection = async (id, updates) => {
  await updateDoc(doc(db, SECTIONS_COL, id), updates);
};

export const deleteForumSection = async (id) => {
  const topicsSnap = await getDocs(query(collection(db, TOPICS_COL), where('sectionId', '==', id)));
  for (const t of topicsSnap.docs) {
    const repliesSnap = await getDocs(query(collection(db, REPLIES_COL), where('topicId', '==', t.id)));
    for (const r of repliesSnap.docs) await deleteDoc(r.ref);
    await deleteDoc(t.ref);
  }
  await deleteDoc(doc(db, SECTIONS_COL, id));
};

export const reorderForumSections = async (orderedIds) => {
  for (let i = 0; i < orderedIds.length; i++) {
    await updateDoc(doc(db, SECTIONS_COL, orderedIds[i]), { order: i });
  }
};

// --------------- Topics ---------------

export const getTopicsBySection = async (sectionId) => {
  const q = query(
    collection(db, TOPICS_COL),
    where('sectionId', '==', sectionId),
    limit(TOPICS_HARD_LIMIT)
  );
  const snap = await getDocs(q);
  const topics = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const activitySec = (t) => {
    const c = t.createdAt?.seconds || 0;
    const l = t.lastReplyAt?.seconds || 0;
    return Math.max(c, l);
  };
  topics.sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return activitySec(b) - activitySec(a);
  });
  return topics;
};

export const getTopicsByAuthor = async (authorId, limit = 5) => {
  if (!authorId) return [];
  const q = query(collection(db, TOPICS_COL), where('authorId', '==', authorId));
  const snap = await getDocs(q);
  const topics = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  topics.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  return topics.slice(0, limit);
};

export const getTopicById = async (topicId) => {
  if (!topicId) return null;
  const snap = await getDoc(doc(db, TOPICS_COL, topicId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const createTopic = async (data) => {
  const ref = doc(collection(db, TOPICS_COL));
  const now = Timestamp.now();
  const payload = {
    sectionId: data.sectionId,
    title: data.title || '',
    content: data.content || '',
    images: data.images || [],
    authorId: data.authorId,
    authorName: data.authorName || '',
    tags: (data.tags || []).slice(0, 3),
    poll: data.poll || null,
    createdAt: now,
    updatedAt: now,
    isPinned: false,
    isLocked: false,
    replyCount: 0,
    lastReplyAt: null,
    lastReplyAuthorName: null,
    likes: [],
    likeCount: 0
  };
  await setDoc(ref, payload);

  await updateDoc(doc(db, SECTIONS_COL, data.sectionId), {
    topicCount: increment(1),
    lastTopicAt: now
  });

  return { id: ref.id, ...payload };
};

export const updateTopic = async (topicId, updates) => {
  await updateDoc(doc(db, TOPICS_COL, topicId), { ...updates, updatedAt: Timestamp.now() });
};

export const deleteTopic = async (topicId) => {
  const topic = await getTopicById(topicId);
  if (!topic) return;

  const repliesSnap = await getDocs(query(collection(db, REPLIES_COL), where('topicId', '==', topicId)));
  for (const r of repliesSnap.docs) await deleteDoc(r.ref);

  await deleteDoc(doc(db, TOPICS_COL, topicId));

  await updateDoc(doc(db, SECTIONS_COL, topic.sectionId), {
    topicCount: increment(-1)
  });
};

export const togglePinTopic = async (topicId) => {
  const topic = await getTopicById(topicId);
  if (!topic) return;
  await updateDoc(doc(db, TOPICS_COL, topicId), { isPinned: !topic.isPinned });
};

export const toggleLockTopic = async (topicId) => {
  const topic = await getTopicById(topicId);
  if (!topic) return;
  await updateDoc(doc(db, TOPICS_COL, topicId), { isLocked: !topic.isLocked });
};

export const toggleLikeTopic = async (topicId, userId) => {
  const ref = doc(db, TOPICS_COL, topicId);
  return runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists()) return false;
    const data = snap.data();
    const alreadyLiked = (data.likes || []).includes(userId);
    transaction.update(ref, {
      likes: alreadyLiked ? arrayRemove(userId) : arrayUnion(userId),
      likeCount: increment(alreadyLiked ? -1 : 1)
    });
    return !alreadyLiked;
  });
};

// --------------- Replies ---------------

export const getRepliesByTopic = async (topicId) => {
  const q = query(
    collection(db, REPLIES_COL),
    where('topicId', '==', topicId),
    limit(REPLIES_HARD_LIMIT)
  );
  const snap = await getDocs(q);
  const replies = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  replies.sort((a, b) => {
    const ta = a.createdAt?.seconds || 0;
    const tb = b.createdAt?.seconds || 0;
    return ta - tb;
  });
  return replies;
};

export const createReply = async (data) => {
  const ref = doc(collection(db, REPLIES_COL));
  const now = Timestamp.now();
  const payload = {
    topicId: data.topicId,
    content: data.content || '',
    images: data.images || [],
    authorId: data.authorId,
    authorName: data.authorName || '',
    createdAt: now,
    updatedAt: now,
    editedAt: null,
    quotedReplyId: data.quotedReplyId || null,
    quotedContent: data.quotedContent || null,
    quotedAuthorName: data.quotedAuthorName || null,
    likes: [],
    likeCount: 0
  };
  await setDoc(ref, payload);

  await updateDoc(doc(db, TOPICS_COL, data.topicId), {
    replyCount: increment(1),
    lastReplyAt: now,
    lastReplyAuthorName: data.authorName || ''
  });

  return { id: ref.id, ...payload };
};

export const updateReply = async (replyId, updates) => {
  await updateDoc(doc(db, REPLIES_COL, replyId), {
    ...updates,
    updatedAt: Timestamp.now(),
    editedAt: Timestamp.now()
  });
};

export const deleteReply = async (replyId) => {
  const snap = await getDoc(doc(db, REPLIES_COL, replyId));
  if (!snap.exists()) return;
  const topicId = snap.data().topicId;
  await deleteDoc(doc(db, REPLIES_COL, replyId));
  await updateDoc(doc(db, TOPICS_COL, topicId), {
    replyCount: increment(-1)
  });
  const remaining = await getRepliesByTopic(topicId);
  if (remaining.length === 0) {
    await updateDoc(doc(db, TOPICS_COL, topicId), {
      lastReplyAt: null,
      lastReplyAuthorName: null
    });
  } else {
    const last = remaining.reduce((best, r) => {
      const rs = r.createdAt?.seconds ?? 0;
      const bs = best.createdAt?.seconds ?? 0;
      return rs >= bs ? r : best;
    }, remaining[0]);
    await updateDoc(doc(db, TOPICS_COL, topicId), {
      lastReplyAt: last.createdAt,
      lastReplyAuthorName: last.authorName || ''
    });
  }
};

export const voteOnTopicPoll = async (topicId, optionIndex, userId) => {
  const ref = doc(db, TOPICS_COL, topicId);
  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists()) return;
    const poll = snap.data().poll;
    if (!poll) return;
    const votes = { ...(poll.votes || {}) };
    if (Object.values(votes).includes(userId)) return;
    votes[`${optionIndex}_${userId}`] = userId;
    transaction.update(ref, { 'poll.votes': votes });
  });
};

export const toggleLikeReply = async (replyId, userId) => {
  const ref = doc(db, REPLIES_COL, replyId);
  return runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists()) return false;
    const data = snap.data();
    const alreadyLiked = (data.likes || []).includes(userId);
    transaction.update(ref, {
      likes: alreadyLiked ? arrayRemove(userId) : arrayUnion(userId),
      likeCount: increment(alreadyLiked ? -1 : 1)
    });
    return !alreadyLiked;
  });
};
