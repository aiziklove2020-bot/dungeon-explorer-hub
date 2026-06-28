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
  Timestamp,
  arrayUnion,
  arrayRemove,
  increment,
  getCountFromServer,
  runTransaction
} from 'firebase/firestore';
import { db } from './config';

const POSTS_COL = 'blogPosts';
const COMMENTS_COL = 'blogComments';
const FOLLOWS_COL = 'blogAuthorFollows';

const followDocId = (followerId, authorId) => `${followerId}_${authorId}`;

// --------------- Posts ---------------

export const getBlogPosts = async () => {
  const q = query(collection(db, POSTS_COL), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const getBlogPostsByAuthor = async (authorId) => {
  const q = query(
    collection(db, POSTS_COL),
    where('authorId', '==', authorId)
  );
  const snap = await getDocs(q);
  const posts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  posts.sort((a, b) => {
    const ta = a.createdAt?.seconds || 0;
    const tb = b.createdAt?.seconds || 0;
    return tb - ta;
  });
  return posts;
};

export const getBlogPostById = async (postId) => {
  if (!postId) return null;
  const snap = await getDoc(doc(db, POSTS_COL, postId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const createBlogPost = async (data) => {
  const ref = doc(collection(db, POSTS_COL));
  const now = Timestamp.now();
  const payload = {
    title: data.title || '',
    content: data.content || '',
    images: data.images || [],
    authorId: data.authorId,
    authorName: data.authorName || '',
    tags: (data.tags || []).slice(0, 3),
    poll: data.poll || null,
    createdAt: now,
    updatedAt: now,
    commentCount: 0,
    likes: [],
    likeCount: 0
  };
  await setDoc(ref, payload);
  return { id: ref.id, ...payload };
};

export const updateBlogPost = async (postId, updates) => {
  await updateDoc(doc(db, POSTS_COL, postId), {
    ...updates,
    updatedAt: Timestamp.now()
  });
};

export const deleteBlogPost = async (postId) => {
  const commentsSnap = await getDocs(
    query(collection(db, COMMENTS_COL), where('postId', '==', postId))
  );
  for (const c of commentsSnap.docs) await deleteDoc(c.ref);
  await deleteDoc(doc(db, POSTS_COL, postId));
};

export const voteOnBlogPoll = async (postId, optionIndex, userId) => {
  const ref = doc(db, POSTS_COL, postId);
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

export const toggleLikeBlogPost = async (postId, userId) => {
  const ref = doc(db, POSTS_COL, postId);
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

// --------------- Comments ---------------

export const getCommentsByPost = async (postId) => {
  const q = query(
    collection(db, COMMENTS_COL),
    where('postId', '==', postId)
  );
  const snap = await getDocs(q);
  const comments = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  comments.sort((a, b) => {
    const ta = a.createdAt?.seconds || 0;
    const tb = b.createdAt?.seconds || 0;
    return ta - tb;
  });
  return comments;
};

export const createBlogComment = async (data) => {
  const ref = doc(collection(db, COMMENTS_COL));
  const now = Timestamp.now();
  const payload = {
    postId: data.postId,
    content: data.content || '',
    images: data.images || [],
    authorId: data.authorId,
    authorName: data.authorName || '',
    createdAt: now,
    updatedAt: now,
    editedAt: null,
    likes: [],
    likeCount: 0
  };
  await setDoc(ref, payload);

  await updateDoc(doc(db, POSTS_COL, data.postId), {
    commentCount: increment(1)
  });

  return { id: ref.id, ...payload };
};

export const updateBlogComment = async (commentId, updates) => {
  await updateDoc(doc(db, COMMENTS_COL, commentId), {
    ...updates,
    updatedAt: Timestamp.now(),
    editedAt: Timestamp.now()
  });
};

export const deleteBlogComment = async (commentId) => {
  const snap = await getDoc(doc(db, COMMENTS_COL, commentId));
  if (!snap.exists()) return;
  const postId = snap.data().postId;
  await deleteDoc(doc(db, COMMENTS_COL, commentId));
  await updateDoc(doc(db, POSTS_COL, postId), {
    commentCount: increment(-1)
  });
};

export const toggleLikeBlogComment = async (commentId, userId) => {
  const ref = doc(db, COMMENTS_COL, commentId);
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

// --------------- Author follows (favorites) ---------------

export const getBlogFollowsForUser = async (followerId) => {
  if (!followerId) return [];
  const q = query(collection(db, FOLLOWS_COL), where('followerId', '==', followerId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const getBlogFollowerCount = async (authorId) => {
  if (!authorId) return 0;
  const q = query(collection(db, FOLLOWS_COL), where('authorId', '==', authorId));
  const agg = await getCountFromServer(q);
  return agg.data().count;
};

export const getBlogFollowerCountsForAuthors = async (authorIds) => {
  const unique = [...new Set((authorIds || []).filter(Boolean))];
  const entries = await Promise.all(
    unique.map(async (id) => [id, await getBlogFollowerCount(id)])
  );
  return Object.fromEntries(entries);
};

const maxTimestamp = (a, b) => {
  const sa = a?.seconds ?? 0;
  const sb = b?.seconds ?? 0;
  return sa >= sb ? a : b;
};

export const followBlogAuthor = async (followerId, authorId, authorName) => {
  if (!followerId || !authorId || followerId === authorId) return;
  const posts = await getBlogPostsByAuthor(authorId);
  let lastSeenAt = Timestamp.now();
  const withTime = posts.filter((p) => p.createdAt);
  if (withTime.length > 0) {
    lastSeenAt = withTime.reduce((best, p) => maxTimestamp(best, p.createdAt), withTime[0].createdAt);
  }
  const ref = doc(db, FOLLOWS_COL, followDocId(followerId, authorId));
  await setDoc(ref, {
    followerId,
    authorId,
    authorName: (authorName || '').slice(0, 80),
    createdAt: Timestamp.now(),
    lastSeenAt
  });
};

export const unfollowBlogAuthor = async (followerId, authorId) => {
  if (!followerId || !authorId) return;
  await deleteDoc(doc(db, FOLLOWS_COL, followDocId(followerId, authorId)));
};

export const markBlogAuthorSeen = async (followerId, authorId) => {
  if (!followerId || !authorId) return;
  const ref = doc(db, FOLLOWS_COL, followDocId(followerId, authorId));
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const posts = await getBlogPostsByAuthor(authorId);
  let lastSeenAt = Timestamp.now();
  const withTime = posts.filter((p) => p.createdAt);
  if (withTime.length > 0) {
    lastSeenAt = withTime.reduce((best, p) => maxTimestamp(best, p.createdAt), withTime[0].createdAt);
  }
  await updateDoc(ref, { lastSeenAt });
};
