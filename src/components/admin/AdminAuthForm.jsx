import { useId, useState } from 'react';
import { Lock } from 'lucide-react';
import Loader from '../Loader';
import SEO from '../SEO';
import { authenticateAdmin, setAdminPassword } from '../../firebase/users';
import { useLanguage } from '../../i18n/LanguageContext';

/**
 * Handles both the login form and the first-login password-setup form.
 * Calls onAuthenticated(admin) once the admin is fully authenticated.
 */
const AdminAuthForm = ({ onAuthenticated }) => {
  const { t } = useLanguage();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);

  const [isFirstLogin, setIsFirstLogin] = useState(false);
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSetupError, setPasswordSetupError] = useState('');

  const usernameId = useId();
  const passwordId = useId();
  const passwordErrorId = useId();
  const newPasswordId = useId();
  const confirmPasswordId = useId();
  const setupErrorId = useId();

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setLoading(true);
    try {
      const result = await authenticateAdmin(username, password);
      if (result.isFirstLogin) {
        setIsFirstLogin(true);
        setCurrentAdmin(result.admin);
        setPassword('');
      } else if (result.authenticated) {
        sessionStorage.setItem('admin_authenticated', 'true');
        sessionStorage.setItem('adminAuthenticated', 'true');
        sessionStorage.setItem('admin_id', result.admin.id);
        const displayName = result.admin.adminUsername || result.admin.telegramUsername || result.admin.name || result.admin.id || username || 'admin';
        sessionStorage.setItem('admin_username', displayName);
        setPassword('');
        setUsername('');
        onAuthenticated(result.admin);
      } else {
        setPasswordError(result.error || t('adminLogin.loginError'));
        setPassword('');
      }
    } catch (error) {
      setPasswordError(error.message || t('adminLogin.loginError'));
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSetup = async (e) => {
    e.preventDefault();
    setPasswordSetupError('');
    if (!newPassword || newPassword.length < 4) {
      setPasswordSetupError(t('admin.admins.passwordMinLength'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordSetupError(t('adminLogin.passwordsDoNotMatch'));
      return;
    }
    setLoading(true);
    try {
      await setAdminPassword(currentAdmin.id, newPassword);
      sessionStorage.setItem('admin_authenticated', 'true');
      sessionStorage.setItem('adminAuthenticated', 'true');
      sessionStorage.setItem('admin_id', currentAdmin.id);
      const displayName = currentAdmin.adminUsername || currentAdmin.telegramUsername || currentAdmin.name || currentAdmin.id || 'admin';
      sessionStorage.setItem('admin_username', displayName);
      setNewPassword('');
      setConfirmPassword('');
      onAuthenticated(currentAdmin);
    } catch (error) {
      setPasswordSetupError(error.message || t('adminLogin.passwordSetupError'));
    } finally {
      setLoading(false);
    }
  };

  if (isFirstLogin) {
    return (
      <div
        className="min-h-dvh text-white flex items-center justify-center px-4"
        dir="rtl"
        style={{ background: '#050506', fontFamily: 'Arial, Heebo, sans-serif' }}
      >
        <SEO title="Admin" noindex />
        <div
          className="w-full p-8"
          style={{
            maxWidth: 440,
            background: 'linear-gradient(180deg,#101014,#0a0a0c)',
            border: '1px solid #2d2d34',
            borderRadius: 24,
          }}
        >
          <div className="text-center mb-8">
            <img src="/assets/logo-new.png" alt="" className="mx-auto mb-3" style={{ width: 320, height: 'auto', objectFit: 'contain' }} />
            <h1 className="mb-1" style={{ fontFamily: 'Georgia,"Times New Roman",serif', fontWeight: 700, fontSize: 22, color: '#f3b82d' }}>
              {t('adminLogin.setPasswordTitle')}
            </h1>
            <p style={{ color: '#a9a9b2', fontSize: 13 }}>{t('adminLogin.setPasswordSubtitle')}</p>
          </div>

          <form onSubmit={handlePasswordSetup} className="space-y-4">
            <div className="space-y-1 text-right">
              <label htmlFor={newPasswordId} className="text-xs uppercase font-bold" style={{ color: '#a9a9b2' }}>{t('adminLogin.newPasswordLabel')}</label>
              <input
                id={newPasswordId}
                type="password"
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setPasswordSetupError(''); }}
                className="w-full outline-none text-white text-right"
                style={{ background: 'rgba(0,0,0,.4)', border: '1px solid #2d2d34', borderRadius: 15, padding: '14px 16px' }}
                placeholder={t('adminLogin.newPasswordPlaceholderFull')}
                autoComplete="new-password"
                autoFocus
                minLength={4}
                required
                aria-invalid={!!passwordSetupError}
                aria-describedby={passwordSetupError ? setupErrorId : undefined}
              />
            </div>
            <div className="space-y-1 text-right">
              <label htmlFor={confirmPasswordId} className="text-xs uppercase font-bold" style={{ color: '#a9a9b2' }}>{t('adminLogin.confirmPasswordLabel')}</label>
              <input
                id={confirmPasswordId}
                type="password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setPasswordSetupError(''); }}
                className="w-full outline-none text-white text-right"
                style={{ background: 'rgba(0,0,0,.4)', border: '1px solid #2d2d34', borderRadius: 15, padding: '14px 16px' }}
                placeholder={t('adminLogin.confirmPasswordPlaceholderFull')}
                autoComplete="new-password"
                minLength={4}
                required
              />
            </div>
            {passwordSetupError && (
              <p id={setupErrorId} className="text-sm text-right" style={{ color: '#ff5708' }} role="alert">{passwordSetupError}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              aria-disabled={loading}
              className="w-full text-white font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#f3b82d,#c98f10)', borderRadius: 15, minHeight: 54 }}
            >
              {loading ? (
                <div className="loader-inline"><Loader size="small" /></div>
              ) : (
                <><Lock size={20} aria-hidden="true" /> {t('adminLogin.savePassword')}</>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-dvh text-white flex items-center justify-center px-4"
      dir="rtl"
      style={{ background: '#050506', fontFamily: 'Arial, Heebo, sans-serif' }}
    >
      <SEO title="Admin" noindex />
      <div
        className="w-full p-8"
        style={{
          maxWidth: 440,
          background: 'linear-gradient(180deg,#101014,#0a0a0c)',
          border: '1px solid #2d2d34',
          borderRadius: 24,
        }}
      >
        <div className="text-center mb-8">
          <img src="/assets/logo-new.png" alt="" className="mx-auto mb-3" style={{ width: 320, height: 'auto', objectFit: 'contain' }} />
          <h1 className="mb-1" style={{ fontFamily: 'Georgia,"Times New Roman",serif', fontWeight: 700, fontSize: 24 }}>
            LIBRAL PARTY
          </h1>
          <p style={{ color: '#a9a9b2', fontSize: 13, letterSpacing: 1 }}>{t('adminLogin.loginTitle')}</p>
        </div>

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div className="space-y-1 text-right">
            <label htmlFor={usernameId} className="text-xs uppercase font-bold" style={{ color: '#a9a9b2' }}>{t('adminLogin.usernameLabel')}</label>
            <input
              id={usernameId}
              type="text"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setPasswordError(''); }}
              className="w-full outline-none text-white text-right"
              style={{ background: 'rgba(0,0,0,.4)', border: '1px solid #2d2d34', borderRadius: 15, padding: '14px 16px' }}
              placeholder={t('adminLogin.usernamePlaceholderFull')}
              autoComplete="username"
              autoFocus
              required
            />
          </div>
          <div className="space-y-1 text-right">
            <label htmlFor={passwordId} className="text-xs uppercase font-bold" style={{ color: '#a9a9b2' }}>{t('adminLogin.passwordLabel')}</label>
            <input
              id={passwordId}
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setPasswordError(''); }}
              className="w-full outline-none text-white text-right"
              style={{ background: 'rgba(0,0,0,.4)', border: '1px solid #2d2d34', borderRadius: 15, padding: '14px 16px' }}
              placeholder={t('adminLogin.passwordPlaceholderFull')}
              autoComplete="current-password"
              required
              aria-invalid={!!passwordError}
              aria-describedby={passwordError ? passwordErrorId : undefined}
            />
            {passwordError && (
              <p id={passwordErrorId} className="text-sm text-right mt-1" style={{ color: '#ff5708' }} role="alert">{passwordError}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={loading}
            aria-disabled={loading}
            className="w-full text-white font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg,#ff5708,#ff7a29)',
              borderRadius: 15,
              minHeight: 54,
            }}
          >
            {loading ? (
              <div className="loader-inline"><Loader size="small" /></div>
            ) : (
              <><Lock size={20} aria-hidden="true" /> {t('adminLogin.loginButton')}</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminAuthForm;
