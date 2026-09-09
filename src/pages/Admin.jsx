import { useState, useTransition, useEffect, useRef } from 'react';
import {
  ChevronDown, ChevronUp, Heart, PartyPopper, Users, Palette, UserCog, CreditCard,
  Info, Phone, Link2, ShoppingBag, GraduationCap, MessageCircle, Flag, Trash2,
  ShieldCheck, Megaphone, Rss, Send, Database, FileClock, GitBranch, ShieldCheck as ShieldIcon, Lock,
} from 'lucide-react';

const TAB_ICONS = {
  matching: Heart, parties: PartyPopper, users: Users, siteDesign: Palette,
  forumUsers: UserCog, subscriptions: CreditCard, about: Info, contact: Phone,
  links: Link2, store: ShoppingBag, workshops: GraduationCap, liveChat: MessageCircle,
  chatReports: Flag, deleteRequests: Trash2, admins: ShieldCheck, advertisers: Megaphone,
  rss: Rss, telegram: Send, db: Database, dbLogger: FileClock, gitHistory: GitBranch,
};
import { useNavigate } from '@tanstack/react-router';
import { useContent } from '../context/ContentContext';
import { useLanguage } from '../i18n/LanguageContext';
import SEO from '../components/SEO';
import AdminAuthForm from '../components/admin/AdminAuthForm';
import AdminHeader from '../components/admin/AdminHeader';
import { adminTabs } from '../components/admin/adminTabs';
import PartiesSection from '../components/admin/PartiesSection';
import MatchesSection from '../components/admin/MatchesSection';
import UsersSection from '../components/admin/UsersSection';
import RssSection from '../components/admin/RssSection';
import AboutSection from '../components/admin/AboutSection';
import ContactSection from '../components/admin/ContactSection';
import LinksSection from '../components/admin/LinksSection';
import AdminsSection from '../components/admin/AdminsSection';
import AdvertisersSection from '../components/admin/AdvertisersSection';
import TelegramSection from '../components/admin/TelegramSection';
import StoreSection from '../components/admin/StoreSection';
import WorkshopsSection from '../components/admin/WorkshopsSection';
import DBLoggerSection from '../components/admin/DBLoggerSection';
import DBSection from '../components/admin/DBSection';
import GitHistorySection from '../components/admin/GitHistorySection';
import ForumUsersSection from '../components/admin/ForumUsersSection';
import LiveChatSection from '../components/admin/LiveChatSection';
import ChatReportsSection from '../components/admin/ChatReportsSection';
import DeleteRequestsSection from '../components/admin/DeleteRequestsSection';
import SubscriptionsSection from '../components/admin/SubscriptionsSection';
import SiteDesignSection from '../components/admin/SiteDesignSection';
import { adminAuthHeader } from '../utils/adminApi';

