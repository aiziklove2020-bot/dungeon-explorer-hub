import { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { useForumAuth } from '../../context/ForumAuthContext';
import { useSiteAuth } from '../../context/AuthContext';
import { MAIN_ROOM_ID, ensureMainRoom, joinRoom, subscribeMessages, sendChatMessage } from '../../firebase/liveChat';

/**
 * Deliberately minimal: one Firestore listener (the message list), one send
 * function, no reactions/typing/presence/threads/mute/private rooms. The
 * previous chat UI opened dozens of concurrent realtime listeners (one per
 * visible message, for reactions) which was heavy enough to freeze the page.
 * This trades those extras for something small and reliable.
 */
export default function SimpleChatRoom() {
  const { forumUser } = useForumAuth();
  const { siteUser } = useSiteAuth();
  const [ready, setReady] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const listRef = useRef(null);

  useEffect(() => {
    if (!forumUser?.id) return;
    let cancelled = false;
    (async () => {
      try {
        await ensureMainRoom();
        await joinRoom(MAIN_ROOM_ID, forumUser, siteUser, { observeMode: false });
        if (!cancelled) setReady(true);
      } catch (err) {
        if (!cancelled) setJoinError(err?.message || 'שגיאה בטעינת הצ׳אט');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [forumUser?.id]);

  useEffect(() => {
    if (!ready) return undefined;
    return subscribeMessages(MAIN_ROOM_ID, setMessages, 60);
  }, [ready]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setSendError('');
    try {
      await sendChatMessage(MAIN_ROOM_ID, forumUser, siteUser, text);
      setInput('');
    } catch (err) {
      setSendError(err?.message || 'שגיאה בשליחת הודעה');
    } finally {
      setSending(false);
    }
  };

  if (joinError) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-center text-destructive">
        {joinError}
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-muted-foreground">
        טוען...
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-6">
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
    </div>
  );
}
