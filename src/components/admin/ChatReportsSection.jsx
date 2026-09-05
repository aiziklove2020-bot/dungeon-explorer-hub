import { useState, useEffect, useCallback } from 'react';
import { Flag, Loader, RefreshCw } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { adminAuthHeader, hasAdminApiClientSecret } from '../../utils/adminApi';

function formatReportTime(createdAt) {
  if (!createdAt) return '—';
  if (typeof createdAt === 'string') {
    const d = new Date(createdAt);
    if (!Number.isNaN(d.getTime())) return d.toLocaleString('he-IL');
    return '—';
  }
  if (createdAt.toDate) return createdAt.toDate().toLocaleString('he-IL');
  if (createdAt.seconds) return new Date(createdAt.seconds * 1000).toLocaleString('he-IL');
  if (createdAt instanceof Date) return createdAt.toLocaleString('he-IL');
  return '—';
}

async function fetchReports(limitN = 100) {
  if (!hasAdminApiClientSecret()) {
    throw new Error('VITE_ADMIN_API_SECRET is missing in this build.');
  }
  const res = await fetch(`/api/chat-admin-reports?limit=${encodeURIComponent(limitN)}`, {
    method: 'GET',
    headers: { ...adminAuthHeader() }
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
  return Array.isArray(json?.rows) ? json.rows : [];
}

async function patchReportStatus(reportId, status, notes) {
  if (!hasAdminApiClientSecret()) {
    throw new Error('VITE_ADMIN_API_SECRET is missing in this build.');
  }
  const res = await fetch('/api/chat-admin-reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...adminAuthHeader() },
    body: JSON.stringify({ reportId, status, notes })
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
}

const ChatReportsSection = ({ showSaved }) => {
  const { t } = useLanguage();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const list = await fetchReports(100);
      setRows(list);
    } catch (e) {
      setErr(e.message || 'Error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (reportId, status) => {
    let notes = '';
    if (status === 'actioned') {
      const n = window.prompt(t('admin.chatReports.notesPrompt'), '');
      if (n === null) return;
      notes = n;
    }
    setBusyId(reportId);
    try {
      await patchReportStatus(reportId, status, notes);
      showSaved?.();
      await load();
    } catch (e) {
      alert(e.message || 'שגיאה');
    } finally {
      setBusyId(null);
    }
  };

  if (loading && !rows.length) {
    return (
      <div className="flex items-center gap-2 text-zinc-500 py-8">
        <Loader className="animate-spin" size={20} />
        {t('admin.liveChat.loading')}
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-white font-bold text-lg">
          <Flag size={22} className="text-amber-500" />
          {t('admin.chatReports.title')}
        </div>
        <button
          type="button"
          onClick={() => load()}
          disabled={loading}
          className="inline-flex items-center gap-2 text-sm bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-2 rounded-lg disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          {t('admin.chatReports.refresh')}
        </button>
      </div>

      <p className="text-zinc-400 text-sm">{t('admin.chatReports.intro')}</p>

      {err && <p className="text-red-400 text-sm">{err}</p>}

      <div className="md:hidden space-y-3">
        {rows.length === 0 && (
          <p className="text-zinc-500 text-sm py-6 text-center border border-[rgba(255,255,255,0.08)] rounded-lg">
            {t('admin.chatReports.empty')}
          </p>
        )}
        {rows.map((r) => (
          <article
            key={`m-${r.id}`}
            className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#121218] p-4 space-y-3 text-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <span className="text-zinc-500 text-xs">{formatReportTime(r.createdAt)}</span>
              <span
                className={
                  r.status === 'open'
                    ? 'text-amber-400 text-xs font-bold'
                    : r.status === 'actioned'
                      ? 'text-green-400 text-xs'
                      : 'text-zinc-500 text-xs'
                }
              >
                {r.status || '—'}
              </span>
            </div>
            <div>
              <div className="text-xs text-zinc-500 mb-1">{t('admin.chatReports.room')}</div>
              <a
                href={`/chat/${encodeURIComponent(r.roomId)}?m=${encodeURIComponent(r.messageId)}`}
                className="text-amber-400 hover:underline break-all text-sm"
                target="_blank"
                rel="noreferrer"
              >
                {r.roomId}
              </a>
            </div>
            <div>
              <div className="text-xs text-zinc-500 mb-1">{t('admin.chatReports.reporter')}</div>
              <span className="font-mono text-xs text-zinc-300">{r.reporterId}</span>
              {r.reporterNickname ? (
                <span className="block text-xs text-zinc-500">{r.reporterNickname}</span>
              ) : null}
            </div>
            <div>
              <div className="text-xs text-zinc-500 mb-1">{t('admin.chatReports.reason')}</div>
              <p className="text-zinc-200 text-sm whitespace-pre-wrap break-words">{r.reason || '—'}</p>
            </div>
            {r.status === 'open' && (
              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="button"
                  disabled={busyId === r.id}
                  className="w-full text-sm bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-2.5 rounded-lg disabled:opacity-50 touch-manipulation"
                  onClick={() => setStatus(r.id, 'dismissed')}
                >
                  {t('admin.chatReports.dismiss')}
                </button>
                <button
                  type="button"
                  disabled={busyId === r.id}
                  className="w-full text-sm bg-amber-900/80 hover:bg-amber-800 text-white px-3 py-2.5 rounded-lg disabled:opacity-50 touch-manipulation"
                  onClick={() => setStatus(r.id, 'actioned')}
                >
                  {t('admin.chatReports.actioned')}
                </button>
              </div>
            )}
          </article>
        ))}
      </div>

      <div className="hidden md:block overflow-x-auto border border-[rgba(255,255,255,0.08)] rounded-lg touch-pan-x">
        <table className="w-full text-sm text-right min-w-[640px]">
          <thead className="bg-zinc-900 text-zinc-400">
            <tr>
              <th className="p-2 font-medium">{t('admin.chatReports.when')}</th>
              <th className="p-2 font-medium">{t('admin.chatReports.room')}</th>
              <th className="p-2 font-medium">{t('admin.chatReports.reporter')}</th>
              <th className="p-2 font-medium">{t('admin.chatReports.reason')}</th>
              <th className="p-2 font-medium">{t('admin.chatReports.status')}</th>
              <th className="p-2 font-medium">{t('admin.chatReports.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-zinc-500">
                  {t('admin.chatReports.empty')}
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-[rgba(255,255,255,0.08)] hover:bg-[#121218]">
                <td className="p-2 text-zinc-300 whitespace-nowrap align-top">
                  {formatReportTime(r.createdAt)}
                </td>
                <td className="p-2 align-top">
                  <a
                    href={`/chat/${encodeURIComponent(r.roomId)}?m=${encodeURIComponent(r.messageId)}`}
                    className="text-amber-400 hover:underline break-all"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {r.roomId}
                  </a>
                </td>
                <td className="p-2 text-zinc-300 align-top">
                  <span className="font-mono text-xs">{r.reporterId}</span>
                  {r.reporterNickname ? (
                    <span className="block text-xs text-zinc-500">{r.reporterNickname}</span>
                  ) : null}
                </td>
                <td className="p-2 text-zinc-200 max-w-xs align-top">
                  <span className="line-clamp-3">{r.reason || '—'}</span>
                </td>
                <td className="p-2 align-top">
                  <span
                    className={
                      r.status === 'open'
                        ? 'text-amber-400'
                        : r.status === 'actioned'
                          ? 'text-green-400'
                          : 'text-zinc-500'
                    }
                  >
                    {r.status || '—'}
                  </span>
                </td>
                <td className="p-2 align-top whitespace-nowrap">
                  {r.status === 'open' ? (
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        disabled={busyId === r.id}
                        className="text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-2 py-1 rounded disabled:opacity-50"
                        onClick={() => setStatus(r.id, 'dismissed')}
                      >
                        {t('admin.chatReports.dismiss')}
                      </button>
                      <button
                        type="button"
                        disabled={busyId === r.id}
                        className="text-xs bg-amber-900/80 hover:bg-amber-800 text-white px-2 py-1 rounded disabled:opacity-50"
                        onClick={() => setStatus(r.id, 'actioned')}
                      >
                        {t('admin.chatReports.actioned')}
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-zinc-600">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ChatReportsSection;