const Admin = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const {
    resetToDefaults,
    importContentFromGit, reloadContent, clearAllContentCache
  } = useContent();

  // Always start unauthenticated so the very first client render matches
  // what the server rendered (the server has no sessionStorage, so it
  // always renders the logged-out view) — reading sessionStorage in the
  // initializer made the client's first render disagree with the server's,
  // which React flags as a hydration mismatch. The real check happens once,
  // safely, after mount below.
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem('admin_authenticated') === 'true') {
      setIsAuthenticated(true);
    }
  }, []);
  const [activeSection, setActiveSection] = useState('parties');
  // Advanced tools (DB backup, DB read-log, git history) are real working
  // features, just rarely-clicked/technical — collapsed by default to keep
  // the main tab row focused, not removed.
  const [showAdvancedTabs, setShowAdvancedTabs] = useState(false);
  const [saved, setSaved] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const [postingParties, setPostingParties] = useState(false);
  const [postingPartiesInstagram, setPostingPartiesInstagram] = useState(false);
  const [partiesRefreshKey, setPartiesRefreshKey] = useState(0);
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

  const handlePostParties = async () => {
    if (postingParties) return;
    if (!confirm('לפרסם עכשיו את כל המסיבות הפעילות באתר לטלגרם?')) return;
    setPostingParties(true);
    try {
      const res = await fetch('/api/telegram-webhook?job=manual-post', {
        headers: { ...adminAuthHeader() }
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        alert(`הפרסום נכשל: ${data.error || res.statusText}`);
        return;
      }
      alert(`הפרסום הושלם.\nמסיבות שפורסמו: ${data.partiesSent}`);
      showSaved();
    } catch (err) {
      alert(`הפרסום נכשל: ${err.message}`);
    } finally {
      setPostingParties(false);
    }
  };

  // Posts every currently active party to Instagram (feed post + story each),
  // one at a time. Mirrors handlePostParties (Telegram), but runs client-side
  // since there's no dedup/cron job for Instagram yet — each click re-posts
  // every active party, same behavior as the Telegram button.
  const handlePostPartiesInstagram = async () => {
    if (postingPartiesInstagram) return;
    if (!confirm('לפרסם עכשיו את כל המסיבות שמסומנות "כלול באינסטגרם" לאינסטגרם (פוסט + סטורי לכל אחת)?')) return;
    setPostingPartiesInstagram(true);
    try {
      const { getActiveParties } = await import('../firebase/parties');
      const parties = await getActiveParties();
      // Only parties explicitly marked "כלול באינסטגרם" in the editor — the
      // admin wants this scoped to a specific line (talking_b_d_s_m /
      // "Dungeon") rather than every active party on the site, to avoid
      // spamming/risking that Instagram account with unrelated content.
      const publishable = parties.filter((p) => p.publishToInstagram === true && (p.imageURL || p.img));
      if (publishable.length === 0) {
        alert('אין מסיבות המסומנות "כלול באינסטגרם" כרגע. סמן/י מסיבה בעריכה כדי לכלול אותה.');
        return;
      }
      let sent = 0;
      const errors = [];
      for (const party of publishable) {
        try {
          const res = await fetch('/api/publish-content', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...adminAuthHeader() },
            body: JSON.stringify({ job: 'instagram-publish', partyId: party.id }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok || !data.ok) {
            errors.push(`${party.name || party.title}: ${data.message || data.error || 'שגיאה'}`);
          } else {
            sent += 1;
          }
        } catch (err) {
          errors.push(`${party.name || party.title}: ${err.message}`);
        }
      }
      alert(
        `הפרסום לאינסטגרם הושלם.\nפורסמו בהצלחה: ${sent}/${publishable.length}` +
        (errors.length ? `\n\nשגיאות:\n${errors.join('\n')}` : '')
      );
      showSaved();
    } catch (err) {
      alert(`הפרסום לאינסטגרם נכשל: ${err.message}`);
    } finally {
      setPostingPartiesInstagram(false);
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
    <div className="lp-admin-theme min-h-dvh text-white" dir="rtl" style={{ background: '#0B0B0F', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <SEO title="Admin" noindex />

      {/* Desktop sidebar — the new design's nav shell. Hidden on mobile, where
          the existing horizontal pill-tab row below still drives navigation. */}
      <aside className="hidden md:flex fixed right-0 top-0 h-full w-64 flex-col justify-between z-40" style={{ background: '#121218', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex flex-col overflow-y-auto">
          <div className="h-16 px-5 flex items-center gap-3 shrink-0">
            <img src="/assets/logo-new.png" alt="" className="object-contain" style={{ width: 100, height: 'auto' }} />
            <div className="flex flex-col">
              <span className="font-bold text-sm tracking-tight">LIBRAL PARTY</span>
              <span className="text-xs" style={{ color: '#ffb3b6' }}>פורטל ניהול</span>
            </div>
          </div>
          <div className="px-4 py-2">
            <div className="p-2.5 rounded-lg flex items-center justify-between" style={{ background: '#1f1f23' }}>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#10B981' }} />
                <span className="text-xs" style={{ color: '#e4e1e7' }}>מצב מאובטח</span>
              </div>
              <Lock size={14} style={{ color: '#e11d48' }} />
            </div>
          </div>
          <nav className="flex flex-col gap-0.5 px-3 mt-2 pb-4">
            {adminTabs.filter(tab => !tab.advanced).map(tab => {
              const Icon = TAB_ICONS[tab.id] || Info;
              const active = activeSection === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => startTransition(() => setActiveSection(tab.id))}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-bold transition-colors text-right"
                  style={active
                    ? { background: 'linear-gradient(135deg,#e11d48,#be0037)', color: '#fff' }
                    : { background: 'transparent', color: '#a9a9b2' }}
                >
                  <Icon size={18} />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setShowAdvancedTabs((v) => !v)}
              className="flex items-center justify-between px-3 py-2 rounded-lg text-sm font-bold mt-2"
              style={{ color: '#7a7a82' }}
            >
              <span>מתקדם</span>
              {showAdvancedTabs ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {showAdvancedTabs && adminTabs.filter(tab => tab.advanced).map(tab => {
              const Icon = TAB_ICONS[tab.id] || Info;
              const active = activeSection === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => startTransition(() => setActiveSection(tab.id))}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-bold transition-colors text-right"
                  style={active
                    ? { background: 'linear-gradient(135deg,#e11d48,#be0037)', color: '#fff' }
                    : { background: 'transparent', color: '#7a7a82' }}
                >
                  <Icon size={18} />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      <div className="md:pr-64">
      <div className="container mx-auto px-3 sm:px-4 max-w-6xl py-6 sm:py-8">

        <AdminHeader
          saved={saved}
          importing={importing} importMessage={importMessage} onImport={handleImportFromGit}
          postingParties={postingParties} onPostParties={handlePostParties}
          postingPartiesInstagram={postingPartiesInstagram} onPostPartiesInstagram={handlePostPartiesInstagram}
          onReset={() => {
            if (confirm(t('admin.resetConfirm') || 'האם אתה בטוח שברצונך לאפס את כל התוכן לברירות מחדל?')) {
              resetToDefaults();
              showSaved();
            }
          }}
          onViewSite={() => navigate({ to: '/' })}
          onLogout={handleLogout}
        />

        <div className="md:hidden flex flex-nowrap sm:flex-wrap gap-2 mb-2 pb-1 overflow-x-auto overscroll-x-contain touch-pan-x -mx-1 px-1 sm:mx-0 sm:px-0">
          {adminTabs.filter(tab => !tab.advanced).map(tab => (
            <button
              key={tab.id}
              onClick={() => startTransition(() => setActiveSection(tab.id))}
              className="shrink-0 px-4 py-2 text-xs md:text-sm font-bold transition-all whitespace-nowrap touch-manipulation"
              style={
                activeSection === tab.id
                  ? { background: 'linear-gradient(135deg,#e11d48,#be0037)', color: '#fff', borderRadius: 999, border: '1px solid transparent' }
                  : { background: 'transparent', color: '#a9a9b2', borderRadius: 999, border: '1px solid #2d2d34' }
              }
            >
              {tab.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowAdvancedTabs((v) => !v)}
            className="shrink-0 flex items-center gap-1 px-4 py-2 text-xs md:text-sm font-bold whitespace-nowrap touch-manipulation transition-all"
            style={{ background: 'transparent', color: '#a9a9b2', borderRadius: 999, border: '1px solid #2d2d34' }}
          >
            מתקדם
            {showAdvancedTabs ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        {showAdvancedTabs && (
          <div className="md:hidden flex flex-nowrap sm:flex-wrap gap-2 mb-6 md:mb-8 pb-3 md:pb-4 overflow-x-auto overscroll-x-contain touch-pan-x -mx-1 px-1 sm:mx-0 sm:px-0" style={{ borderBottom: '1px solid #2d2d34' }}>
            {adminTabs.filter(tab => tab.advanced).map(tab => (
              <button
                key={tab.id}
                onClick={() => startTransition(() => setActiveSection(tab.id))}
                className="shrink-0 px-4 py-2 text-xs md:text-sm font-bold transition-all whitespace-nowrap touch-manipulation"
                style={
                  activeSection === tab.id
                    ? { background: 'linear-gradient(135deg,#e11d48,#be0037)', color: '#fff', borderRadius: 999, border: '1px solid transparent' }
                    : { background: 'transparent', color: '#7a7a82', borderRadius: 999, border: '1px solid #2d2d34' }
                }
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
        {!showAdvancedTabs && <div className="mb-6 md:mb-8" />}

        <div className="space-y-6">
          {activeSection === 'siteDesign' && <SiteDesignSection showSaved={showSaved} />}
          {activeSection === 'parties'   && <PartiesSection showSaved={showSaved} refreshKey={partiesRefreshKey} />}
          {activeSection === 'about'     && <AboutSection showSaved={showSaved} />}
          {activeSection === 'contact'   && <ContactSection showSaved={showSaved} />}
          {activeSection === 'matching'  && <MatchesSection showSaved={showSaved} />}
          {activeSection === 'links'     && <LinksSection showSaved={showSaved} />}
          {activeSection === 'store'     && <StoreSection showSaved={showSaved} />}
          {activeSection === 'workshops' && <WorkshopsSection showSaved={showSaved} />}
          {activeSection === 'db'        && <DBSection />}
          {activeSection === 'dbLogger'  && <DBLoggerSection />}
          {activeSection === 'forumUsers' && <ForumUsersSection showSaved={showSaved} />}
          {activeSection === 'liveChat'  && <LiveChatSection showSaved={showSaved} />}
          {activeSection === 'chatReports' && <ChatReportsSection showSaved={showSaved} />}
          {activeSection === 'deleteRequests' && <DeleteRequestsSection showSaved={showSaved} />}
          {activeSection === 'users'     && <UsersSection showSaved={showSaved} />}
          {activeSection === 'subscriptions' && <SubscriptionsSection showSaved={showSaved} />}
          {activeSection === 'admins'    && <AdminsSection showSaved={showSaved} />}
          {activeSection === 'advertisers' && <AdvertisersSection showSaved={showSaved} />}
          {activeSection === 'rss'       && <RssSection showSaved={showSaved} />}
          {activeSection === 'telegram'  && <TelegramSection showSaved={showSaved} />}
          {activeSection === 'gitHistory' && <GitHistorySection />}
        </div>
      </div>
      </div>
    </div>
  );
};

export default Admin;
