/** Live chat Firestore API — split modules; import from `../liveChat.js` (barrel). */

export {
  MAIN_ROOM_ID,
  ROOMS_COL,
  MUTES_COL,
  PRESENCE_HEARTBEAT_VISIBLE_MS,
  PRESENCE_HEARTBEAT_HIDDEN_MS,
  PRESENCE_ONLINE_THRESHOLD_MS
} from './constants.js';

export { getChatMute, subscribeChatMute, setChatMute, clearChatMute, clearRoomMuteForUser } from './mutes.js';

export {
  subscribeMainRoomLastActivity,
  subscribeLiveChatSettings,
  subscribeMessages,
  subscribeMembers,
  subscribeTyping,
  subscribeReactions
} from './subscriptions.js';

export { ensureMainRoom, getRoom, subscribeRoom, listActiveRooms, listMyPrivateRooms, listChannels } from './roomQueries.js';

export {
  listPrivateRoomsWhereCanInvite,
  createPrivateRoom,
  createChannel,
  inviteForumUsersToPrivateRoom,
  declineRoomInvite,
  setPrivateRoomInviteLink,
  regeneratePrivateRoomInviteToken,
  findPrivateRoomByInviteToken,
  joinPrivateRoomViaInvite,
  removeParticipantFromPrivateRoom
} from './roomPrivate.js';

export { joinRoom, updateObserveMode, heartbeatMember, leaveRoom } from './roomLifecycle.js';

export { tryDeleteRoomIfEmpty } from './roomCleanup.js';

export { purgeForumUserFromChat } from './userCleanup.js';

export {
  closeRoom,
  renameRoom,
  setRoomDescription,
  setRoomCategory,
  setMemberRoomTitle,
  setRoomSlowMode,
  setRoomAdminsOnlyMode,
  setMemberVoice,
  promoteRoomAdmin,
  pinMessage,
  softDeleteMessage,
  setRoomLinkedTopic
} from './roomModeration.js';

export { sendTypingPulse, clearTyping } from './typing.js';

export { loadOlderMessages, updateMemberLastRead } from './messagesRead.js';

export { buildMemberNicknamesForMentions, maybeNotifyMentions } from './mentions.js';

export {
  submitChatMessageReport,
  listChatMessageReports,
  updateChatReportStatus
} from './reports.js';

export { sendSystemLine } from './systemLine.js';

export { sendChatMessage } from './sendMessage.js';

export { toggleReaction } from './reactions.js';
