import { describe, it, expect } from 'vitest';
import {
  isSiteAdmin,
  isForumAdminRole,
  canGlobalModerate,
  isRoomStaff,
  targetIsProtectedForumAdmin,
  canInviteToPrivateRoom,
  isRoomCreator,
  isPrivateRoomInvitedParticipant,
  canPostInRoom,
  canToggleAdminsOnlyMode,
  canDemoteRoomAdmin
} from './liveChatPermissions';

describe('liveChatPermissions', () => {
  it('detects site admin', () => {
    expect(isSiteAdmin({ level: 'admin' })).toBe(true);
    expect(isSiteAdmin({ level: 'user' })).toBe(false);
  });

  it('detects forum admin role', () => {
    expect(isForumAdminRole({ role: 'forumAdmin' })).toBe(true);
    expect(isForumAdminRole({ role: 'user' })).toBe(false);
  });

  it('global moderate if either admin type', () => {
    expect(canGlobalModerate({ level: 'admin' }, null)).toBe(true);
    expect(canGlobalModerate(null, { role: 'forumAdmin' })).toBe(true);
    expect(canGlobalModerate(null, { role: 'user' })).toBe(false);
  });

  it('room staff includes creator and roomAdmin member', () => {
    const room = { createdByForumUserId: 'a' };
    expect(isRoomStaff(room, { id: 'a' }, null, null)).toBe(true);
    expect(isRoomStaff(room, { id: 'b' }, null, { role: 'roomAdmin' })).toBe(true);
    expect(isRoomStaff(room, { id: 'c' }, null, { role: 'member' })).toBe(false);
  });

  it('protected forum admin targets', () => {
    expect(targetIsProtectedForumAdmin({ role: 'forumAdmin' })).toBe(true);
    expect(targetIsProtectedForumAdmin({ role: 'user' })).toBe(false);
  });

  it('canInviteToPrivateRoom: creator or roomAdmin only', () => {
    const room = { type: 'private', createdByForumUserId: 'owner1' };
    expect(canInviteToPrivateRoom(room, { id: 'owner1' }, { role: 'member' })).toBe(true);
    expect(canInviteToPrivateRoom(room, { id: 'mod1' }, { role: 'roomAdmin' })).toBe(true);
    expect(canInviteToPrivateRoom(room, { id: 'guest' }, { role: 'member' })).toBe(false);
    expect(canInviteToPrivateRoom({ type: 'main' }, { id: 'owner1' }, { role: 'roomAdmin' })).toBe(false);
  });

  it('isRoomCreator excludes system main room', () => {
    expect(isRoomCreator({ createdByForumUserId: 'u1' }, 'u1')).toBe(true);
    expect(isRoomCreator({ createdByForumUserId: 'system' }, 'system')).toBe(false);
    expect(isRoomCreator({ createdByForumUserId: 'u1' }, 'u2')).toBe(false);
  });

  it('isPrivateRoomInvitedParticipant: main room or on participantIds', () => {
    expect(isPrivateRoomInvitedParticipant({ type: 'main' }, 'any')).toBe(true);
    const priv = { type: 'private', participantIds: ['a', 'b'] };
    expect(isPrivateRoomInvitedParticipant(priv, 'a')).toBe(true);
    expect(isPrivateRoomInvitedParticipant(priv, 'admin-sneak')).toBe(false);
    expect(isPrivateRoomInvitedParticipant(priv, '')).toBe(false);
  });

  it('canPostInRoom: everyone when mode off; staff or voice when on', () => {
    const rOff = { adminsOnlyMode: false };
    expect(canPostInRoom(rOff, { id: 'x' }, null, { role: 'member' })).toBe(true);
    const rOn = { adminsOnlyMode: true, createdByForumUserId: 'o' };
    expect(canPostInRoom(rOn, { id: 'x' }, null, { role: 'member' })).toBe(false);
    expect(canPostInRoom(rOn, { id: 'x' }, null, { role: 'member', hasVoice: true })).toBe(true);
    expect(canPostInRoom(rOn, { id: 'o' }, null, { role: 'member' })).toBe(true);
    expect(canPostInRoom(rOn, { id: 'm' }, null, { role: 'roomAdmin' })).toBe(true);
  });

  it('canToggleAdminsOnlyMode: main needs global mod; private staff', () => {
    const main = { type: 'main', createdByForumUserId: 'system' };
    expect(canToggleAdminsOnlyMode(main, null, { role: 'user' }, { role: 'roomAdmin' })).toBe(false);
    expect(canToggleAdminsOnlyMode(main, null, { role: 'forumAdmin' }, null)).toBe(true);
    const priv = { type: 'private', createdByForumUserId: 'o' };
    expect(canToggleAdminsOnlyMode(priv, null, { id: 'o' }, { role: 'member' })).toBe(true);
    expect(canToggleAdminsOnlyMode(priv, null, { id: 'g' }, { role: 'member' })).toBe(false);
  });

  it('canDemoteRoomAdmin: creator protected from non-global', () => {
    const room = { type: 'private', createdByForumUserId: 'owner1' };
    expect(canDemoteRoomAdmin(room, null, { id: 'mod' }, 'owner1')).toBe(false);
    expect(canDemoteRoomAdmin(room, null, { role: 'forumAdmin' }, 'owner1')).toBe(true);
    expect(canDemoteRoomAdmin(room, { level: 'admin' }, null, 'owner1')).toBe(true);
    expect(canDemoteRoomAdmin(room, null, { id: 'mod' }, 'other')).toBe(true);
  });
});
