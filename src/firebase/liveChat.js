/**
 * Chat backend adapter.
 * - `VITE_CHAT_BACKEND=firebase` (default): existing Firestore implementation.
 * - `VITE_CHAT_BACKEND=supabase`: use Supabase adapter where implemented, fallback to Firebase for gaps.
 */
import * as firebaseChat from './liveChat/index.js';
import * as supabaseChat from '../supabase/chat/index.js';
import { isSupabaseChatBackend } from '../chat/backend';

function pickModule() {
  return isSupabaseChatBackend() ? supabaseChat : firebaseChat;
}

function pickFn(name) {
  const mod = pickModule();
  return typeof mod[name] === 'function' ? mod[name] : firebaseChat[name];
}

export const MAIN_ROOM_ID = firebaseChat.MAIN_ROOM_ID;
export const ROOMS_COL = firebaseChat.ROOMS_COL;
export const MUTES_COL = firebaseChat.MUTES_COL;
export const PRESENCE_HEARTBEAT_VISIBLE_MS = firebaseChat.PRESENCE_HEARTBEAT_VISIBLE_MS;
export const PRESENCE_HEARTBEAT_HIDDEN_MS = firebaseChat.PRESENCE_HEARTBEAT_HIDDEN_MS;
export const PRESENCE_ONLINE_THRESHOLD_MS = firebaseChat.PRESENCE_ONLINE_THRESHOLD_MS;

export const getChatMute = (...a) => pickFn('getChatMute')(...a);
export const subscribeChatMute = (...a) => pickFn('subscribeChatMute')(...a);
export const setChatMute = (...a) => pickFn('setChatMute')(...a);
export const clearChatMute = (...a) => pickFn('clearChatMute')(...a);
export const clearRoomMuteForUser = (...a) => pickFn('clearRoomMuteForUser')(...a);

export const subscribeMainRoomLastActivity = (...a) => pickFn('subscribeMainRoomLastActivity')(...a);
export const subscribeLiveChatSettings = (...a) => pickFn('subscribeLiveChatSettings')(...a);
export const subscribeMessages = (...a) => pickFn('subscribeMessages')(...a);
export const subscribeMembers = (...a) => pickFn('subscribeMembers')(...a);
export const subscribeTyping = (...a) => pickFn('subscribeTyping')(...a);
export const subscribeReactions = (...a) => pickFn('subscribeReactions')(...a);

export const ensureMainRoom = (...a) => pickFn('ensureMainRoom')(...a);
export const getRoom = (...a) => pickFn('getRoom')(...a);
export const subscribeRoom = (...a) => pickFn('subscribeRoom')(...a);
export const listActiveRooms = (...a) => pickFn('listActiveRooms')(...a);
export const listMyPrivateRooms = (...a) => pickFn('listMyPrivateRooms')(...a);
export const listChannels = (...a) => pickFn('listChannels')(...a);

export const listPrivateRoomsWhereCanInvite = (...a) => pickFn('listPrivateRoomsWhereCanInvite')(...a);
export const createPrivateRoom = (...a) => pickFn('createPrivateRoom')(...a);
export const createChannel = (...a) => pickFn('createChannel')(...a);
export const setRoomCategory = (...a) => pickFn('setRoomCategory')(...a);
export const inviteForumUsersToPrivateRoom = (...a) => pickFn('inviteForumUsersToPrivateRoom')(...a);
export const declineRoomInvite = (...a) => pickFn('declineRoomInvite')(...a);
export const setPrivateRoomInviteLink = (...a) => pickFn('setPrivateRoomInviteLink')(...a);
export const regeneratePrivateRoomInviteToken = (...a) => pickFn('regeneratePrivateRoomInviteToken')(...a);
export const findPrivateRoomByInviteToken = (...a) => pickFn('findPrivateRoomByInviteToken')(...a);
export const joinPrivateRoomViaInvite = (...a) => pickFn('joinPrivateRoomViaInvite')(...a);
export const removeParticipantFromPrivateRoom = (...a) => pickFn('removeParticipantFromPrivateRoom')(...a);

export const joinRoom = (...a) => pickFn('joinRoom')(...a);
export const updateObserveMode = (...a) => pickFn('updateObserveMode')(...a);
export const heartbeatMember = (...a) => pickFn('heartbeatMember')(...a);
export const leaveRoom = (...a) => pickFn('leaveRoom')(...a);

export const tryDeleteRoomIfEmpty = (...a) => pickFn('tryDeleteRoomIfEmpty')(...a);
export const purgeForumUserFromChat = (...a) => pickFn('purgeForumUserFromChat')(...a);

export const closeRoom = (...a) => pickFn('closeRoom')(...a);
export const renameRoom = (...a) => pickFn('renameRoom')(...a);
export const setRoomDescription = (...a) => pickFn('setRoomDescription')(...a);
export const setMemberRoomTitle = (...a) => pickFn('setMemberRoomTitle')(...a);
export const setRoomSlowMode = (...a) => pickFn('setRoomSlowMode')(...a);
export const setRoomAdminsOnlyMode = (...a) => pickFn('setRoomAdminsOnlyMode')(...a);
export const setMemberVoice = (...a) => pickFn('setMemberVoice')(...a);
export const promoteRoomAdmin = (...a) => pickFn('promoteRoomAdmin')(...a);
export const pinMessage = (...a) => pickFn('pinMessage')(...a);
export const softDeleteMessage = (...a) => pickFn('softDeleteMessage')(...a);
export const setRoomLinkedTopic = (...a) => pickFn('setRoomLinkedTopic')(...a);

export const sendTypingPulse = (...a) => pickFn('sendTypingPulse')(...a);
export const clearTyping = (...a) => pickFn('clearTyping')(...a);

export const loadOlderMessages = (...a) => pickFn('loadOlderMessages')(...a);
export const updateMemberLastRead = (...a) => pickFn('updateMemberLastRead')(...a);

export const buildMemberNicknamesForMentions = (...a) => pickFn('buildMemberNicknamesForMentions')(...a);
export const maybeNotifyMentions = (...a) => pickFn('maybeNotifyMentions')(...a);

export const submitChatMessageReport = (...a) => pickFn('submitChatMessageReport')(...a);
export const listChatMessageReports = (...a) => pickFn('listChatMessageReports')(...a);
export const updateChatReportStatus = (...a) => pickFn('updateChatReportStatus')(...a);

export const sendSystemLine = (...a) => pickFn('sendSystemLine')(...a);
export const sendChatMessage = (...a) => pickFn('sendChatMessage')(...a);
export const toggleReaction = (...a) => pickFn('toggleReaction')(...a);
