/**
 * Firestore triggers: normalize forum/blog HTML server-side (defense in depth).
 * Deploy: firebase deploy --only functions
 */
import { initializeApp } from 'firebase-admin/app';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { logger } from 'firebase-functions';
import { sanitizeRichHtml } from './sanitizeRichHtml.js';

initializeApp();

async function sanitizeContentField(event, fieldName = 'content') {
  const after = event.data?.after;
  if (!after?.exists) return;
  const data = after.data();
  const raw = data?.[fieldName];
  if (typeof raw !== 'string') return;
  const clean = sanitizeRichHtml(raw);
  if (clean === raw) return;
  try {
    await after.ref.update({ [fieldName]: clean });
  } catch (e) {
    logger.error('sanitizeContentField failed', e);
  }
}

export const sanitizeForumTopicContent = onDocumentWritten('forumTopics/{docId}', (event) =>
  sanitizeContentField(event, 'content')
);

export const sanitizeForumReplyContent = onDocumentWritten('forumReplies/{docId}', (event) =>
  sanitizeContentField(event, 'content')
);

export const sanitizeBlogPostContent = onDocumentWritten('blogPosts/{docId}', (event) =>
  sanitizeContentField(event, 'content')
);

export const sanitizeBlogCommentContent = onDocumentWritten('blogComments/{docId}', (event) =>
  sanitizeContentField(event, 'content')
);

export { notifyChatMentionsOnMessageCreate } from './chatMentionsTrigger.js';
export { issueForumChatToken } from './issueForumChatToken.js';
export { sendLiveChatMessage } from './sendLiveChatMessage.js';
export { sendLiveChatSystemLine } from './sendLiveChatSystemLine.js';
export { autoProvisionFemaleUsers } from './autoProvisionFemaleUsers.js';
