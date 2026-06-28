import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCreateNotification = vi.fn(() => Promise.resolve());

vi.mock('./notifications', () => ({
  createNotification: (...args) => mockCreateNotification(...args)
}));

import {
  buildMemberNicknamesForMentions,
  maybeNotifyMentions
} from './liveChat';

describe('buildMemberNicknamesForMentions', () => {
  it('maps member ids to nicknames from nicknameById', () => {
    const members = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const nick = { a: 'Alice', b: '  ', c: 'Carol' };
    expect(buildMemberNicknamesForMentions(members, nick)).toEqual([
      { id: 'a', nickname: 'Alice' },
      { id: 'c', nickname: 'Carol' }
    ]);
  });

  it('returns empty for non-array or missing nicknames', () => {
    expect(buildMemberNicknamesForMentions(null, {})).toEqual([]);
    expect(buildMemberNicknamesForMentions([{ id: 'x' }], {})).toEqual([]);
  });
});

describe('maybeNotifyMentions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('no-op when text has no @', async () => {
    await maybeNotifyMentions('room1', 'hello', { id: 'u1', nickname: 'Bob' }, [
      { id: 'u2', nickname: 'Ann' }
    ]);
    expect(mockCreateNotification).not.toHaveBeenCalled();
  });

  it('notifies mentioned users by nickname match (case-insensitive)', async () => {
    await maybeNotifyMentions(
      'room1',
      'Hi @ann there',
      { id: 'u1', nickname: 'Bob' },
      [
        { id: 'u2', nickname: 'Ann' },
        { id: 'u1', nickname: 'Bob' }
      ]
    );
    expect(mockCreateNotification).toHaveBeenCalledTimes(1);
    expect(mockCreateNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u2',
        type: 'chatMention',
        fromUserId: 'u1'
      })
    );
  });

  it('skips self-mention', async () => {
    await maybeNotifyMentions('r', '@bob hi', { id: 'u1', nickname: 'Bob' }, [
      { id: 'u1', nickname: 'Bob' }
    ]);
    expect(mockCreateNotification).not.toHaveBeenCalled();
  });

  it('embeds room name as refTitle and message id as refMessageId so the bell can deep-link', async () => {
    await maybeNotifyMentions(
      'room1',
      'hey @ann',
      { id: 'u1', nickname: 'Bob' },
      [{ id: 'u2', nickname: 'Ann' }],
      { roomName: 'My private room', messageId: 'msg-123' }
    );
    expect(mockCreateNotification).toHaveBeenCalledTimes(1);
    expect(mockCreateNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u2',
        type: 'chatMention',
        refId: 'room1',
        refTitle: 'My private room',
        refMessageId: 'msg-123'
      })
    );
  });

  it('refMessageId is null when no message id is provided (graceful fallback)', async () => {
    await maybeNotifyMentions(
      'room1',
      'hey @ann',
      { id: 'u1', nickname: 'Bob' },
      [{ id: 'u2', nickname: 'Ann' }]
    );
    const args = mockCreateNotification.mock.calls[0][0];
    expect(args.refMessageId).toBeNull();
  });

  it('notifies multiple mentioned users in one message', async () => {
    await maybeNotifyMentions(
      'room1',
      'hi @ann and @carol',
      { id: 'u1', nickname: 'Bob' },
      [
        { id: 'u2', nickname: 'Ann' },
        { id: 'u3', nickname: 'Carol' }
      ],
      { messageId: 'm9' }
    );
    expect(mockCreateNotification).toHaveBeenCalledTimes(2);
    const userIds = mockCreateNotification.mock.calls.map(([n]) => n.userId).sort();
    expect(userIds).toEqual(['u2', 'u3']);
  });
});
