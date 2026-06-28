import { useState, useEffect, useRef } from 'react';
import { useNavigate as useRouterNavigate } from 'react-router-dom';
import { Menu, X, ShoppingBag, LogIn, LogOut, User, Bookmark, Mail, ChevronUp, ChevronDown, Home, MessageSquare, MessageCircle, BookOpen, Ticket } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useSiteAuth } from '../context/AuthContext';
import { useForumAuth } from '../context/ForumAuthContext';
import { getStoreSettings } from '../firebase/store';
import { getUnreadMessageCount } from '../firebase/privateMessages';
import { subscribeMainRoomLastActivity } from '../firebase/liveChat';
import { getChatLastSeenMs } from '../utils/chatClient';
import useFocusTrap, { useInertSiblings } from '../hooks/useFocusTrap';
import EditableLabel from './EditableLabel';
import ForumLoginModal from './forum/ForumLoginModal';
import NotificationBell from './NotificationBell';
import './Navigation.css';

const Navigation = ({ currentPage, navigate, mobileMenuOpen, setMobileMenuOpen, isChatRoute = false }) => {
  const { t } = useLanguage();
  const { siteUser } = useSiteAuth();
  const { forumUser, forumLogout } = useForumAuth();
  const routerNavigate = useRouterNavigate();
  const [storeEnabled, setStoreEnabled] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);
  const [chatNavDot, setChatNavDot] = useState(false);
  const mobileMenuRef = useRef(null);
  const mobileMenuToggleRef = useRef(null);
  const navRef = useRef(null);

  const [mobileNavCollapsed, setMobileNavCollapsed] = useState(() => {
    try {
      return sessionStorage.getItem('navMobileCollapsed') === '1';
    } catch {
      return false;
    }
  });

  const setNavCollapsed = (collapsed) => {
    setMobileNavCollapsed(collapsed);
    try {
      sessionStorage.setItem('navMobileCollapsed', collapsed ? '1' : '0');
    } catch {}
  };

  const goToProfile = () => {
    if (forumUser?.id) routerNavigate(`/profile/${forumUser.id}`);
  };

  useEffect(() => {
    if (!forumUser?.id) { setUnreadMsgCount(0); return; }
    let cancelled = false;
    const poll = () => getUnreadMessageCount(forumUser.id).then(c => { if (!cancelled) setUnreadMsgCount(c); }).catch(() => {});
    poll();
    const interval = setInterval(poll, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [forumUser?.id]);

  useEffect(() => {
    if (!forumUser?.id) {
      setChatNavDot(false);
      return undefined;
    }
    return subscribeMainRoomLastActivity((ms) => {
      setChatNavDot(ms > getChatLastSeenMs());
    });
  }, [forumUser?.id]);

  useEffect(() => {
    const checkStoreEnabled = async () => {
      try {
        const settings = await getStoreSettings();
        setStoreEnabled(settings.enabled);
      } catch (error) {
        console.error('Error checking store settings:', error);
      }
    };
    checkStoreEnabled();
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
        mobileMenuToggleRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [mobileMenuOpen, setMobileMenuOpen]);

  useFocusTrap(mobileMenuRef, mobileMenuOpen, {
    initialFocus: () => mobileMenuRef.current?.querySelector('button'),
    restoreFocus: false,
  });

  useInertSiblings(navRef, mobileMenuOpen);

  // Forum is the canonical user identity. The linked party profile (`siteUser`)
  // is now derived from `forumUser.linkedUserId`, so the greeting prefers the
  // forum nickname and only falls back to the party name when no nickname is
  // set (which should be impossible for self-registered forum users).
  const isLoggedIn = !!forumUser?.id;
  const greetingDisplayName = forumUser?.nickname?.trim()
    || (siteUser ? (siteUser.name || siteUser.phoneNumber || '') : '');

  // Collapse compact row when logged into forum.
  const mobileNavEffectiveCollapsed = !!(forumUser?.id && mobileNavCollapsed);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const compact = !!(isChatRoute && mobileNavEffectiveCollapsed);
    document.body.classList.toggle('chat-mobile-nav-compact', compact);
    return () => {
      document.body.classList.remove('chat-mobile-nav-compact');
    };
  }, [isChatRoute, mobileNavEffectiveCollapsed]);

  return (
    <nav ref={navRef} className="nav" aria-label={t('nav.mainNav')}>
      <div className="nav-container">
        <div className="nav-logo-container" role="button" tabIndex={0} onClick={() => navigate('home')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('home'); } }} aria-label={t('nav.home')}>
          <div className="nav-logo logo-font">
            <span className="nav-logo-red">מדברים</span> <span className="nav-logo-white">בדסמ</span>
          </div>
          <div className="nav-subtitle">Talking BDSM</div>
        </div>

        <div className="nav-desktop-menu">
          <div className="nav-desktop-nav-cluster">
            {['home', 'about', 'contact', 'forum', 'chat', 'blog'].map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => navigate(page)}
                className={`nav-link ${page === 'chat' ? 'relative' : ''} ${currentPage === page ? 'nav-link-active' : ''}`}
                aria-current={currentPage === page ? 'page' : undefined}
              >
                <EditableLabel translationKey={`nav.${page}`} />
                {page === 'chat' && chatNavDot && (
                  <span className="absolute top-0 end-0 w-2 h-2 rounded-full bg-red-500 ring-2 ring-black" aria-hidden />
                )}
              </button>
            ))}
            <button type="button" onClick={() => navigate('register')} className="nav-register-btn">
              <EditableLabel translationKey="nav.register" />
            </button>
            {storeEnabled && (
              <button
                type="button"
                onClick={() => navigate('store')}
                className={`nav-store-btn ${currentPage === 'store' ? 'nav-store-btn-active' : ''}`}
                aria-current={currentPage === 'store' ? 'page' : undefined}
              >
                <ShoppingBag size={16} />
                <EditableLabel translationKey="nav.store" />
              </button>
            )}
          </div>
          {isLoggedIn ? (
            <div className="nav-user-wrap">
              <span
                className="nav-user-hello cursor-pointer hover:text-pink-300 transition-colors"
                role="button"
                tabIndex={0}
                onClick={goToProfile}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goToProfile(); } }}
                title={t('profile.editProfile') || 'ערוך פרופיל'}
              >
                <User size={14} className="inline me-1" aria-hidden="true" />
                {t('auth.hello') || 'שלום'}, {greetingDisplayName}
              </span>
              <NotificationBell userId={forumUser.id} />
              <button
                type="button"
                onClick={() => { routerNavigate('/messages'); setUnreadMsgCount(0); }}
                className="nav-login-btn nav-login-icon-btn"
                aria-label={
                  unreadMsgCount > 0
                    ? `${t('pm.title') || 'הודעות'} (${unreadMsgCount})`
                    : (t('pm.title') || 'הודעות')
                }
                title={t('pm.title') || 'הודעות'}
              >
                <Mail size={16} aria-hidden="true" />
                {unreadMsgCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full" aria-hidden="true">
                    {unreadMsgCount > 9 ? '9+' : unreadMsgCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => routerNavigate('/bookmarks')}
                className="nav-login-btn nav-login-icon-btn"
                aria-label={t('bookmarks.title') || 'מועדפים'}
                title={t('bookmarks.title') || 'מועדפים'}
              >
                <Bookmark size={16} aria-hidden="true" />
              </button>
              <button type="button" onClick={() => forumLogout()} className="nav-logout-btn" title={t('logout')}>
                <LogOut size={16} aria-hidden="true" />
                {t('logout')}
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setLoginModalOpen(true)} className="nav-login-btn nav-desktop-login-row">
              <LogIn size={16} aria-hidden="true" />
              {t('auth.login') || 'היכנס'}
            </button>
          )}
        </div>

        {isLoggedIn && mobileNavEffectiveCollapsed && (
          <div className="nav-mobile-header-user-row nav-mobile-header-user-row--compact">
            <span
              className="nav-mobile-header-hello cursor-pointer hover:text-pink-300 transition-colors"
              role="button"
              tabIndex={0}
              onClick={goToProfile}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goToProfile(); } }}
              title={t('profile.editProfile') || 'ערוך פרופיל'}
            >
              <User size={14} className="inline me-1" aria-hidden="true" />
              {greetingDisplayName}
            </span>
            <button
              type="button"
              onClick={() => setNavCollapsed(false)}
              className="nav-mobile-icon-btn text-zinc-400 hover:text-white transition-colors"
              aria-label={t('nav.expandNav') || 'הרחב תפריט'}
              title={t('nav.expandNav') || 'הרחב תפריט'}
            >
              <ChevronDown size={20} aria-hidden="true" />
            </button>
            <button
              ref={mobileMenuToggleRef}
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="nav-mobile-toggle"
              aria-label={mobileMenuOpen ? t('close') : (t('nav.openMenu') || 'תפריט')}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-nav-menu"
              title={mobileMenuOpen ? t('close') : (t('nav.openMenu') || 'תפריט')}
            >
              {mobileMenuOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
            </button>
          </div>
        )}

        {isLoggedIn && !mobileNavEffectiveCollapsed && (
          <div className="nav-mobile-header-user-row">
            <span
              className="nav-mobile-header-hello cursor-pointer hover:text-pink-300 transition-colors"
              role="button"
              tabIndex={0}
              onClick={goToProfile}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goToProfile(); } }}
              title={t('profile.editProfile') || 'ערוך פרופיל'}
            >
              <User size={14} className="inline me-1" aria-hidden="true" />
              {greetingDisplayName}
            </span>
            <button
              type="button"
              onClick={() => forumLogout()}
              className="nav-mobile-icon-btn nav-mobile-header-logout-icon text-zinc-400 hover:text-white transition-colors"
              aria-label={t('logout')}
              title={t('logout')}
            >
              <LogOut size={18} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setNavCollapsed(true)}
              className="nav-mobile-icon-btn text-zinc-400 hover:text-white transition-colors"
              aria-label={t('nav.collapseNav') || 'כווץ תפריט'}
              title={t('nav.collapseNav') || 'כווץ תפריט'}
            >
              <ChevronUp size={20} aria-hidden="true" />
            </button>
          </div>
        )}

        {!(isLoggedIn && mobileNavEffectiveCollapsed) && (
          <div className="nav-mobile-header-actions">
            <button
              ref={!isLoggedIn ? mobileMenuToggleRef : undefined}
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="nav-mobile-toggle nav-mobile-actions-menu"
              aria-label={mobileMenuOpen ? t('close') : (t('nav.openMenu') || 'תפריט')}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-nav-menu"
              title={mobileMenuOpen ? t('close') : (t('nav.openMenu') || 'תפריט')}
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>

            <div className="nav-mobile-center-icons">
              {storeEnabled && (
                <button
                  type="button"
                  onClick={() => navigate('store')}
                  className={`nav-mobile-icon-btn ${currentPage === 'store' ? 'nav-mobile-icon-btn--active' : ''}`}
                  aria-label={t('nav.store')}
                  aria-current={currentPage === 'store' ? 'page' : undefined}
                  title={t('nav.store')}
                >
                  <ShoppingBag size={20} aria-hidden="true" />
                </button>
              )}
              <button
                type="button"
                onClick={() => navigate('register')}
                className={`nav-mobile-icon-btn ${currentPage === 'register' ? 'nav-mobile-icon-btn--active' : ''}`}
                aria-label={t('nav.register')}
                aria-current={currentPage === 'register' ? 'page' : undefined}
                title={t('nav.register')}
              >
                <Ticket size={20} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => navigate('forum')}
                className={`nav-mobile-icon-btn ${currentPage === 'forum' ? 'nav-mobile-icon-btn--active' : ''}`}
                aria-label={t('nav.forum')}
                aria-current={currentPage === 'forum' ? 'page' : undefined}
                title={t('nav.forum')}
              >
                <MessageSquare size={20} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => navigate('chat')}
                className={`nav-mobile-icon-btn relative ${currentPage === 'chat' ? 'nav-mobile-icon-btn--active' : ''}`}
                aria-label={t('nav.chat')}
                aria-current={currentPage === 'chat' ? 'page' : undefined}
                title={t('nav.chat')}
              >
                <MessageCircle size={20} aria-hidden="true" />
                {chatNavDot && forumUser?.id && (
                  <span className="absolute top-0.5 end-0.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-black" aria-hidden="true" />
                )}
              </button>
              <button
                type="button"
                onClick={() => navigate('blog')}
                className={`nav-mobile-icon-btn ${currentPage === 'blog' ? 'nav-mobile-icon-btn--active' : ''}`}
                aria-label={t('nav.blog')}
                aria-current={currentPage === 'blog' ? 'page' : undefined}
                title={t('nav.blog')}
              >
                <BookOpen size={20} aria-hidden="true" />
              </button>
            </div>

            {isLoggedIn ? (
              <div className="nav-mobile-actions-logged-in">
                <NotificationBell userId={forumUser.id} />
                <button
                  type="button"
                  onClick={() => { routerNavigate('/messages'); setUnreadMsgCount(0); }}
                  className="nav-mobile-icon-btn nav-mobile-icon-btn--rel text-zinc-400 hover:text-white transition-colors"
                  aria-label={
                    unreadMsgCount > 0
                      ? `${t('pm.title') || 'הודעות'} (${unreadMsgCount})`
                      : (t('pm.title') || 'הודעות')
                  }
                  title={t('pm.title') || 'הודעות'}
                >
                  <Mail size={18} aria-hidden="true" />
                  {unreadMsgCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-red-600 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full" aria-hidden="true">
                      {unreadMsgCount > 9 ? '9+' : unreadMsgCount}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => routerNavigate('/bookmarks')}
                  className="nav-mobile-icon-btn text-zinc-400 hover:text-white transition-colors"
                  aria-label={t('bookmarks.title') || 'מועדפים'}
                  title={t('bookmarks.title') || 'מועדפים'}
                >
                  <Bookmark size={18} aria-hidden="true" />
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setLoginModalOpen(true)} className="nav-mobile-header-login nav-mobile-actions-login">
                <LogIn size={18} aria-hidden="true" />
                <EditableLabel translationKey="auth.login" fallback="היכנס" />
              </button>
            )}
          </div>
        )}
      </div>

      {mobileMenuOpen && (
        <div id="mobile-nav-menu" ref={mobileMenuRef} className="nav-mobile-menu">
          <button onClick={() => { navigate('home'); setMobileMenuOpen(false); }} className="nav-mobile-link"><EditableLabel translationKey="nav.home" /></button>
          <button onClick={() => { navigate('about'); setMobileMenuOpen(false); }} className="nav-mobile-link"><EditableLabel translationKey="nav.about" /></button>
          <button onClick={() => { navigate('contact'); setMobileMenuOpen(false); }} className="nav-mobile-link"><EditableLabel translationKey="nav.contact" /></button>
          <button onClick={() => { navigate('forum'); setMobileMenuOpen(false); }} className="nav-mobile-link"><EditableLabel translationKey="nav.forum" /></button>
          <button onClick={() => { navigate('chat'); setMobileMenuOpen(false); }} className="nav-mobile-link"><EditableLabel translationKey="nav.chat" /></button>
          <button onClick={() => { navigate('blog'); setMobileMenuOpen(false); }} className="nav-mobile-link"><EditableLabel translationKey="nav.blog" /></button>
          <button onClick={() => { navigate('register'); setMobileMenuOpen(false); }} className="nav-mobile-register-btn"><EditableLabel translationKey="nav.register" /></button>
          {storeEnabled && (
            <button
              onClick={() => { navigate('store'); setMobileMenuOpen(false); }}
              className={`nav-mobile-store-btn ${currentPage === 'store' ? 'nav-store-btn-active' : ''}`}
            >
              <ShoppingBag size={18} />
              <EditableLabel translationKey="nav.store" />
            </button>
          )}
        </div>
      )}
      <ForumLoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
      />
    </nav>
  );
};

export default Navigation;

