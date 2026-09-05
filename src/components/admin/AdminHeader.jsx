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
      <div className="mb-8 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <img src="/assets/logo-new.png" alt="" style={{ width: 44, height: 44 }} />
          <div>
            <h1 style={{ fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 700, fontSize: 26 }}>
              LIBRAL PARTY <span style={{ color: '#e11d48' }}>ניהול</span>
            </h1>
            <p style={{ color: '#a9a9b2', fontSize: 13 }}>{t('admin.panelSubtitle')}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="text-white text-sm font-bold flex items-center gap-2"
          style={{ background: 'transparent', border: '1px solid #e11d48', borderRadius: 15, padding: '10px 16px' }}
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

      <div
        className="mb-6 p-4"
        style={{ background: 'linear-gradient(180deg,#101014,#0a0a0c)', border: '1px solid #2d2d34', borderRadius: 20 }}
      >
        <div className="flex flex-wrap items-start gap-x-8 gap-y-4">

          <div>
            <p className="text-xs font-bold uppercase mb-2" style={{ color: '#8f8f97', letterSpacing: 1 }}>כללי</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onViewSite}
                title={t('admin.editSite')}
                className="text-white text-sm font-bold flex items-center gap-2"
                style={{ background: '#15151a', border: '1px solid #2d2d34', borderRadius: 15, padding: '10px 16px' }}
              >
                <Eye size={16} style={{ color: '#3ecf6d' }} /> {t('admin.editSite')}
              </button>
              <button
                onClick={onPublish}
                disabled={publishing}
                title={t('admin.publishTitle')}
                className="text-white disabled:opacity-50 text-sm font-bold flex items-center gap-2"
                style={{ background: 'linear-gradient(135deg,#e11d48,#be0037)', borderRadius: 15, padding: '10px 16px' }}
              >
                {publishing ? <Loader2 size={16} className="animate-spin shrink-0" /> : <Upload size={16} />}
                {publishing ? t('admin.publishing') : t('admin.publish')}
              </button>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase mb-2" style={{ color: '#8f8f97', letterSpacing: 1 }}>פרסום מסיבות</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={onPostParties}
                disabled={postingParties}
                title="שולח עכשיו את כל המסיבות הפעילות באתר לטלגרם, בלי לחכות ללו&quot;ז האוטומטי"
                className="text-white disabled:opacity-50 text-sm font-bold flex items-center gap-2"
                style={{ background: '#15151a', border: '1px solid #2d2d34', borderRadius: 15, padding: '10px 16px' }}
              >
                {postingParties ? <Loader2 size={16} className="animate-spin shrink-0" /> : <Megaphone size={16} style={{ color: '#ad43ff' }} />}
                {postingParties ? 'מפרסם...' : 'טלגרם'}
              </button>
              <button
                onClick={onPostPartiesWhatsApp}
                disabled={postingPartiesWhatsApp}
                title="שולח עכשיו את כל המסיבות הפעילות באתר לוואטסאפ, דרך הבוט שרץ על המחשב שלך (localhost:3000)"
                className="text-white disabled:opacity-50 text-sm font-bold flex items-center gap-2"
                style={{ background: '#15151a', border: '1px solid #2d2d34', borderRadius: 15, padding: '10px 16px' }}
              >
                {postingPartiesWhatsApp ? <Loader2 size={16} className="animate-spin shrink-0" /> : <Megaphone size={16} style={{ color: '#3ecf6d' }} />}
                {postingPartiesWhatsApp ? 'מפרסם...' : 'וואטסאפ'}
              </button>
              <button
                onClick={onPostPartiesInstagram}
                disabled={postingPartiesInstagram}
                title="מפרסם רק את המסיבות המסומנות &quot;כלול באינסטגרם&quot; (פוסט + סטורי לכל אחת), דרך Windsor.ai"
                className="text-white disabled:opacity-50 text-sm font-bold flex items-center gap-2"
                style={{ background: '#15151a', border: '1px solid #2d2d34', borderRadius: 15, padding: '10px 16px' }}
              >
                {postingPartiesInstagram ? <Loader2 size={16} className="animate-spin shrink-0" /> : <Instagram size={16} style={{ color: '#f3b82d' }} />}
                {postingPartiesInstagram ? 'מפרסם...' : 'אינסטגרם'}
              </button>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase mb-2" style={{ color: '#8f8f97', letterSpacing: 1 }}>נתונים</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={onImport}
                disabled={importing}
                title={t('admin.importTitle')}
                className="text-white disabled:opacity-50 text-sm font-bold flex items-center gap-2"
                style={{ background: '#15151a', border: '1px solid #2d2d34', borderRadius: 15, padding: '10px 16px' }}
              >
                {importing ? <Loader2 size={16} className="animate-spin shrink-0" /> : <Download size={16} />}
                {importing ? t('admin.importing') : t('admin.import')}
              </button>
              <button
                onClick={onReset}
                className="text-white text-sm font-bold flex items-center gap-2"
                style={{ background: 'transparent', border: '1px solid #7c1828', color: '#ff5a72', borderRadius: 15, padding: '10px 16px' }}
              >
                <RotateCcw size={16} /> {t('admin.resetBtn')}
              </button>
            </div>
          </div>

        </div>
      </div>

      {publishMessage && (
        <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className={`text-sm ${publishMessage.startsWith('פורסם') ? 'text-green-400' : 'text-[#ffb4ab]'}`}>
            {publishMessage}
          </p>
          {publishedCommitSha && (publishMessage.startsWith('פורסם') || publishMessage.includes('Commit:')) && (
            <span className="text-sm text-[#a9a9b2] flex items-center gap-2">
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
        <p className={`mb-4 text-sm ${importMessage.includes('הצלחה') ? 'text-green-400' : 'text-[#ffb4ab]'}`}>
          {importMessage}
        </p>
      )}
    </>
  );
};

export default AdminHeader;
