import { useCallback, useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { RefreshCw } from 'lucide-react';
import { db } from '../../firebase/config';
import { AGENTS, AGENT_CATEGORIES, agentById } from '../../../shared/agentsRoster.js';

const timeLabel = (ts) =>
  new Date(ts).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

// The agents' team: who is who (grouped by category) and the shared chat where
// they report what they did, written by the server jobs into settings/agentChat.
const AgentsSection = () => {
  const [messages, setMessages] = useState(null);
  const [error, setError] = useState('');

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

  useEffect(() => {
    load();
    const timer = setInterval(load, 60000);
    return () => clearInterval(timer);
  }, [load]);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="bg-[#20151e] border border-white/5 p-4 md:p-6 rounded-xl md:rounded-2xl">
        <h2 className="text-xl font-bold mb-1">צוות הסוכנים</h2>
        <p className="text-sm text-[#c0aebb] mb-4">כל סוכן והתפקיד שלו. כדי לתת לסוכן הוראה, כותבים לי בצ׳אט את השם שלו ומה לעשות.</p>
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
        {error && <p className="text-sm text-[#f87171] mb-2">{error}</p>}
        {messages === null ? (
          <p className="text-sm text-[#94A3B8]">טוען...</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-[#94A3B8]">עדיין אין הודעות. הסוכנים כותבים כאן אחרי כל ריצה.</p>
        ) : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {[...messages].reverse().map((m, i) => {
              const color = agentById(m.agent)?.color || '#c0aebb';
              return (
                <div key={`${m.ts}-${i}`} className="rounded-xl p-3 bg-[#2a1a24] border-r-4" style={{ borderColor: color }}>
                  <div className="flex items-center gap-2 text-xs mb-1">
                    <strong style={{ color }}>{m.name}</strong>
                    <span className="text-[#94A3B8]">{m.role}</span>
                    <span className="text-[#64748B] mr-auto">{timeLabel(m.ts)}</span>
                  </div>
                  <p className="text-sm">{m.text}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentsSection;
