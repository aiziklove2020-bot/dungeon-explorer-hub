import { useState, useEffect, useCallback } from 'react';
import { Trash2, Loader, RefreshCw } from 'lucide-react';
import { adminAuthHeader, hasAdminApiClientSecret } from '../../utils/adminApi';

function formatTime(createdAt) {
  if (!createdAt) return '—';
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('he-IL');
}

async function fetchRequests() {
  if (!hasAdminApiClientSecret()) {
    throw new Error('VITE_ADMIN_API_SECRET is missing in this build.');
  }
  const res = await fetch('/api/telegram-webhook?job=list-delete-requests', {
    headers: { ...adminAuthHeader() }
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
  return Array.isArray(json?.rows) ? json.rows : [];
}

async function patchStatus(requestId, status) {
  const qs = new URLSearchParams({ requestId, status });
  const res = await fetch(`/api/telegram-webhook?job=process-delete-request&${qs.toString()}`, {
    headers: { ...adminAuthHeader() }
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
}

const STATUS_LABEL = { pending: 'ממתין', done: 'טופל', dismissed: 'נדחה' };
const STATUS_CLASS = { pending: 'text-amber-400', done: 'text-green-400', dismissed: 'text-[#94A3B8]' };

const DeleteRequestsSection = ({ showSaved }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      setRows(await fetchRequests());
    } catch (e) {
      setErr(e.message || 'שגיאה');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (requestId, status) => {
    setBusyId(requestId);
    try {
      await patchStatus(requestId, status);
      showSaved?.();
      await load();
    } catch (e) {
      alert(e.message || 'שגיאה');
    } finally {
      setBusyId(null);
    }
  };

  const pendingCount = rows.filter((r) => (r.status || 'pending') === 'pending').length;

  if (loading && !rows.length) {
    return (
      <div className="flex items-center gap-2 text-[#94A3B8] py-8">
        <Loader className="animate-spin" size={20} />
        טוען...
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-white font-bold text-lg">
          <Trash2 size={22} className="text-[#ffb4ab]" />
          בקשות מחיקת חשבון
          {pendingCount > 0 && (
            <span className="text-xs bg-amber-900/60 text-amber-300 px-2 py-1 rounded-full font-bold">
              {pendingCount} ממתינות
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => load()}
          disabled={loading}
          className="inline-flex items-center gap-2 text-sm bg-[#1f1f23] hover:bg-[#2a292e] text-white px-3 py-2 rounded-lg disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          רענן
        </button>
      </div>

      <p className="text-[#a9a9b2] text-sm">
        משתמשים ששלחו בקשה למחוק את החשבון שלהם (מספר טלפון) מהאתר. אישור "טופל" כאן
        רק מסמן שהטיפול הושלם — המחיקה בפועל של הנתונים (משתמש, הרשמות, פורום וכו')
        היא פעולה נפרדת שצריך לבצע ידנית.
      </p>

      {err && <p className="text-[#ffb4ab] text-sm">{err}</p>}

      {rows.length === 0 ? (
        <p className="text-[#94A3B8] text-sm py-6 text-center border border-[rgba(255,255,255,0.08)] rounded-lg">
          אין בקשות מחיקה
        </p>
      ) : (
        <div className="overflow-x-auto border border-[rgba(255,255,255,0.08)] rounded-lg">
          <table className="w-full text-sm text-right min-w-[480px]">
            <thead className="bg-[#121218] text-[#a9a9b2]">
              <tr>
                <th className="p-2 font-medium">מתי</th>
                <th className="p-2 font-medium">טלפון</th>
                <th className="p-2 font-medium">סטטוס</th>
                <th className="p-2 font-medium">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const status = r.status || 'pending';
                return (
                  <tr key={r.id} className="border-t border-[rgba(255,255,255,0.08)] hover:bg-[#121218]">
                    <td className="p-2 text-[#e4e1e7] whitespace-nowrap align-top">{formatTime(r.createdAt)}</td>
                    <td className="p-2 align-top">
                      <span dir="ltr" className="font-mono">{r.phoneNumber}</span>
                    </td>
                    <td className={`p-2 align-top ${STATUS_CLASS[status] || ''}`}>
                      {STATUS_LABEL[status] || status}
                    </td>
                    <td className="p-2 align-top whitespace-nowrap">
                      {status === 'pending' ? (
                        <div className="flex gap-1">
                          <button
                            type="button"
                            disabled={busyId === r.id}
                            className="text-xs bg-green-900/70 hover:bg-green-800 text-white px-2 py-1 rounded disabled:opacity-50"
                            onClick={() => setStatus(r.id, 'done')}
                          >
                            סמן כטופל
                          </button>
                          <button
                            type="button"
                            disabled={busyId === r.id}
                            className="text-xs bg-[#1f1f23] hover:bg-[#2a292e] text-white px-2 py-1 rounded disabled:opacity-50"
                            onClick={() => setStatus(r.id, 'dismissed')}
                          >
                            דחה
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-[#64748B]">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DeleteRequestsSection;
