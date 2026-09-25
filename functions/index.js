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

// forumTopics/forumReplies are denied outright in firestore.rules ("no code
// anywhere in this repo reads or writes either collection" — the old-style
// forum was superseded by the live chat + blog comments) — these two
// triggers can never fire and are left undeployed rather than kept as dead
// weight. Restore if that collection is ever brought back.
export const sanitizeBlogPostContent = onDocumentWritten('blogPosts/{docId}', (event) =>
  sanitizeContentField(event, 'content')
);

export const sanitizeBlogCommentContent = onDocumentWritten('blogComments/{docId}', (event) =>
  sanitizeContentField(event, 'content')
);

// The live-chat Cloud Functions (notifyChatMentionsOnMessageCreate,
// issueForumChatToken, sendLiveChatMessage, sendLiveChatSystemLine) are not
// exported here anymore. firestore.rules denies all read/write on
// chatRooms/** and its subcollections outright ("feature removed from the
// app"), which means sendLiveChatMessage's own "join room first" check
// (reading chatRooms/{roomId}/members/{uid}) can never pass for any real
// caller — every invocation was already failing before this change, not a
// live feature these functions supported. Round-18 audit also found the
// still-deployed public bundle (public/assets/site-data.js) calling these
// via httpsCallable and hitting that same dead end. Leaving them deployed
// only burns invocations for a call path that can never succeed and (via
// issueForumChatToken's chatGlobalMod custom-token claim, which is never
// re-verified against current Firestore state per call) carried a
// stale-privilege risk that's moot now but not worth leaving deployed.
// Source files are kept in place, undeployed, in case live chat is
// rebuilt with real firestore.rules for it.
export { autoProvisionFemaleUsers } from './autoProvisionFemaleUsers.js';
