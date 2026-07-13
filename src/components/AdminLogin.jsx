import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { authenticateAdmin, setAdminPassword } from '../firebase/users';
import Loader from './Loader';
import SEO from './SEO';
import '../App.css';
import './AdminLogin.css';

function AdminLogin({ onAdminLogin }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFirstLogin, setIsFirstLogin] = useState(false);
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSetupError, setPasswordSetupError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!username || !password) {
      setError(t('adminLogin.enterUsernameAndPassword'));
      return;
    }

    try {
      setLoading(true);
      const result = await authenticateAdmin(username, password);
      
      if (result.isFirstLogin) {
        
        setIsFirstLogin(true);
        setCurrentAdmin(result.admin);
        setPassword('');
      } else if (result.authenticated) {
        
        onAdminLogin(result.admin);
        navigate('/admin');
      } else {
        setError(result.error || t('adminLogin.loginError'));
      }
    } catch (error) {
      setError(error.message || t('adminLogin.loginError'));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSetup = async (e) => {
    e.preventDefault();
    setPasswordSetupError('');
    
    if (!newPassword || newPassword.length < 4) {
      setPasswordSetupError(t('adminLogin.passwordMinLength'));
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordSetupError(t('adminLogin.passwordsDoNotMatch'));
      return;
    }
    
    setLoading(true);
    try {
      await setAdminPassword(currentAdmin.id, newPassword);
      onAdminLogin({ ...currentAdmin, password: newPassword });
      navigate('/admin');
    } catch (error) {
      setPasswordSetupError(error.message || t('adminLogin.passwordSetupError'));
    } finally {
      setLoading(false);
    }
  };

  if (isFirstLogin) {
    return (
      <div className="container admin-login-container">
        <SEO title="Admin" noindex />
        <div className="header admin-login-header">
          <div>
            <h1 className="logo-font admin-login-title">
              <span className="accent-text">{t('adminLogin.passwordSetupTitle')}</span>
            </h1>
          </div>
        </div>

        <div className="admin-login-form-container">
          <p className="text-center mb-4 text-zinc-400">
            {t('adminLogin.firstLoginMessage')}
          </p>
          {passwordSetupError && <div className="error admin-login-error" role="alert">{passwordSetupError}</div>}

          <form onSubmit={handlePasswordSetup} className="admin-login-form">
            <div className="form-group admin-login-form-group">
              <label htmlFor="newPassword" className="admin-login-label">
                {t('adminLogin.newPassword')}
              </label>
              <input
                type="password"
                id="newPassword"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setPasswordSetupError('');
                }}
                placeholder={t('adminLogin.newPasswordPlaceholder')}
                autoComplete="new-password"
                required
                className="form-input admin-login-input"
                minLength={4}
                autoFocus
              />
            </div>

            <div className="form-group admin-login-form-group">
              <label htmlFor="confirmPassword" className="admin-login-label">
                {t('adminLogin.confirmPassword')}
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setPasswordSetupError('');
                }}
                placeholder={t('adminLogin.confirmPasswordPlaceholder')}
                autoComplete="new-password"
                required
                className="form-input admin-login-input"
                minLength={4}
              />
            </div>

            <button
              type="submit"
              className="btn-primary admin-login-btn-primary"
              disabled={loading}
            >
              {loading ? (
                <div className="loader-inline">
                  <Loader size="small" />
                </div>
              ) : (
                t('adminLogin.savePasswordAndContinue')
              )}
            </button>

            <button
              type="button"
              onClick={() => navigate('/')}
              className="btn-secondary admin-login-btn-secondary"
            >
              {t('adminLogin.backToHome')}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="container admin-login-container">
      <SEO title="Admin" noindex />
      <div className="header admin-login-header">
        <div>
          <h1 className="logo-font admin-login-title">
            <span className="accent-text">{t('adminLogin.title')}</span>
          </h1>
        </div>
      </div>

      <div className="admin-login-form-container">
        {error && <div className="error admin-login-error" role="alert">{error}</div>}

        <form onSubmit={handleSubmit} className="admin-login-form">
          <div className="form-group admin-login-form-group">
            <label htmlFor="username" className="admin-login-label">
              {t('adminLogin.username')}
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError('');
              }}
              placeholder={t('adminLogin.usernamePlaceholder')}
              autoComplete="username"
              required
              className="form-input admin-login-input"
              autoFocus
            />
          </div>

          <div className="form-group admin-login-form-group">
            <label htmlFor="password" className="admin-login-label">
              {t('adminLogin.password')}
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              placeholder={t('adminLogin.passwordPlaceholder')}
              autoComplete="current-password"
              required
              className="form-input admin-login-input"
            />
          </div>

          <button
            type="submit"
            className="btn-primary admin-login-btn-primary"
            disabled={loading}
          >
            {loading ? (
              <div className="loader-inline">
                <Loader size="small" />
              </div>
            ) : (
              t('adminLogin.login')
            )}
          </button>

          <button
            type="button"
            onClick={() => navigate('/')}
            className="btn-secondary admin-login-btn-secondary"
          >
            {t('adminLogin.backToHome')}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AdminLogin;

