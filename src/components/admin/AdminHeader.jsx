import { X, RotateCcw, CheckCircle2, Eye, Upload, Download, Loader2, Megaphone, Instagram } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

/**
 * Admin panel top bar: title, logout, action buttons (publish, import, reset, view site),
 * and the saved/publish/import status messages.
 */
const AdminHeader = ({
  saved,
  publishing,
  publishMessage,
  publishedCommitSha,
  deployStatusLoading,
  deployStatus,
  importing,
  importMessage,
  onLogout,
  onPublish,
  postingParties,
  onPostParties,
  postingPartiesWhatsApp,
  onPostPartiesWhatsApp,
  postingPartiesInstagram,
  onPostPartiesInstagram,
  onImport,
  onReset,
  onViewSite,
}) => {
  const { t } = useLanguage();
  const shortSha = (publishedCommitSha || '').toLowerCase();
  const buildMatches =
    deployStatus &&
    (deployStatus.commitSha?.toLowerCase?.()?.includes(shortSha) ||
      deployStatus.tag?.toLowerCase?.()?.includes(shortSha));

  return (
    <>
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-black italic mb-2">
            <span className="text-red-600">ADMIN</span> PANEL
          </h1>
          <p className="text-zinc-500 text-sm">{t('admin.panelSubtitle')}</p>
        </div>
        <button
          onClick={onLogout}
          className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2"
        >
          <X size={16} /> {t('admin.logout')}
        </button>
      </div>

      {saved && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-full flex items-center gap-2 z-50 shadow-lg">
          <CheckCircle2 size={20} />
          <span className="font-bold">{t('admin.savedMessage')}</span>
        </div>
      )}

      <div className="flex flex-wrap gap-3 mb-6">
        <button
          type="button"
          onClick={onViewSite}
          className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2"
          title={t('admin.editSite')}
        >
          <Eye size={16} /> {t('admin.editSite')}
        </button>
        <button
          onClick={onPublish}
          disabled={publishing}
          title={t('admin.publishTitle')}
          className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2"
        >
          {publishing ? (
            <Loader2 size={16} className="animate-spin shrink-0" />
          ) : (
            <Upload size={16} />
          )}
          {publishing ? t('admin.publishing') : t('admin.publish')}
        </button>
        <button
          onClick={onPostParties}
          disabled={postingParties}
          title="שולח עכשיו את כל המסיבות הפעילות באתר לטלגרם, בלי לחכות ללו&quot;ז האוטומטי"
          className="bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2"
        >
          {postingParties ? (
            <Loader2 size={16} className="animate-spin shrink-0" />
          ) : (
            <Megaphone size={16} />
          )}
          {postingParties ? 'מפרסם...' : 'פרסם מסיבות לטלגרם'}
        </button>
        <button
          onClick={onPostPartiesWhatsApp}
          disabled={postingPartiesWhatsApp}
          title="שולח עכשיו את כל המסיבות הפעילות באתר לוואטסאפ, דרך הבוט שרץ על המחשב שלך (localhost:3000)"
          className="bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2"
        >
          {postingPartiesWhatsApp ? (
            <Loader2 size={16} className="animate-spin shrink-0" />
          ) : (
            <Megaphone size={16} />
          )}
          {postingPartiesWhatsApp ? 'מפרסם...' : 'פרסם מסיבות לוואטסאפ'}
        </button>
        <button
          onClick={onPostPartiesInstagram}
          disabled={postingPartiesInstagram}
          title="מפרסם רק את המסיבות המסומנות &quot;כלול באינסטגרם&quot; (פוסט + סטורי לכל אחת), דרך Windsor.ai"
          className="bg-gradient-to-tr from-yellow-500 via-pink-600 to-purple-600 hover:opacity-90 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2"
        >
          {postingPartiesInstagram ? (
            <Loader2 size={16} className="animate-spin shrink-0" />
          ) : (
            <Instagram size={16} />
          )}
          {postingPartiesInstagram ? 'מפרסם...' : 'פרסם מסיבות לאינסטגרם'}
        </button>
        <button
          onClick={onImport}
          disabled={importing}
          title={t('admin.importTitle')}
          className="bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2"
        >
          {importing ? (
            <Loader2 size={16} className="animate-spin shrink-0" />
          ) : (
            <Download size={16} />
          )}
          {importing ? t('admin.importing') : t('admin.import')}
        </button>
        <button
          onClick={onReset}
          className="bg-red-900/50 hover:bg-red-900 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2"
        >
          <RotateCcw size={16} /> {t('admin.resetBtn')}
        </button>
      </div>

      {publishMessage && (
        <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className={`text-sm ${publishMessage.startsWith('פורסם') ? 'text-green-400' : 'text-red-400'}`}>
            {publishMessage}
          </p>
          {publishedCommitSha && (publishMessage.startsWith('פורסם') || publishMessage.includes('Commit:')) && (
            <span className="text-sm text-zinc-400 flex items-center gap-2">
              {deployStatusLoading && (
                <>
                  <Loader2 size={16} className="animate-spin shrink-0" />
                  <span>{t('admin.buildChecking') || 'בודק סטטוס בנייה...'}</span>
                </>
              )}
              {!deployStatusLoading && buildMatches && (
                <span className="text-green-400">✓ {t('admin.buildPassed') || 'Build: passed'}</span>
              )}
              {!deployStatusLoading && !buildMatches && publishedCommitSha && (
                <span className="text-amber-400">{t('admin.buildPending') || 'בונה...'}</span>
              )}
            </span>
          )}
        </div>
      )}
      {importMessage && (
        <p className={`mb-4 text-sm ${importMessage.includes('הצלחה') ? 'text-green-400' : 'text-red-400'}`}>
          {importMessage}
        </p>
      )}
    </>
  );
};

export default AdminHeader;
