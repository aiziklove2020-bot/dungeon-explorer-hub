import { useState, useTransition, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContent } from '../context/ContentContext';
import { useLanguage } from '../i18n/LanguageContext';
import { getDeployStatus } from '../firebase/settings';
import SEO from '../components/SEO';
import AdminAuthForm from '../components/admin/AdminAuthForm';
import AdminHeader from '../components/admin/AdminHeader';
import { adminTabs } from '../components/admin/adminTabs';
import PartiesSection from '../components/admin/PartiesSection';
import MatchesSection from '../components/admin/MatchesSection';
import UsersSection from '../components/admin/UsersSection';
import RssSection from '../components/admin/RssSection';
import HeroSection from '../components/admin/HeroSection';
import AboutSection from '../components/admin/AboutSection';
import ContactSection from '../components/admin/ContactSection';
import LinksSection from '../components/admin/LinksSection';
import AdminsSection from '../components/admin/AdminsSection';
import TelegramSection from '../components/admin/TelegramSection';
import StoreSection from '../components/admin/StoreSection';
import WorkshopsSection from '../components/admin/WorkshopsSection';
import DBLoggerSection from '../components/admin/DBLoggerSection';
import DBSection from '../components/admin/DBSection';
import GitHistorySection from '../components/admin/GitHistorySection';
import ForumAdminSection from '../components/admin/ForumAdminSection';
import LiveChatSection from '../components/admin/LiveChatSection';
import ChatReportsSection from '../components/admin/ChatReportsSection';
import BlogAdminSection from '../components/admin/BlogAdminSection';
import SubscriptionsSection from '../components/admin/SubscriptionsSection';

