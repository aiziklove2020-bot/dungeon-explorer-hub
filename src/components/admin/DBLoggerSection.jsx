import { useState, useEffect } from 'react';
import { Download, Trash2, BarChart3, Power, PowerOff, RefreshCw, Database } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { dbLogger } from '../../utils/dbLogger';
import { getDBReadLogs, getDBReadLogsStats, clearAllDBReadLogs } from '../../firebase/dbReadLogs';

const DBLoggerSection = () => {
  const { t } = useLanguage();
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [enabled, setEnabled] = useState(dbLogger.isEnabled());
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('local'); // 'local' or 'firestore'

  const refreshStats = async () => {
    if (viewMode === 'local') {
      setStats(dbLogger.getStats());
      setLogs(dbLogger.getLogs(100));
    } else {
      // Load from Firestore
      setLoading(true);
      try {
        const [firestoreLogs, firestoreStats] = await Promise.all([
          getDBReadLogs(100),
          getDBReadLogsStats()
        ]);
        setLogs(firestoreLogs);
        setStats({
          today: {
            totalReads: firestoreStats.totalReads,
            totalCalls: firestoreStats.totalCalls,
            byFunction: Object.entries(firestoreStats.byFunction)
              .sort((a, b) => b[1] - a[1])
              .map(([func, reads]) => ({ function: func, reads }))
          },
          allTime: {
            totalReads: firestoreStats.totalReads,
            totalCalls: firestoreStats.totalCalls
          }
        });
      } catch (error) {
        console.error('Failed to load Firestore logs:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    refreshStats();
    
    if (autoRefresh) {
      const interval = setInterval(refreshStats, 10000); // Refresh every 10 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh, viewMode]);

  const handleExport = () => {
    const data = dbLogger.exportLogs();
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `db-reads-log-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleClear = async () => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק את כל הלוגים?')) {
      try {
        setLoading(true);
        
        // Clear both local and Firestore logs regardless of view mode
        dbLogger.clearLogs(); // Clear localStorage logs
        await clearAllDBReadLogs(); // Clear Firestore logs
        
        // Clear component state immediately - force empty state
        setLogs([]);
        setStats({
          today: {
            totalReads: 0,
            totalCalls: 0,
            byFunction: []
          },
          allTime: {
            totalReads: 0,
            totalCalls: 0
          }
        });
        
        // Wait a moment for Firestore to process the deletion
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Force refresh both views to ensure everything is cleared
        await refreshStats();
        
        // Double-check: refresh again after a short delay
        setTimeout(async () => {
          await refreshStats();
          setLoading(false);
        }, 1000);
      } catch (error) {
        setLoading(false);
        alert(`שגיאה במחיקת לוגים: ${error.message}`);
      }
    }
  };

  const handleToggle = () => {
    const newState = dbLogger.toggle();
    setEnabled(newState);
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="bg-[#121218] backdrop-blur-2xl border border-white/5 p-4 md:p-6 rounded-xl md:rounded-2xl space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
          <BarChart3 size={24} />
          Database Reads Logger
        </h2>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleToggle}
            className={`${
              enabled 
                ? 'bg-green-600 hover:bg-green-500' 
                : 'bg-gray-600 hover:bg-gray-500'
            } text-white px-3 md:px-4 py-1.5 md:py-2 rounded-xl font-bold text-xs md:text-sm flex items-center gap-2`}
            title={enabled ? 'כבה לוג' : 'הפעל לוג'}
          >
            {enabled ? <Power size={16} /> : <PowerOff size={16} />}
            {enabled ? 'מופעל' : 'כבוי'}
          </button>
          <div className="flex gap-1 bg-zinc-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('local')}
              className={`px-3 py-1 rounded text-xs font-bold ${
                viewMode === 'local' 
                  ? 'bg-zinc-700 text-white' 
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              מקומי
            </button>
            <button
              onClick={() => setViewMode('firestore')}
              className={`px-3 py-1 rounded text-xs font-bold flex items-center gap-1 ${
                viewMode === 'firestore' 
                  ? 'bg-zinc-700 text-white' 
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Database size={14} />
              Firestore (כל המשתמשים)
            </button>
          </div>
          <button
            onClick={refreshStats}
            className="bg-zinc-700 hover:bg-zinc-600 text-white px-3 md:px-4 py-1.5 md:py-2 rounded-xl font-bold text-xs md:text-sm flex items-center gap-2"
          >
            <RefreshCw size={16} />
            רענן
          </button>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            עדכון אוטומטי
          </label>
          <button
            onClick={handleExport}
            className="bg-blue-600 hover:bg-blue-500 text-white px-3 md:px-4 py-1.5 md:py-2 rounded-xl font-bold text-xs md:text-sm flex items-center gap-2"
          >
            <Download size={16} />
            ייצא לוגים
          </button>
          <button
            onClick={handleClear}
            className="bg-[#e11d48] hover:bg-[#be0037] text-white px-3 md:px-4 py-1.5 md:py-2 rounded-xl font-bold text-xs md:text-sm flex items-center gap-2"
          >
            <Trash2 size={16} />
            נקה הכל
          </button>
        </div>
      </div>

      {!enabled && (
        <div className="bg-yellow-900/30 border border-yellow-600/30 p-3 rounded-lg text-yellow-400 text-sm">
          ⚠️ הלוג כבוי - קריאות למסד הנתונים לא יתועדו
        </div>
      )}

      {viewMode === 'firestore' && (
        <div className="bg-blue-900/30 border border-blue-600/30 p-3 rounded-lg text-blue-400 text-sm">
          📊 מציג לוגים מ-Firestore - כל המשתמשים. הלוגים נשמרים עם batch writes כדי למזער קריאות.
        </div>
      )}

      {loading && (
        <div className="text-center py-4 text-zinc-400">
          טוען לוגים...
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-zinc-800/50 p-4 rounded-lg">
            <h3 className="text-lg font-bold mb-3">היום</h3>
            <div className="space-y-2">
              <p><strong>סה"כ קריאות:</strong> {stats.today.totalReads.toLocaleString()}</p>
              <p><strong>סה"כ קריאות לפונקציות:</strong> {stats.today.totalCalls.toLocaleString()}</p>
            </div>
          </div>
          <div className="bg-zinc-800/50 p-4 rounded-lg">
            <h3 className="text-lg font-bold mb-3">כל הזמנים</h3>
            <div className="space-y-2">
              <p><strong>סה"כ קריאות:</strong> {stats.allTime.totalReads.toLocaleString()}</p>
              <p><strong>סה"כ קריאות לפונקציות:</strong> {stats.allTime.totalCalls.toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {stats && stats.today.byFunction.length > 0 && (
        <div className="bg-zinc-800/50 p-4 rounded-lg">
          <h3 className="text-lg font-bold mb-3">קריאות לפי פונקציה (היום)</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {stats.today.byFunction.map((item, index) => (
              <div key={index} className="flex justify-between items-center p-2 bg-[#121218] rounded">
                <span className="font-mono text-sm">{item.function}</span>
                <span className="font-bold text-yellow-400">{item.reads.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-zinc-800/50 p-4 rounded-lg">
        <h3 className="text-lg font-bold mb-3">לוג אחרון (100 קריאות אחרונות)</h3>
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {logs.map((log, index) => (
            <div
              key={index}
              className={`p-2 rounded text-xs font-mono ${
                log.success ? 'bg-[#121218]' : 'bg-red-900/30'
              }`}
            >
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-yellow-400">{formatTime(log.timestamp)}</span>
                    <span className="text-blue-400 font-bold">{log.function}</span>
                    {log.readCount > 0 && (
                      <span className="text-green-400 font-bold">({log.readCount} reads)</span>
                    )}
                    {log.readCount === 0 && (
                      <span className="text-gray-400">(cached)</span>
                    )}
                    {log.isCached && (
                      <span className="text-gray-500 text-[10px]">⚡ Cache Hit</span>
                    )}
                  </div>
                  {(log.caller || log.reason) && (
                    <div className="mt-1 text-[10px] text-zinc-400">
                      {log.caller && log.caller !== 'unknown' && (
                        <span className="text-purple-400">📍 {log.caller}</span>
                      )}
                      {log.reason && log.reason !== 'unknown' && (
                        <span className="ml-2 text-cyan-400">💡 {log.reason}</span>
                      )}
                    </div>
                  )}
                  {/* Additional details */}
                  <div className="mt-1 text-[10px] text-zinc-500 space-y-0.5">
                    {log.resultType && log.resultType !== 'null' && (
                      <div>
                        <span className="text-zinc-500">Type: </span>
                        <span className="text-orange-400">{log.resultType}</span>
                        {log.resultSize > 0 && (
                          <span className="ml-2 text-zinc-500">Size: </span>
                        )}
                        {log.resultSize > 0 && (
                          <span className="text-orange-400">{log.resultSize}</span>
                        )}
                      </div>
                    )}
                    {log.resultDetails && typeof log.resultDetails === 'object' && (
                      <div className="text-zinc-600">
                        {log.resultDetails.length !== undefined && (
                          <span>Length: {log.resultDetails.length} </span>
                        )}
                        {log.resultDetails.keys && (
                          <span>Keys: {log.resultDetails.keys?.slice(0, 3).join(', ')}...</span>
                        )}
                        {log.resultDetails.sample && (
                          <span>Sample: {log.resultDetails.sample}</span>
                        )}
                      </div>
                    )}
                    {log.params && Object.keys(log.params).length > 0 && (
                      <div className="text-zinc-600">
                        <span className="text-zinc-500">Params: </span>
                        <span>{Object.keys(log.params).slice(0, 3).join(', ')}</span>
                        {Object.keys(log.params).length > 3 && <span>...</span>}
                      </div>
                    )}
                  </div>
                </div>
                {!log.success && (
                  <span className="text-red-400 text-[10px]">{log.error}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DBLoggerSection;

