// App entry
import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { ContentProvider, useContent } from './context/ContentContext';
import { LanguageProvider, useLanguage } from './i18n/LanguageContext';
import { SiteAuthProvider } from './context/AuthContext';
import { ForumAuthProvider } from './context/ForumAuthContext';
import StarsBackground from './components/StarsBackground';
import Navigation from './components/Navigation';
import Footer from './components/Footer';
import EditModeBanner from './components/EditModeBanner';
import TelegramChat from './components/TelegramChat';
import SupportChat from './components/SupportChat';
import Loader from './components/Loader';
import { getSupportChatSettings } from './firebase/settings';
import Home from './pages/Home'; // Eager: above-the-fold landing page; lazy would delay LCP.
// Other routes are lazy-loaded so each page ships its own JS chunk and the
// initial bundle stays small (highest-ROI perf win for first paint).
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const Register = lazy(() => import('./pages/Register'));
const Store = lazy(() => import('./pages/Store'));
const Workshops = lazy(() => import('./pages/Workshops'));
const Privacy = lazy(() => import('./pages/Privacy'));
const DeleteAccount = lazy(() => import('./pages/DeleteAccount'));
const AdminLogin = lazy(() => import('./components/AdminLogin'));
const Admin = lazy(() => import('./pages/Admin'));
const Forum = lazy(() => import('./pages/Forum'));
const ForumSection = lazy(() => import('./pages/ForumSection'));
const ForumTopic = lazy(() => import('./pages/ForumTopic'));
const ForumPasswordReset = lazy(() => import('./pages/ForumPasswordReset'));
const ForumEmailVerify = lazy(() => import('./pages/ForumEmailVerify'));
const Blog = lazy(() => import('./pages/Blog'));
const BlogPost = lazy(() => import('./pages/BlogPost'));
const UserProfile = lazy(() => import('./pages/UserProfile'));
const Bookmarks = lazy(() => import('./pages/Bookmarks'));
const Messages = lazy(() => import('./pages/Messages'));
const Chat = lazy(() => import('./pages/Chat'));
const ChatInviteJoin = lazy(() => import('./pages/ChatInviteJoin'));
import LoginGate from './components/LoginGate';
import ErrorBoundary from './components/ErrorBoundary';
import SEO from './components/SEO';
import { getTelegramSettings } from './firebase/settings';
import { getBotInfo } from './firebase/telegram';
import { logError } from './utils/logger';
import './App.css';

