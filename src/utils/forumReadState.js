/**
 * Per-forum-user read state in localStorage: topicId -> last activity (unix seconds) seen.
 */

const storageKey = (userId) => `forumTopicReads_${userId}`;

export const getTopicActivitySeconds = (topic) => {
  if (!topic) return 0;
  const c = topic.createdAt?.seconds ?? 0;
  const l = topic.lastReplyAt?.seconds ?? 0;
  return Math.max(c, l);
};

export const getTopicReadMap = (userId) => {
  if (!userId || typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
};

export const markTopicRead = (userId, topicId, activitySeconds) => {
  if (!userId || !topicId || typeof localStorage === 'undefined') return;
  try {
    const map = getTopicReadMap(userId);
    const prev = map[topicId] ?? 0;
    map[topicId] = Math.max(prev, activitySeconds || 0);
    localStorage.setItem(storageKey(userId), JSON.stringify(map));
  } catch {}
};

/** Topic has new content (never opened, or activity after last read). */
export const isTopicUnread = (topic, userId) => {
  if (!userId || !topic?.id) return false;
  const activity = getTopicActivitySeconds(topic);
  if (activity <= 0) return false;
  const map = getTopicReadMap(userId);
  const lastRead = map[topic.id];
  if (lastRead == null) return true;
  return activity > lastRead;
};

export const countUnreadTopics = (topics, userId) => {
  if (!userId || !Array.isArray(topics)) return 0;
  return topics.filter((t) => isTopicUnread(t, userId)).length;
};
