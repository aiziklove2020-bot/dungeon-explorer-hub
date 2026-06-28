import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  getForumUserById: vi.fn(),
  getLiveChatSettings: vi.fn()
}));

vi.mock('firebase/firestore', () => {
  function Timestamp() {}
  Timestamp.now = () => ({ _now: true });
  Timestamp.fromMillis = (ms) => ({ _ms: ms });
  return {
    doc: vi.fn((...args) => ({ type: 'doc', args })),
    collection: vi.fn((...args) => ({ type: 'col', args })),
    getDoc: (...a) => h.getDoc(...a),
    getDocs: (...a) => h.getDocs(...a),
    setDoc: (...a) => h.setDoc(...a),
    updateDoc: (...a) => h.updateDoc(...a),
    serverTimestamp: () => ({ _sv: true }),
    Timestamp
  };
});

vi.mock('./config', () => ({
  db: {},
  dbChat: {}
}));

vi.mock('./settings', () => ({
  getLiveChatSettings: (...a) => h.getLiveChatSettings(...a)
}));

vi.mock('./forumUsers', () => ({
  getForumUserById: (...a) => h.getForumUserById(...a)
}));

vi.mock('./notifications', () => ({
  createNotification: vi.fn(() => Promise.resolve())
}));

import { sendChatMessage } from './liveChat';

function roomSnap() {
  return {
    exists: () => true,
    id: 'room1',
    data: () => ({
      type: 'main',
      closedAt: null,
      slowModeSeconds: 0,
      adminsOnlyMode: false
    })
  };
}

function memberSnap() {
  return {
    exists: () => true,
    id: 'author',
    data: () => ({
      observeMode: false,
      recentSendTimes: []
    })
  };
}

function muteSnapEmpty() {
  return { exists: () => false, id: 'mute', data: () => ({}) };
}

describe('sendChatMessage opts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.getLiveChatSettings.mockResolvedValue({ retentionDays: 3, globalChatMuted: false });
    let n = 0;
    h.getDoc.mockImplementation(() => {
      n += 1;
      if (n === 1) return roomSnap();
      if (n === 2) return memberSnap();
      return muteSnapEmpty();
    });
    h.setDoc.mockResolvedValue(undefined);
    h.updateDoc.mockResolvedValue(undefined);
  });

  it('does not call getDocs or getForumUserById when memberNicknamesForMentions is non-empty', async () => {
    await sendChatMessage(
      'room1',
      { id: 'author', nickname: 'A', role: 'user' },
      { level: 'user' },
      'hello @bob',
      {
        memberNicknamesForMentions: [{ id: 'u2', nickname: 'Bob' }],
        cachedLiveChatSettings: { retentionDays: 7, globalChatMuted: false }
      }
    );
    expect(h.getDocs).not.toHaveBeenCalled();
    expect(h.getForumUserById).not.toHaveBeenCalled();
    expect(h.getLiveChatSettings).not.toHaveBeenCalled();
    expect(h.setDoc).toHaveBeenCalled();
  });

  it('fetches live chat settings when cache omits globalChatMuted', async () => {
    await sendChatMessage(
      'room1',
      { id: 'author', nickname: 'A', role: 'user' },
      { level: 'user' },
      'x',
      {
        memberNicknamesForMentions: [{ id: 'u2', nickname: 'Bob' }],
        cachedLiveChatSettings: { retentionDays: 7 }
      }
    );
    expect(h.getLiveChatSettings).toHaveBeenCalled();
  });

  it('skips mute getDoc when cachedMuteDoc is provided', async () => {
    let n = 0;
    h.getDoc.mockImplementation(() => {
      n += 1;
      if (n === 1) return roomSnap();
      if (n === 2) return memberSnap();
      throw new Error(`unexpected getDoc call #${n}`);
    });
    await sendChatMessage(
      'room1',
      { id: 'author', nickname: 'A', role: 'user' },
      { level: 'user' },
      'hi',
      {
        memberNicknamesForMentions: [{ id: 'u2', nickname: 'Bob' }],
        cachedLiveChatSettings: { retentionDays: 7, globalChatMuted: false },
        cachedMuteDoc: null
      }
    );
    expect(n).toBe(2);
  });
});
