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
      <div className="min-h-dvh bg-black text-white flex items-center justify-center" dir="rtl">
        <SEO title="Admin" noindex />
        <div className="bg-zinc-900/50 backdrop-blur-2xl border border-white/5 p-8 rounded-2xl max-w-md w-full mx-4">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-yellow-600/20 border border-yellow-600/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock size={32} className="text-yellow-600" />
            </div>
            <h1 className="text-3xl font-black italic mb-2">
              <span className="text-yellow-600">{t('adminLogin.setPasswordTitle')}</span>
            </h1>
            <p className="text-zinc-500 text-sm">{t('adminLogin.setPasswordSubtitle')}</p>
          </div>

          <form onSubmit={handlePasswordSetup} className="space-y-4">
            <div className="space-y-1 text-right">
              <label htmlFor={newPasswordId} className="text-xs uppercase font-bold text-zinc-400">{t('adminLogin.newPasswordLabel')}</label>
              <input
                id={newPasswordId}
                type="password"
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setPasswordSetupError(''); }}
                className="w-full bg-black/40 border border-zinc-800 p-4 rounded-xl focus:border-yellow-600 outline-none text-white text-right"
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
              <label htmlFor={confirmPasswordId} className="text-xs uppercase font-bold text-zinc-400">{t('adminLogin.confirmPasswordLabel')}</label>
              <input
                id={confirmPasswordId}
                type="password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setPasswordSetupError(''); }}
                className="w-full bg-black/40 border border-zinc-800 p-4 rounded-xl focus:border-yellow-600 outline-none text-white text-right"
                placeholder={t('adminLogin.confirmPasswordPlaceholderFull')}
                autoComplete="new-password"
                minLength={4}
                required
              />
            </div>
            {passwordSetupError && (
              <p id={setupErrorId} className="text-red-400 text-sm text-right" role="alert">{passwordSetupError}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              aria-disabled={loading}
              className="w-full bg-yellow-600 hover:bg-yellow-500 text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-50"
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
    <div className="min-h-dvh bg-black text-white flex items-center justify-center" dir="rtl">
      <SEO title="Admin" noindex />
      <div className="bg-zinc-900/50 backdrop-blur-2xl border border-white/5 p-8 rounded-2xl max-w-md w-full mx-4">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-red-600/20 border border-red-600/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock size={32} className="text-red-600" />
          </div>
          <h1 className="text-3xl font-black italic mb-2">
            <span lang="en"><span className="text-red-600">ADMIN</span> PANEL</span>
          </h1>
          <p className="text-zinc-400 text-sm">{t('adminLogin.loginTitle')}</p>
        </div>

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div className="space-y-1 text-right">
            <label htmlFor={usernameId} className="text-xs uppercase font-bold text-zinc-400">{t('adminLogin.usernameLabel')}</label>
            <input
              id={usernameId}
              type="text"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setPasswordError(''); }}
              className="w-full bg-black/40 border border-zinc-800 p-4 rounded-xl focus:border-red-600 outline-none text-white text-right"
              placeholder={t('adminLogin.usernamePlaceholderFull')}
              autoComplete="username"
              autoFocus
              required
            />
          </div>
          <div className="space-y-1 text-right">
            <label htmlFor={passwordId} className="text-xs uppercase font-bold text-zinc-400">{t('adminLogin.passwordLabel')}</label>
            <input
              id={passwordId}
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setPasswordError(''); }}
              className="w-full bg-black/40 border border-zinc-800 p-4 rounded-xl focus:border-red-600 outline-none text-white text-right"
              placeholder={t('adminLogin.passwordPlaceholderFull')}
              autoComplete="current-password"
              required
              aria-invalid={!!passwordError}
              aria-describedby={passwordError ? passwordErrorId : undefined}
            />
            {passwordError && (
              <p id={passwordErrorId} className="text-red-400 text-sm text-right mt-1" role="alert">{passwordError}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={loading}
            aria-disabled={loading}
            className="w-full bg-red-600 hover:bg-red-500 text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-50"
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
