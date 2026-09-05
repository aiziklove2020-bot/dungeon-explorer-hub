import { useState, useEffect, useMemo } from 'react';
import { Database, Download, Upload as UploadIcon, RefreshCw, AlertTriangle } from 'lucide-react';
import { exportFullDb, importFullDb, getDbSummary, EXPORTABLE_COLLECTION_KEYS } from '../../firebase/dbBackup';
import Loader from '../Loader';

const defaultSelected = () => Object.fromEntries(EXPORTABLE_COLLECTION_KEYS.map((k) => [k, true]));

const DBSection = () => {
  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);
  const [selectedCollections, setSelectedCollections] = useState(defaultSelected);

  const loadSummary = async () => {
    setLoadingSummary(true);
    setError(null);
    try {
      const s = await getDbSummary();
      setSummary(s);
    } catch (err) {
      setError(err.message || 'Failed to load DB summary');
      setSummary(null);
    } finally {
      setLoadingSummary(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  const selectedList = useMemo(
    () => EXPORTABLE_COLLECTION_KEYS.filter((k) => selectedCollections[k]),
    [selectedCollections]
  );

  const setAllSelected = (value) => {
    setSelectedCollections(Object.fromEntries(EXPORTABLE_COLLECTION_KEYS.map((k) => [k, value])));
  };

  const handleDownload = async () => {
    if (selectedList.length === 0) {
      setError('בחר לפחות אוסף אחד לייצוא');
      return;
    }
    setDownloading(true);
    setError(null);
    setProgress('Preparing export...');
    try {
      const data = await exportFullDb(selectedList);
      const dataStr = JSON.stringify(data, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `firebase-db-backup-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setProgress(null);
      await loadSummary();
    } catch (err) {
      setError(err.message || 'Export failed');
      setProgress(null);
    } finally {
      setDownloading(false);
    }
  };

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!window.confirm('שחזור ימזג (merge) את קובץ הגיבוי ל-Firebase. מסמכים קיימים יעודכנו, חדשים יתווספו. לא נמחק כלום. מסמך שכבר זהה לא ייכתב שוב. להמשיך?')) {
      e.target.value = '';
      return;
    }
    setUploading(true);
    setError(null);
    setProgress('Reading file...');
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const raw = event.target.result;
        const data = JSON.parse(raw);
        if (!data.collections) {
          throw new Error('Invalid backup file: missing collections');
        }
        setProgress('Restoring...');
        await importFullDb(data, (msg, current, total) => {
          setProgress(total ? `${msg} (${current}/${total})` : msg);
        });
        setProgress(null);
        await loadSummary();
        window.location.reload();
      } catch (err) {
        setError(err.message || 'Import failed');
        setProgress(null);
      } finally {
        setUploading(false);
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
          <Database size={24} />
          גיבוי / שחזור Firebase DB
        </h2>
        <button
          type="button"
          onClick={loadSummary}
          disabled={loadingSummary}
          className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw size={16} className={loadingSummary ? 'animate-spin' : ''} />
          רענן
        </button>
      </div>

      <p className="text-zinc-400 text-sm">
        ייצוא: בחר אילו אוספים לכלול בגיבוי (כולל UID). שחזור: merge — merges את הגיבוי ל-DB בלי למחוק; מסמך שכבר זהה לא נכתב שוב.
      </p>

      {error && (
        <div className="bg-red-900/30 border border-red-800 text-red-200 px-4 py-3 rounded-xl flex items-center gap-2">
          <AlertTriangle size={20} />
          <span>{error}</span>
        </div>
      )}

      {(progress || downloading || uploading) && (
        <div className="bg-zinc-800/50 border border-zinc-700 px-4 py-3 rounded-xl flex items-center gap-3">
          {(downloading || uploading) && <Loader size="small" />}
          <span className="text-zinc-300">{progress || (downloading ? 'מוריד...' : 'מעלה...')}</span>
        </div>
      )}

      <div className="bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
        <h3 className="text-sm font-bold text-zinc-500 uppercase mb-2">בחר אוספים לגיבוי</h3>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2">
          <button type="button" onClick={() => setAllSelected(true)} className="text-zinc-400 hover:text-white text-sm">
            בחר הכל
          </button>
          <span className="text-zinc-600">|</span>
          <button type="button" onClick={() => setAllSelected(false)} className="text-zinc-400 hover:text-white text-sm">
            נקה הכל
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {EXPORTABLE_COLLECTION_KEYS.map((key) => (
            <label key={key} className="flex items-center gap-2 bg-zinc-900/60 rounded-lg px-3 py-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={!!selectedCollections[key]}
                onChange={() => setSelectedCollections((prev) => ({ ...prev, [key]: !prev[key] }))}
                className="rounded border-zinc-600"
              />
              <span className="text-sm text-white">{key}</span>
              {summary?.collections?.[key] != null && (
                <span className="text-zinc-500 text-xs">({typeof summary.collections[key] === 'number' ? summary.collections[key] : summary.collections[key]})</span>
              )}
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading || uploading || selectedList.length === 0}
          className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-50"
        >
          <Download size={16} />
          הורד גיבוי ({selectedList.length} אוספים)
        </button>
        <label className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50">
          <UploadIcon size={16} />
          העלה DB (שחזור — merge)
          <input
            type="file"
            accept=".json,application/json"
            onChange={handleUpload}
            className="hidden"
            disabled={downloading || uploading}
          />
        </label>
      </div>

      {loadingSummary && !summary && (
        <div className="flex items-center gap-2 text-zinc-500">
          <Loader size="small" />
          <span>טוען סיכום DB...</span>
        </div>
      )}

      {summary && summary.collections && (
        <div className="bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
          <h3 className="text-sm font-bold text-zinc-500 uppercase mb-3">מצב Firebase כרגע</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-sm">
            {Object.entries(summary.collections).map(([name, count]) => (
              <div key={name} className="bg-zinc-900/60 rounded-lg px-3 py-2">
                <span className="text-zinc-400 block truncate" title={name}>{name}</span>
                <span className="text-white font-medium">{typeof count === 'number' ? count : String(count)}</span>
              </div>
            ))}
          </div>
          {typeof summary.totalDocs === 'number' && (
            <p className="text-zinc-500 text-xs mt-2">סה״כ מסמכים (כולל תת-אוספים): ~{summary.totalDocs}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default DBSection;