const Admin = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const {
    resetToDefaults,
    publishContent, importContentFromGit, reloadContent, clearAllContentCache
  } = useContent();

  const [isAuthenticated, setIsAuthenticated] = useState(() =>
    sessionStorage.getItem('admin_authenticated') === 'true'
  );
  const [activeSection, setActiveSection] = useState('hero');
  const [saved, setSaved] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishMessage, setPublishMessage] = useState('');
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const [partiesRefreshKey, setPartiesRefreshKey] = useState(0);
  const [publishedCommitSha, setPublishedCommitSha] = useState(null);
  const [deployStatusLoading, setDeployStatusLoading] = useState(false);
  const [deployStatus, setDeployStatus] = useState(null);
  const pollCountRef = useRef(0);
  const savedTimeoutRef = useRef(null);
  const [, startTransition] = useTransition();

  // Clear any pending "saved" reset timer on unmount so we don't call
  // setSaved on an unmounted component (which both leaks and warns).
  useEffect(() => {
    return () => {
      if (savedTimeoutRef.current) {
        clearTimeout(savedTimeoutRef.current);
        savedTimeoutRef.current = null;
      }
    };
  }, []);

  const POLL_INTERVAL_MS = 6000;
  const MAX_POLLS = 25;

  useEffect(() => {
    if (!publishedCommitSha || !deployStatusLoading) return;
    const shortSha = publishedCommitSha.toLowerCase();

    const check = async () => {
      const status = await getDeployStatus();
      if (status?.commitSha?.toLowerCase?.()?.includes(shortSha) ||
          status?.tag?.toLowerCase?.()?.includes(shortSha)) {
        setDeployStatus(status);
        setDeployStatusLoading(false);
        return true;
      }
      if (status) setDeployStatus(status);
      return false;
    };

    const id = setInterval(async () => {
      pollCountRef.current += 1;
      const done = await check();
      if (done || pollCountRef.current >= MAX_POLLS) {
        clearInterval(id);
        if (!done) setDeployStatusLoading(false);
      }
    }, POLL_INTERVAL_MS);

    check();

    return () => clearInterval(id);
  }, [publishedCommitSha, deployStatusLoading]);

  const handleAuthenticated = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('admin_authenticated');
    sessionStorage.removeItem('adminAuthenticated');
    sessionStorage.removeItem('admin_id');
    sessionStorage.removeItem('admin_username');
  };

  const showSaved = () => {
    setSaved(true);
    if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
    savedTimeoutRef.current = setTimeout(() => {
      setSaved(false);
      savedTimeoutRef.current = null;
    }, 2000);
  };

  const handlePublish = async () => {
    if (publishing) return;
    if (!confirm(t('admin.publishConfirm') || 'לפרסם את התוכן הנוכחי ל-Git? המבקרים יראו גרסה זו.')) return;
    setPublishing(true);
    setPublishMessage('');
    setPublishedCommitSha(null);
    setDeployStatus(null);
    setDeployStatusLoading(false);
    try {
      const result = await publishContent();
      const shortSha = result?.commit?.sha?.substring(0, 7) || null;
      setPublishMessage(
        shortSha
          ? `${t('admin.publishSuccess') || 'פורסם בהצלחה'}. Commit: ${shortSha}`
          : (t('admin.publishSuccess') || 'פורסם בהצלחה')
      );
      if (shortSha) {
        pollCountRef.current = 0;
        setPublishedCommitSha(shortSha);
        setDeployStatusLoading(true);
      }
      setPartiesRefreshKey(k => k + 1);
      if (typeof reloadContent === 'function') reloadContent();
    } catch (err) {
      setPublishMessage(
        (err?.message || err?.details?.message || t('admin.publishError') || 'שגיאה בפרסום') +
        (err?.details?.hint ? ` — ${err.details.hint}` : '')
      );
    } finally {
      setPublishing(false);
    }
  };

  const handleImportFromGit = async () => {
    if (importing) return;
    const doParties = confirm(
      (t('admin.importConfirm1') || 'לטעון תוכן מ-Git (ענף PublishMode) למסד הנתונים.') + '\n\n' +
      (t('admin.importConfirm2') || 'לכלול גם מסיבות מהקובץ? (לחץ OK = כן, ביטול = רק תוכן)\nכן = המסיבות הפעילות יוחלפו במסיבות מהקובץ (רישומים יאבדו).')
    );
    const confirmMsg = doParties
      ? (t('admin.importConfirm3WithParties') || 'לאשר: תוכן מ-Git יישמר ב-DB כולל החלפת מסיבות.')
      : (t('admin.importConfirm3NoParties') || 'לאשר: תוכן מ-Git יישמר ב-DB (תוכן בלבד, בלי שינוי מסיבות).');
    if (!confirm(confirmMsg)) return;
    setImporting(true);
    setImportMessage('');
    try {
      const result = await importContentFromGit({ includeParties: doParties });
      setImportMessage(
        result?.partiesCreated != null
          ? `${t('admin.importSuccessWithParties') || 'נטען מ-Git בהצלחה'}. ${result.partiesCreated} מסיבות נוצרו.`
          : (t('admin.importSuccessNoParties') || 'נטען מ-Git בהצלחה ונשמר ב-DB.')
      );
      if (typeof clearAllContentCache === 'function') clearAllContentCache();
      if (typeof reloadContent === 'function') reloadContent(true);
    } catch (err) {
      setImportMessage(
        (err?.message || err?.details?.message || t('admin.importError') || 'שגיאה בייבוא') +
        (err?.details?.hint ? ` — ${err.details.hint}` : '')
      );
    } finally {
      setImporting(false);
    }
  };

  if (!isAuthenticated) {
    return <AdminAuthForm onAuthenticated={handleAuthenticated} />;
  }

  return (
    <div className="min-h-screen bg-black text-white py-6 sm:py-8" dir="rtl">
      <SEO title="Admin" noindex />
      <div className="container mx-auto px-3 sm:px-4 max-w-6xl">

        <AdminHeader
          saved={saved}
          publishing={publishing} publishMessage={publishMessage} onPublish={handlePublish}
          publishedCommitSha={publishedCommitSha}
          deployStatusLoading={deployStatusLoading}
          deployStatus={deployStatus}
          importing={importing} importMessage={importMessage} onImport={handleImportFromGit}
          onReset={() => {
            if (confirm(t('admin.resetConfirm') || 'האם אתה בטוח שברצונך לאפס את כל התוכן לברירות מחדל?')) {
              resetToDefaults();
              showSaved();
            }
          }}
          onViewSite={() => navigate('/')}
          onLogout={handleLogout}
        />

        <div className="flex flex-nowrap sm:flex-wrap gap-2 mb-6 md:mb-8 border-b border-zinc-800 pb-3 md:pb-4 overflow-x-auto overscroll-x-contain touch-pan-x -mx-1 px-1 sm:mx-0 sm:px-0">
          {adminTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => startTransition(() => setActiveSection(tab.id))}
              className={`shrink-0 px-3 md:px-4 py-2 md:py-2 rounded-xl text-xs md:text-sm font-bold transition-all whitespace-nowrap touch-manipulation ${
                activeSection === tab.id
                  ? 'bg-red-600 text-white'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="space-y-6">
          {activeSection === 'hero'      && <HeroSection showSaved={showSaved} />}
          {activeSection === 'parties'   && <PartiesSection showSaved={showSaved} refreshKey={partiesRefreshKey} />}
          {activeSection === 'about'     && <AboutSection showSaved={showSaved} />}
          {activeSection === 'contact'   && <ContactSection showSaved={showSaved} />}
          {activeSection === 'matching'  && <MatchesSection showSaved={showSaved} />}
          {activeSection === 'links'     && <LinksSection showSaved={showSaved} />}
          {activeSection === 'store'     && <StoreSection showSaved={showSaved} />}
          {activeSection === 'workshops' && <WorkshopsSection showSaved={showSaved} />}
          {activeSection === 'db'        && <DBSection />}
          {activeSection === 'dbLogger'  && <DBLoggerSection />}
          {activeSection === 'forum'     && <ForumAdminSection showSaved={showSaved} />}
          {activeSection === 'liveChat'  && <LiveChatSection showSaved={showSaved} />}
          {activeSection === 'chatReports' && <ChatReportsSection showSaved={showSaved} />}
          {activeSection === 'blog'      && <BlogAdminSection showSaved={showSaved} />}
          {activeSection === 'users'     && <UsersSection showSaved={showSaved} />}
          {activeSection === 'subscriptions' && <SubscriptionsSection showSaved={showSaved} />}
          {activeSection === 'admins'    && <AdminsSection showSaved={showSaved} />}
          {activeSection === 'rss'       && <RssSection showSaved={showSaved} />}
          {activeSection === 'telegram'  && <TelegramSection showSaved={showSaved} />}
          {activeSection === 'gitHistory' && <GitHistorySection />}
        </div>
      </div>
    </div>
  );
};

export default Admin;
