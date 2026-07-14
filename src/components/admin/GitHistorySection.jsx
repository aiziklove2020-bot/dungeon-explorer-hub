import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, GitCommit, ChevronDown, ChevronLeft, ExternalLink, FileText } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { adminAuthHeader, hasAdminApiClientSecret } from '../../utils/adminApi';

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('he-IL', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Jerusalem'
  });
};

const statusLabel = (status) => {
  const map = { added: 'נוסף', modified: 'שונה', removed: 'הוסר' };
  return map[status] || status;
};

const GitHistorySection = () => {
  const { t } = useLanguage();
  const [commits, setCommits] = useState([]);
  const [branch, setBranch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedSha, setExpandedSha] = useState(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!hasAdminApiClientSecret()) {
        throw new Error(t('admin.gitHistory.missingViteSecret'));
      }
      const res = await fetch('/api/git-history', { cache: 'no-store', headers: { ...adminAuthHeader() } });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) {
          throw new Error(t('admin.gitHistory.unauthorized'));
        }
        throw new Error(data.message || data.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setCommits(data.commits || []);
      setBranch(data.branch || '');
    } catch (e) {
      setError(e?.message || t('admin.gitHistory.loadFailed'));
      setCommits([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const toggleExpand = (sha) => {
    setExpandedSha((prev) => (prev === sha ? null : sha));
  };

  return (
    <div className="bg-zinc-900/50 backdrop-blur-2xl border border-white/5 p-4 md:p-6 rounded-xl md:rounded-2xl space-y-4 md:space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
          <GitCommit size={24} />
          היסטוריית Git
          {branch && (
            <span className="text-sm font-normal text-zinc-500">({branch})</span>
          )}
        </h2>
        <button
          type="button"
          onClick={fetchHistory}
          disabled={loading}
          className="bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-white px-3 md:px-4 py-1.5 md:py-2 rounded-xl font-bold text-xs md:text-sm flex items-center gap-2"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          רענן
        </button>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-600/30 p-3 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {loading && !commits.length && (
        <div className="text-center py-8 text-zinc-400">טוען היסטוריה...</div>
      )}

      {!loading && !error && commits.length === 0 && (
        <div className="text-center py-8 text-zinc-500">אין commits להצגה.</div>
      )}

      {!loading && commits.length > 0 && (
        <ul className="space-y-3">
          {commits.map((c) => (
            <li
              key={c.sha}
              className="bg-zinc-800/50 border border-white/5 rounded-lg overflow-hidden"
            >
              <div className="p-3 md:p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    {c.author?.avatar_url && (
                      <img
                        src={c.author.avatar_url}
                        alt=""
                        className="w-8 h-8 rounded-full flex-shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="font-bold text-white truncate">
                        {c.author?.name ?? 'Unknown'}
                      </p>
                      <p className="text-zinc-500 text-sm">
                        {formatDate(c.date)} · {c.sha?.slice(0, 7)}
                      </p>
                    </div>
                  </div>
                  {c.html_url && (
                    <a
                      href={c.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-400 hover:text-amber-300 flex items-center gap-1 text-sm"
                    >
                      <ExternalLink size={14} />
                      GitHub
                    </a>
                  )}
                </div>
                <p className="mt-2 text-zinc-300 text-sm whitespace-pre-wrap break-words">
                  {c.message || '—'}
                </p>
                {Array.isArray(c.files) && c.files.length > 0 && (
                  <button
                    type="button"
                    onClick={() => toggleExpand(c.sha)}
                    className="mt-3 flex items-center gap-2 text-zinc-400 hover:text-white text-sm"
                  >
                    {expandedSha === c.sha ? (
                      <ChevronDown size={16} />
                    ) : (
                      <ChevronLeft size={16} />
                    )}
                    <FileText size={14} />
                    קבצים ששונו ({c.files.length})
                  </button>
                )}
              </div>
              {expandedSha === c.sha && Array.isArray(c.files) && c.files.length > 0 && (
                <div className="border-t border-white/5 bg-zinc-900/50 px-3 md:px-4 py-2">
                  <ul className="space-y-1.5 text-sm">
                    {c.files.map((f, idx) => (
                      <li
                        key={idx}
                        className="flex flex-wrap items-center gap-2 text-zinc-400"
                      >
                        <span
                          className={
                            f.status === 'added'
                              ? 'text-green-400'
                              : f.status === 'removed'
                                ? 'text-red-400'
                                : 'text-amber-400'
                          }
                        >
                          {statusLabel(f.status)}
                        </span>
                        <span className="font-mono truncate" title={f.filename}>
                          {f.filename}
                        </span>
                        {(f.additions > 0 || f.deletions > 0) && (
                          <span className="text-zinc-500 text-xs">
                            +{f.additions} / −{f.deletions}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default GitHistorySection;
