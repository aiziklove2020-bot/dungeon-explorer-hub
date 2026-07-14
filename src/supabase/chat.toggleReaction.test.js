import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
  rpc: vi.fn(() => Promise.resolve({ error: null })),
  fromCalls: [],
  // Last "from(...).select()...maybeSingle()" return — set by tests to
  // simulate "user is a non-observe member of the room".
  participantRow: {
    forum_user_id: 'u1',
    role: 'member',
    observe_mode: false,
    has_voice: true,
    last_message_at: null,
    recent_send_times_json: []
  },
  // Whether the room read returns a closed/missing room or a healthy
  // private room the user can post in.
  roomRow: {
    id: 'r1',
    type: 'main',
    name: '',
    description: '',
    created_by_forum_user_id: 'creator',
    closed_at: null,
    slow_mode_seconds: 0,
    admins_only_mode: false,
    participant_ids_json: ['u1']
  }
}));

vi.mock('firebase/firestore', () => {
  function Timestamp() {}
  Timestamp.now = () => ({ _now: true });
  Timestamp.fromMillis = (ms) => ({ _ms: ms });
  return { Timestamp };
});

vi.mock('./client', () => ({
  hasSupabaseChatAccessToken: () => true,
  supabaseChatConfigured: () => true,
  getSupabaseClient: () => ({
    rpc: (...a) => h.rpc(...a),
    from: (table) => {
      h.fromCalls.push(table);
      // Resolver picked at "from()" time so any later `.select()/.eq()`
      // chain just thread back the same final value.
      const resolveOk = () => {
        if (table === 'chat_rooms') {
          return Promise.resolve({ data: h.roomRow, error: null });
        }
        if (table === 'chat_room_participants') {
          return Promise.resolve({ data: h.participantRow, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      };
      const resolveList = () => {
        if (table === 'chat_rooms') {
          return Promise.resolve({ data: [h.roomRow], error: null });
        }
        if (table === 'chat_room_participants') {
          return Promise.resolve({ data: [h.participantRow], error: null });
        }
        return Promise.resolve({ data: [], error: null });
      };
      // The chain is itself a thenable so `await sb().from('x').select().eq()` resolves
      // even when the caller skips `.maybeSingle()` (a few places do).
      // Build the chain via a class so that ONLY the terminator methods
      // (`maybeSingle`, `single`) and explicit awaits at chain end (no
      // `.maybeSingle()` — the bare-await pattern) resolve. Crucially we
      // do NOT add a `.then` to the chain itself: that would short-circuit
      // intermediate steps because `await chain.select()` would treat the
      // chain object as a thenable and resolve before `.eq()` is called.
      const list = resolveList;
      const ok = resolveOk;
      const chain = {
        select() { return chain; },
        eq() { return chain; },
        is() { return chain; },
        order() { return chain; },
        limit() { return list(); },
        in() { return chain; },
        filter() { return chain; },
        contains() { return chain; },
        maybeSingle: ok,
        single: ok,
        insert: () => Promise.resolve({ data: null, error: null }),
        update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
        upsert: () => Promise.resolve({ data: null, error: null }),
        delete: () => ({ eq: () => Promise.resolve({ data: null, error: null }) })
      };
      return chain;
    }
  })
}));

vi.mock('../firebase/settings', () => ({
  getLiveChatSettings: vi.fn()
}));

vi.mock('../firebase/forumUsers', () => ({
  getForumUserById: vi.fn(),
  getForumUsersByIds: vi.fn()
}));

vi.mock('../firebase/notifications', () => ({
  createNotification: vi.fn()
}));

vi.mock('../firebase/liveChat/mentions.js', () => ({
  maybeNotifyMentions: vi.fn(),
  buildMemberNicknamesForMentions: vi.fn()
}));

import { toggleReaction } from './chat';

describe('toggleReaction (Supabase backend)', () => {
  beforeEach(() => {
    h.rpc.mockClear();
    h.fromCalls.length = 0;
    h.participantRow = {
      forum_user_id: 'u1',
      role: 'member',
      observe_mode: false,
      has_voice: true,
      last_message_at: null,
      recent_send_times_json: []
    };
    h.roomRow = {
      id: 'r1',
      type: 'main',
      name: '',
      description: '',
      created_by_forum_user_id: 'creator',
      closed_at: null,
      slow_mode_seconds: 0,
      admins_only_mode: false,
      participant_ids_json: ['u1']
    };
  });

  it('routes the toggle through the chat_set_reaction RPC instead of doing an upsert + delete dance', async () => {
    await toggleReaction(
      'r1',
      'msg-1',
      { id: 'u1', nickname: 'A' },
      { id: 'site-u1', level: 'user' },
      '👍'
    );
    expect(h.rpc).toHaveBeenCalledTimes(1);
    expect(h.rpc).toHaveBeenCalledWith('chat_set_reaction', {
      p_room_id: 'r1',
      p_message_id: 'msg-1',
      p_emoji: '👍'
    });
    // Sanity: the client never touches chat_reactions directly anymore.
    expect(h.fromCalls).not.toContain('chat_reactions');
  });

  it('caps emoji length so an attacker cannot stuff arbitrary text into the reaction', async () => {
    await toggleReaction(
      'r1',
      'msg-2',
      { id: 'u1' },
      { id: 'site-u1' },
      '👍👍👍👍👍👍👍👍'
    );
    expect(h.rpc).toHaveBeenCalledTimes(1);
    const args = h.rpc.mock.calls[0][1];
    // Each thumbs-up is 1 visual codepoint but multiple JS code units;
    // we slice on Array.from(emoji).slice(0, 4) so the resulting string
    // has at most 4 graphemes.
    expect([...args.p_emoji]).toHaveLength(4);
  });

  it('no-ops without forumUser.id (defence in depth — the RPC also rejects)', async () => {
    await toggleReaction('r1', 'msg-3', null, { id: 'site-u1' }, '👍');
    expect(h.rpc).not.toHaveBeenCalled();
  });

  it('no-ops on a closed room (don\'t even bother dialling the RPC)', async () => {
    h.roomRow = { ...h.roomRow, closed_at: '2026-01-01T00:00:00Z' };
    await toggleReaction('r1', 'msg-4', { id: 'u1' }, { id: 'site-u1' }, '👍');
    expect(h.rpc).not.toHaveBeenCalled();
  });

  it('no-ops when the caller is in observe mode (forum admin peek)', async () => {
    h.participantRow = { ...h.participantRow, observe_mode: true };
    await toggleReaction('r1', 'msg-5', { id: 'u1' }, { id: 'site-u1' }, '👍');
    expect(h.rpc).not.toHaveBeenCalled();
  });
});
