/** Client-side permission helpers for live chat (until Firebase Auth backs identities). */

export function isSiteAdmin(siteUser) {
  return siteUser?.level === 'admin';
}

export function isForumAdminRole(forumUser) {
  return forumUser?.role === 'forumAdmin';
}

/** Site admin or forum moderator — global chat powers. */
export function canGlobalModerate(siteUser, forumUser) {
  return isSiteAdmin(siteUser) || isForumAdminRole(forumUser);
}

/**
 * Room-level moderation: global mods, room creator, or roomAdmin member doc.
 */
export function isRoomStaff(room, forumUser, siteUser, memberDoc) {
  if (canGlobalModerate(siteUser, forumUser)) return true;
  if (!forumUser?.id || !room) return false;
  if (room.createdByForumUserId === forumUser.id) return true;
  if (memberDoc?.role === 'roomAdmin') return true;
  return false;
}

/** Private rooms only: creator or promoted roomAdmin may invite (not global mods as plain members). */
export function canInviteToPrivateRoom(room, forumUser, memberDoc) {
  if (!room || room.type !== 'private' || !forumUser?.id || !memberDoc) return false;
  if (room.createdByForumUserId === forumUser.id) return true;
  return memberDoc.role === 'roomAdmin';
}

/** Room owner may not strip powers from a forum admin user. */
export function targetIsProtectedForumAdmin(targetForumUser) {
  return targetForumUser?.role === 'forumAdmin';
}

/** Private room creator (not the synthetic main-room owner id). */
export function isRoomCreator(room, forumUserId) {
  if (!room || !forumUserId) return false;
  const owner = room.createdByForumUserId;
  return !!owner && owner !== 'system' && owner === forumUserId;
}

/**
 * Private-room invite list (`participantIds`):
 * - Forum admins who open a room **without** being on this list are present for moderation only;
 *   they must not be surfaced like normal members (roster, typing, @-mention targets, etc.).
 * - Once **on** this list (invited or creator/join flow), they behave like any other participant
 *   for visibility, plus their usual forum-admin powers.
 * Non-private rooms: always true (everyone counts as “on the list” for this helper).
 */
export function isPrivateRoomInvitedParticipant(room, forumUserId) {
  if (!forumUserId) return false;
  if (room?.type !== 'private') return true;
  return (room.participantIds || []).includes(forumUserId);
}

/**
 * When adminsOnlyMode is on, only staff or members with hasVoice may post.
 */
export function canPostInRoom(room, forumUser, siteUser, memberDoc) {
  if (!room) return false;
  if (!room.adminsOnlyMode) return true;
  if (isRoomStaff(room, forumUser, siteUser, memberDoc)) return true;
  return memberDoc?.hasVoice === true;
}

/**
 * Who may toggle admins-only speaking mode: private room staff; main room and
 * public channels only by global mods (channel staff = forum admin who created
 * it, which is itself a global mod, so this collapses to canGlobalModerate).
 */
export function canToggleAdminsOnlyMode(room, siteUser, forumUser, memberDoc) {
  if (!room) return false;
  if (room.type === 'main' || room.type === 'channel') {
    return canGlobalModerate(siteUser, forumUser);
  }
  return isRoomStaff(room, forumUser, siteUser, memberDoc);
}

/**
 * May actor demote target from roomAdmin to member? Creator cannot be demoted by non–global-mods.
 */
export function canDemoteRoomAdmin(room, actorSiteUser, actorForumUser, targetForumUserId) {
  if (!room || !targetForumUserId) return false;
  if (canGlobalModerate(actorSiteUser, actorForumUser)) return true;
  const ownerId = room.createdByForumUserId;
  if (ownerId && ownerId !== 'system' && targetForumUserId === ownerId) return false;
  return true;
}