const AppContent = () => {
  const { t } = useLanguage();
  const { isEditMode, isViewingAsVisitor, reloadContent } = useContent();
  const navigate = useNavigate();
  const location = useLocation();
  const prevPathRef = useRef(location.pathname);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [telegramBotUsername, setTelegramBotUsername] = useState(null);
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [supportChatEnabled, setSupportChatEnabled] = useState(false);
  const [supportChatSettings, setSupportChatSettings] = useState(null);
  const [isCapacitorApp, setIsCapacitorApp] = useState(false);

  useEffect(() => {
    setIsCapacitorApp(!!(typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()));
  }, []);

  const isAdmin = location.pathname === '/admin' || location.pathname === '/admin-login';
  const isChatRoute = !isAdmin && location.pathname.startsWith('/chat');
  const currentPage = isAdmin ? 'admin' : 
    location.pathname === '/about' ? 'about' :
    location.pathname === '/contact' ? 'contact' :
    location.pathname === '/privacy' ? 'privacy' :
    location.pathname === '/deleterequest' ? 'deleteAccount' :
    location.pathname === '/register' ? 'register' :
    location.pathname === '/store' ? 'store' :
    location.pathname === '/workshops' ? 'workshops' :
    location.pathname.startsWith('/forum') ? 'forum' :
    location.pathname.startsWith('/chat') ? 'chat' :
    location.pathname.startsWith('/blog') ? 'blog' : 'home';

  useEffect(() => {
    
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        
        if (user && user.level === 'admin') {
          setCurrentUser(user);
        }
      } catch (e) {
        localStorage.removeItem('currentUser');
      }
    }
    setLoading(false);

    const loadTelegramBot = async () => {
      try {
        const telegramSettings = await getTelegramSettings();
        if (telegramSettings.enabled && telegramSettings.botToken) {
          const botInfo = await getBotInfo(telegramSettings.botToken);
          if (botInfo && botInfo.username) {
            setTelegramBotUsername(`@${botInfo.username}`);
            setTelegramEnabled(true);
          }
        }
      } catch (error) {
        // Telegram is optional UX; log so we can diagnose, but don't surface.
        logError('App.loadTelegramBot', error);
      }
    };

    if (!isAdmin) {
      loadTelegramBot();
      getSupportChatSettings()
        .then((s) => {
          setSupportChatEnabled(s?.enabled === true);
          setSupportChatSettings(s || null);
        })
        .catch((error) => {
          logError('App.getSupportChatSettings', error);
          setSupportChatEnabled(false);
          setSupportChatSettings(null);
        });
    }
  }, [isAdmin]);

  // When leaving admin in edit mode, reload content so new/updated parties appear on the site
  useEffect(() => {
    const prev = prevPathRef.current;
    const curr = location.pathname;
    prevPathRef.current = curr;
    const wasOnAdmin = prev === '/admin' || prev === '/admin-login';
    const nowOnSite = curr !== '/admin' && curr !== '/admin-login';
    if (wasOnAdmin && nowOnSite && isEditMode() && !isViewingAsVisitor()) {
      reloadContent?.();
    }
  }, [location.pathname, isEditMode, isViewingAsVisitor, reloadContent]);

  const handleNavigate = (page) => {
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    if (page === 'admin') {
      navigate('/admin');
    } else if (page === 'home') {
      navigate('/');
    } else if (page === 'deleteAccount') {
      navigate('/deleterequest');
    } else {
      navigate(`/${page}`);
    }
  };

  const handleAdminLogin = (user) => {
    setCurrentUser(user);
    localStorage.setItem('currentUser', JSON.stringify(user));
    try {
      sessionStorage.setItem('adminAuthenticated', 'true');
      sessionStorage.setItem('admin_authenticated', 'true');
      sessionStorage.setItem('admin_id', user.id);
      const displayName = user.adminUsername || user.telegramUsername || user.name || user.id || 'admin';
      sessionStorage.setItem('admin_username', displayName);
    } catch (err) {
      // sessionStorage may throw in private browsing mode; non-fatal.
      logError('App.handleAdminLogin.sessionStorage', err);
    }
  };

  if (loading) {
    return (
      <main id="main-content" tabIndex={-1} className="loading">
        {t('loading')}
      </main>
    );
  }

  const editMode = !isAdmin && isEditMode();

  const handleSkipToContent = (e) => {
    e.preventDefault();
    const el = document.getElementById('main-content');
    if (!el) return;
    el.scrollIntoView({ behavior: 'auto', block: 'start' });
    el.focus({ preventScroll: true });
  };

  return (
    <div
      className={`min-h-screen bg-black text-white font-sans selection:bg-red-600 selection:text-white ${editMode ? 'admin-mode' : ''} ${isCapacitorApp ? 'capacitor-app' : ''} ${isChatRoute ? 'has-chat-route' : ''}`}
      dir="rtl"
      lang="he"
    >
      <StarsBackground />

      {!isAdmin && (
        <>
          {!editMode && (
            <a href="#main-content" className="skip-to-content" onClick={handleSkipToContent}>
              {t('skipToContent')}
            </a>
          )}
          <EditModeBanner />
          <Navigation 
            currentPage={currentPage}
            navigate={handleNavigate}
            mobileMenuOpen={mobileMenuOpen}
            setMobileMenuOpen={setMobileMenuOpen}
            isChatRoute={isChatRoute}
          />
        </>
      )}

      <main
        id="main-content"
        tabIndex={-1}
        className={
          isAdmin
            ? ''
            : `main-content-area ${isChatRoute ? 'chat-route-main flex h-full min-h-0 w-full flex-1 flex-col overflow-x-hidden overflow-y-hidden' : 'min-h-screen'}`
        }
      >
        <ErrorBoundary scope="routes" resetKey={location.pathname}>
          <Suspense fallback={<div className="loading"><Loader /></div>}>
            <Routes>
              <Route path="/" element={<Home navigate={handleNavigate} />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/register" element={<Register navigate={handleNavigate} />} />
              <Route path="/store" element={<Store />} />
              <Route path="/workshops" element={<Workshops navigate={handleNavigate} />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/deleterequest" element={<DeleteAccount />} />
              {/*
                For LoginGate-protected routes we render a static <SEO>
                sibling so crawlers still see indexable metadata even when
                the page body is hidden behind login. Page-internal <SEO>
                further inside still wins for logged-in users (e.g. dynamic
                topic/post titles) because react-helmet-async merges later
                tags last-write-wins.
              */}
              <Route
                path="/forum"
                element={
                  <>
                    <SEO
                      title="פורום | מדברים BDSM"
                      description="פורום הקהילה של מדברים BDSM - דיונים, שאלות וטיפים בקהילה בטוחה ומכבדת."
                      canonicalPath="/forum"
                    />
                    <LoginGate><Forum /></LoginGate>
                  </>
                }
              />
              <Route path="/forum/reset" element={<ForumPasswordReset />} />
              <Route path="/forum/verify-email" element={<ForumEmailVerify />} />
              <Route
                path="/forum/:sectionId"
                element={
                  <>
                    <SEO
                      title="מדור בפורום | מדברים BDSM"
                      description="דיונים ושאלות במדור הפורום של מדברים BDSM - קהילה בטוחה ומכבדת."
                    />
                    <LoginGate><ForumSection /></LoginGate>
                  </>
                }
              />
              <Route
                path="/forum/:sectionId/:topicId"
                element={
                  <>
                    <SEO
                      title="נושא בפורום | מדברים BDSM"
                      description="נושא ודיון בפורום מדברים BDSM."
                      ogType="article"
                    />
                    <LoginGate><ForumTopic /></LoginGate>
                  </>
                }
              />
              <Route
                path="/blog"
                element={
                  <>
                    <SEO
                      title="בלוג | מדברים BDSM"
                      description="הבלוג של מדברים BDSM - מאמרים, סיפורים והעמקות בנושאי הקהילה."
                      canonicalPath="/blog"
                    />
                    <LoginGate><Blog /></LoginGate>
                  </>
                }
              />
              <Route
                path="/blog/:postId"
                element={
                  <>
                    <SEO
                      title="פוסט בבלוג | מדברים BDSM"
                      description="מאמר בבלוג מדברים BDSM."
                      ogType="article"
                    />
                    <LoginGate><BlogPost /></LoginGate>
                  </>
                }
              />
              <Route path="/profile/:userId" element={<LoginGate><UserProfile /></LoginGate>} />
              <Route path="/bookmarks" element={<LoginGate><Bookmarks /></LoginGate>} />
              <Route path="/messages" element={<LoginGate><Messages /></LoginGate>} />
              <Route path="/messages/:userId" element={<LoginGate><Messages /></LoginGate>} />
              <Route path="/chat/join/:inviteToken" element={<LoginGate><ChatInviteJoin /></LoginGate>} />
              <Route path="/chat" element={<LoginGate><Chat /></LoginGate>} />
              <Route path="/chat/:roomId" element={<LoginGate><Chat /></LoginGate>} />
              <Route
                path="/admin-login"
                element={
                  currentUser && currentUser.level === 'admin' ? (
                    <Navigate to="/admin" replace />
                  ) : (
                    <AdminLogin onAdminLogin={handleAdminLogin} />
                  )
                }
              />
              <Route
                path="/admin"
                element={<Admin />}
              />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>

      {!isAdmin && <Footer navigate={handleNavigate} isChatRoute={isChatRoute} />}

      {!isAdmin && (
        <>
          {supportChatEnabled && !location.pathname.startsWith('/chat') && (
            <SupportChat initialSettings={supportChatSettings} />
          )}
          {!supportChatEnabled && !location.pathname.startsWith('/chat') && (
            <TelegramChat
              botUsername={telegramBotUsername}
              enabled={telegramEnabled}
            />
          )}
        </>
      )}
    </div>
  );
};

const App = () => {
  return (
    <LanguageProvider>
      <SiteAuthProvider>
        <ForumAuthProvider>
          <ContentProvider>
            <BrowserRouter
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true
              }}
            >
              <AppContent />
            </BrowserRouter>
          </ContentProvider>
        </ForumAuthProvider>
      </SiteAuthProvider>
    </LanguageProvider>
  );
};

export default App;
