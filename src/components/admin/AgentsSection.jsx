import { useCallback, useEffect, useRef, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { RefreshCw } from 'lucide-react';
import { db } from '../../firebase/config';
import { callAdminSettings } from '../../utils/adminApi';
import { AGENTS, AGENT_CATEGORIES, agentById } from '../../../shared/agentsRoster.js';

// Consecutive lines of the same task form one conversation (who spoke to whom).
const groupThreads = (messages) => {
  const threads = [];
  for (const m of messages) {
    const last = threads[threads.length - 1];
    if (m.taskId && last && last[0].taskId === m.taskId) last.push(m);
    else threads.push([m]);
  }
  return threads;
};

const timeLabel = (ts) =>
  new Date(ts).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

// The agents' team: who is who (grouped by category) and the shared chat where
// they report what they did, written by the server jobs into settings/agentChat.
const AgentsSection = () => {
  const [messages, setMessages] = useState(null);
  const [error, setError] = useState('');
  const [to, setTo] = useState(AGENTS[0].id);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const formRef = useRef(null);
  const inputRef = useRef(null);

  const writeTo = (id) => {
    setTo(id);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => inputRef.current?.focus(), 400);
  };

  const load = useCallback(async () => {
    try {
      const snap = await getDoc(doc(db, 'settings', 'agentChat'));
      setMessages(snap.exists() && Array.isArray(snap.data().messages) ? snap.data().messages : []);
      setError('');
    } catch (err) {
      setError('לא הצלחנו לטעון את הצ׳אט כרגע.');
      setMessages((m) => m || []);
    }
  }, []);

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    setSendError('');
    try {
      await callAdminSettings('agent-chat-post', { to, text });
      setText('');
      await load();
    } catch (err) {
      setSendError(err.message || 'השליחה נכשלה, נסה שוב.');
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    load();
    const timer = setInterval(load, 60000);
    return () => clearInterval(timer);
  }, [load]);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="bg-[#20151e] border border-white/5 p-4 md:p-6 rounded-xl md:rounded-2xl">
        <h2 className="text-xl font-bold mb-1">צוות הסוכנים</h2>
        <p className="text-sm text-[#c0aebb] mb-4">כל סוכן והתפקיד שלו. כדי לתת לסוכן הוראה, כותבים לו בצ׳אט שלמטה.</p>
        <div className="space-y-5">
          {AGENT_CATEGORIES.map((cat) => (
            <div key={cat.id}>
              <h3 className="text-sm font-bold text-[#ff9fc3] mb-2">{cat.label}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {AGENTS.filter((a) => a.category === cat.id).map((a) => (
                  <div key={a.id} className="rounded-xl p-3 border border-white/10 bg-[#2a1a24]">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-3 h-3 rounded-full" style={{ background: a.color }} />
                      <strong className="text-base">{a.name}</strong>
                      <span className="text-xs text-[#c0aebb]">{a.role}</span>
                    </div>
                    <p className="text-sm text-[#e4d9e0]">{a.desc}</p>
                    <p className="text-xs text-[#94A3B8] mt-1">{a.schedule}</p>
                    <button
                      type="button"
                      onClick={() => writeTo(a.id)}
                      className="mt-2 px-3 py-1.5 rounded-lg text-sm font-bold text-white"
                      style={{ background: 'linear-gradient(135deg,#ff438b,#ff5596)' }}
                    >
                      כתוב ל{a.name}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#20151e] border border-white/5 p-4 md:p-6 rounded-xl md:rounded-2xl">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold">הצ׳אט של הצוות</h2>
          <button type="button" onClick={load} className="flex items-center gap-1 text-sm text-[#ff9fc3]">
            <RefreshCw size={16} /> רענון
          </button>
        </div>
        <form ref={formRef} onSubmit={send} className="mb-4 space-y-2">
          <div className="flex gap-2">
            <select
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="bg-[#2a1a24] text-white border border-white/10 rounded-lg px-3 py-2 text-sm"
              aria-label="למי לכתוב"
            >
              {AGENTS.map((a) => (
                <option key={a.id} value={a.id}>{a.name} – {a.role}</option>
              ))}
            </select>
            <input
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="מה לעשות? למשל: תפרסם רק בימי שני וחמישי"
              maxLength={500}
              className="flex-1 min-w-0 bg-[#2a1a24] text-white border border-white/10 rounded-lg px-3 py-2 text-sm"
            />
            <button type="submit" disabled={sending || !text.trim()} className="px-4 py-2 rounded-lg text-sm font-bold text-white disabled:opacity-60" style={{ background: 'linear-gradient(135deg,#ff438b,#ff5596)' }}>
              {sending ? 'שולח…' : 'שלח'}
            </button>
          </div>
          <p className="text-xs text-[#94A3B8]">עומר וליאור מבינים: "תעצור", "תמשיך", "תעבוד רק בימי שני וחמישי". אדם מבין "תעצור" ו"תמשיך". בקשה שמחוץ לתחום של הסוכן מועברת לסוכן שהכישורים שלו מתאימים (אפשר לראות את השיחה ביניהם בצ׳אט), ואם אין כזה היא נרשמת למנהל הצוות (Claude).</p>
          {sendError && <p className="text-sm text-[#f87171]">{sendError}</p>}
        </form>
        {error && <p className="text-sm text-[#f87171] mb-2">{error}</p>}
        {messages === null ? (
          <p className="text-sm text-[#94A3B8]">טוען...</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-[#94A3B8]">עדיין אין הודעות. הסוכנים כותבים כאן אחרי כל ריצה.</p>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {groupThreads(messages).reverse().map((thread) => (
              <div key={thread[0].taskId || `${thread[0].ts}`} className={thread.length > 1 && thread[0].taskId ? 'rounded-xl p-2 border border-white/10 space-y-2' : ''}>
                {thread.length > 1 && thread[0].taskId && (
                  <p className="text-xs text-[#94A3B8] px-1">שיחה בין {[...new Set(thread.map((m) => m.name))].join(', ')}</p>
                )}
                {thread.map((m, i) => {
                  const color = m.agent === 'owner' ? '#ffffff' : agentById(m.agent)?.color || '#c0aebb';
                  const toName = m.to ? (m.to === 'owner' ? 'אתה' : agentById(m.to)?.name) : null;
                  return (
                    <div key={`${m.ts}-${i}`} className={`rounded-xl p-3 bg-[#2a1a24] border-r-4 ${m.delegation ? 'mr-6' : ''}`} style={{ borderColor: color }}>
                      <div className="flex items-center gap-2 text-xs mb-1 flex-wrap">
                        <strong style={{ color }}>{m.name}</strong>
                        {toName && <span className="text-[#ff9fc3]">← {toName}</span>}
                        <span className="text-[#94A3B8]">{m.role}</span>
                        {m.delegation && <span className="px-1.5 rounded bg-[#ff438b33] text-[#ff9fc3]">העברה בין סוכנים</span>}
                        {m.state === 'completed' && <span className="text-[#34d399]">✓ הושלם</span>}
                        {m.state === 'input-required' && <span className="text-[#fbbf24]">ממתין למנהל הצוות</span>}
                        <span className="text-[#64748B] mr-auto">{timeLabel(m.ts)}</span>
                      </div>
                      <p className="text-sm">{m.text}</p>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentsSection;
