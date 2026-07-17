import { useEffect, useRef, useState } from 'react';
import { Send, Users } from 'lucide-react';
import { useForumAuth } from '../../context/ForumAuthContext';
import { useSiteAuth } from '../../context/AuthContext';
import { getForumUsersByIds } from '../../firebase/forumUsers';
import {
  MAIN_ROOM_ID,
  ensureMainRoom,
  ensureChannelRoom,
  joinRoom,
  subscribeMessages,
  subscribeMembers,
  heartbeatMember,
  sendChatMessage,
  PRESENCE_HEARTBEAT_VISIBLE_MS,
  PRESENCE_ONLINE_THRESHOLD_MS
} from '../../firebase/liveChat';

/**
 * Deliberately minimal: a handful of fixed-id rooms, one message listener and
 * one member-roster listener per active room (not one listener per message —
 * that's what froze the previous chat UI), no reactions/typing/threads/mute.
 */
const ROOMS = [
  { id: MAIN_ROOM_ID, label: 'כללי', isMain: true },
  { id: 'bdsm', label: 'בדס״מ' },
  { id: 'swap', label: 'חילופי זוגות' }
];

const isOnline = (member, nowMs) => {
  const t = member?.lastSeenAt?.toMillis?.() ?? (member?.lastSeenAt?.seconds ? member.lastSeenAt.seconds * 1000 : 0);
  return t > 0 && nowMs - t < PRESENCE_ONLINE_THRESHOLD_MS;
};

export default function SimpleChatRoom() {
  const { forumUser } = useForumAuth();
  const { siteUser } = useSiteAuth();
  const [activeRoomId, setActiveRoomId] = useState(MAIN_ROOM_ID);
  const [ready, setReady] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [nicknames, setNicknames] = useState({});
  const [showMembers, setShowMembers] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [nowMs, setNowMs] = useState(() => Date.now());
  const listRef = useRef(null);

  // Join the active room whenever it changes.
  useEffect(() => {
    if (!forumUser?.id) return;
    let cancelled = false;
    setReady(false);
    setJoinError('');
    (async () => {
      try {
        if (activeRoomId === MAIN_ROOM_ID) {
          await ensureMainRoom();
        } else {
          const room = ROOMS.find((r) => r.id === activeRoomId);
          await ensureChannelRoom(activeRoomId, room?.label || activeRoomId);
        }
        await joinRoom(activeRoomId, forumUser, siteUser, { observeMode: false });
        if (!cancelled) setReady(true);
      } catch (err) {
        if (!cancelled) setJoinError(err?.message || 'שגיאה בטעינת הצ׳אט');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [forumUser?.id, activeRoomId]);

  useEffect(() => {
    if (!ready) return undefined;
    return subscribeMessages(activeRoomId, setMessages, 60);
  }, [ready, activeRoomId]);

  useEffect(() => {
    if (!ready) return undefined;
    return subscribeMembers(activeRoomId, setMembers);
  }, [ready, activeRoomId]);

  // Keep this member's presence fresh while the tab is visible, and recompute
  // who's "online" periodically so the roster decays without needing a new
  // Firestore snapshot.
  useEffect(() => {
    if (!ready || !forumUser?.id) return undefined;
    const beat = () => {
      if (document.visibilityState === 'visible') heartbeatMember(activeRoomId, forumUser.id);
    };
    beat();
    const heartbeatId = setInterval(beat, PRESENCE_HEARTBEAT_VISIBLE_MS);
    const tickId = setInterval(() => setNowMs(Date.now()), 30000);
    return () => {
      clearInterval(heartbeatId);
      clearInterval(tickId);
    };
  }, [ready, activeRoomId, forumUser?.id]);

  useEffect(() => {
    const ids = members.map((m) => m.id).filter((id) => !(id in nicknames));
    if (ids.length === 0) return;
    let cancelled = false;
    getForumUsersByIds(ids).then((map) => {
      if (cancelled) return;
      setNicknames((prev) => {
        const next = { ...prev };
        ids.forEach((id) => {
          next[id] = map[id]?.nickname || id;
        });
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setSendError('');
    try {
      await sendChatMessage(activeRoomId, forumUser, siteUser, text);
      setInput('');
    } catch (err) {
      setSendError(err?.message || 'שגיאה בשליחת הודעה');
    } finally {
      setSending(false);
    }
  };

  const onlineMembers = members.filter((m) => isOnline(m, nowMs));

  if (joinError) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-center text-destructive">
        {joinError}
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-6">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {ROOMS.map((room) => (
            <button
              key={room.id}
              type="button"
              onClick={() => setActiveRoomId(room.id)}
              className={`rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${
                activeRoomId === room.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-foreground hover:bg-secondary/80'
              }`}
            >
              {room.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setShowMembers((v) => !v)}
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm font-bold text-foreground/80 hover:border-primary hover:text-primary"
        >
          <Users size={16} />
          <span>{onlineMembers.length}</span>
        </button>
      </div>

      {showMembers && (
        <div className="mb-3 rounded-2xl border border-border bg-card/50 p-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            מחוברים עכשיו ({onlineMembers.length})
          </p>
          {onlineMembers.length === 0 ? (
            <p className="text-sm text-muted-foreground">אף אחד לא מחובר כרגע בחדר הזה</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {onlineMembers.map((m) => (
                <span
                  key={m.id}
                  className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-bold text-foreground"
                >
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  {nicknames[m.id] || '…'}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {!ready ? (
        <div className="flex flex-1 items-center justify-center p-8 text-muted-foreground">טוען...</div>
      ) : (
        <>
          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto rounded-2xl border border-border bg-card/50 p-4">
            {messages.length === 0 && (
              <p className="py-10 text-center text-sm text-muted-foreground">אין עדיין הודעות. תהיו הראשונים לכתוב!</p>
            )}
            {messages.map((m) => {
              const mine = m.authorId === forumUser?.id;
              return (
                <div key={m.id} className={`flex ${mine ? 'justify-start' : 'justify-end'}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                      mine ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'
                    }`}
                  >
                    {!mine && <div className="mb-1 text-xs font-bold text-primary">{m.authorNickname}</div>}
                    <div className="whitespace-pre-wrap break-words">{m.text}</div>
                  </div>
                </div>
              );
            })}
          </div>
          {sendError && <p className="mt-2 text-sm text-destructive">{sendError}</p>}
          <div className="mt-4 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="כתבו הודעה..."
              disabled={sending}
              className="flex-1 rounded-full border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim() || sending}
              aria-label="שלח"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
            >
              <Send size={18} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
