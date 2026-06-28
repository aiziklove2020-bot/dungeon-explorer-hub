import { useState, useEffect, useId } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, User, Tag, Clock, X, Loader2, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useSiteAuth } from '../context/AuthContext';
import EditableLabel from '../components/EditableLabel';
import Dialog from '../components/a11y/Dialog';
import {
  getActiveWorkshops,
  getWorkshopById,
  registerToWorkshop,
  unregisterFromWorkshop,
  getRegistrationsByUser
} from '../firebase/workshops';
import Loader from '../components/Loader';
import SEO from '../components/SEO';
import './Workshops.css';

const Workshops = ({ navigate: handleNavigate }) => {
  const { t } = useLanguage();
  const { siteUser } = useSiteAuth();
  const navigate = useNavigate();
  const regModalTitleId = useId();
  const guestNameId = useId();
  const guestPhoneId = useId();
  const guestTelegramId = useId();
  const guestErrorId = useId();
  const [workshops, setWorkshops] = useState([]);
  const [myRegistrations, setMyRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [regModalWorkshopId, setRegModalWorkshopId] = useState(null);
  const [guestForm, setGuestForm] = useState({ fullName: '', phone: '', telegram: '' });
  const [guestSubmitError, setGuestSubmitError] = useState('');
  const [guestSuccessWorkshopId, setGuestSuccessWorkshopId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [activeList, regs] = await Promise.all([
          getActiveWorkshops(),
          siteUser ? getRegistrationsByUser(siteUser.id) : Promise.resolve([])
        ]);
        if (cancelled) return;
        setWorkshops(activeList);
        setMyRegistrations(regs);
      } catch (err) {
        if (!cancelled) setWorkshops([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [siteUser]);

  const handleRegisterClick = (workshopId) => {
    if (siteUser) {
      handleRegister(workshopId);
    } else {
      setGuestForm({ fullName: '', phone: '', telegram: '' });
      setGuestSubmitError('');
      setRegModalWorkshopId(workshopId);
    }
  };

  const handleGuestRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!regModalWorkshopId) return;
    setGuestSubmitError('');
    const phone = guestForm.phone.replace(/\D/g, '');
    if (phone.length !== 10 || !phone.startsWith('05')) {
      setGuestSubmitError(t('workshops.phoneRequired'));
      return;
    }
    if (!guestForm.fullName.trim()) {
      setGuestSubmitError(t('registration.fullNameRequired'));
      return;
    }
    setActionId(regModalWorkshopId);
    try {
      await registerToWorkshop(regModalWorkshopId, {
        phoneNumber: phone,
        name: guestForm.fullName.trim(),
        telegramUsername: guestForm.telegram.trim() || undefined,
        isGuest: true
      });
      setGuestSuccessWorkshopId(regModalWorkshopId);
      setRegModalWorkshopId(null);
      setGuestForm({ fullName: '', phone: '', telegram: '' });
    } catch (err) {
      setGuestSubmitError(err.message || t('error'));
    } finally {
      setActionId(null);
    }
  };

  const handleRegister = async (workshopId) => {
    if (!siteUser) return;
    setActionId(workshopId);
    try {
      await registerToWorkshop(workshopId, siteUser);
      const regs = await getRegistrationsByUser(siteUser.id);
      setMyRegistrations(regs);
    } catch (err) {
      alert(err.message || t('error'));
    } finally {
      setActionId(null);
    }
  };

  const handleUnregister = async (workshopId) => {
    if (!siteUser) return;
    setActionId(workshopId);
    try {
      await unregisterFromWorkshop(workshopId, siteUser.id);
      setMyRegistrations(prev => prev.filter(r => r.workshopId !== workshopId));
    } catch (err) {
      alert(err.message || t('error'));
    } finally {
      setActionId(null);
    }
  };

  const isRegistered = (workshopId) => myRegistrations.some(r => r.workshopId === workshopId);

  if (loading) {
    return (
      <div className="workshops-page">
        <div className="workshops-loading">
          <Loader size="large" />
        </div>
      </div>
    );
  }

  const showMyRegistrationsOnly = workshops.length === 0 && myRegistrations.length > 0;
  const workshopsToShow = showMyRegistrationsOnly
    ? []
    : workshops;
  const myRegisteredWorkshopIds = myRegistrations.map(r => r.workshopId);
  const myWorkshopsToResolve = showMyRegistrationsOnly ? myRegisteredWorkshopIds : [];

  return (
    <div className="workshops-page">
      <SEO
        title="סדנאות | מדברים BDSM"
        description="סדנאות מדברים BDSM - הרשמה לסדנאות פעילות. Workshops - Talking BDSM registration."
        canonicalPath="/workshops"
      />
      <header className="workshops-header">
        <h1 className="workshops-title logo-font">
          <span className="workshops-title-red"><EditableLabel translationKey="workshops.pageTitle" /></span>
        </h1>
        <p className="workshops-subtitle"><EditableLabel translationKey="workshops.pageSubtitle" /></p>
      </header>

      {showMyRegistrationsOnly && (
        <section className="workshops-my-section">
          <h2 className="workshops-section-title"><EditableLabel translationKey="workshops.myRegistrations" /></h2>
          <p className="workshops-login-hint"><EditableLabel translationKey="workshops.noActiveButRegistered" /></p>
          <MyRegistrationsList
            registrationIds={myRegisteredWorkshopIds}
            onUnregister={handleUnregister}
            siteUser={siteUser}
            actionId={actionId}
            t={t}
          />
        </section>
      )}

      {workshopsToShow.length > 0 && (
        <section className="workshops-list-section">
          <h2 className="workshops-section-title"><EditableLabel translationKey="workshops.activeList" fallback="סדנאות פעילות" /></h2>
          <div className="workshops-grid">
            {workshopsToShow.map(w => (
              <div key={w.id} className="workshop-card glass-panel">
                {w.imageUrl && (
                  <div className="workshop-card-image-wrap">
                    <img
                      src={w.imageUrl}
                      alt={w.title || t('workshops.imageAlt') || 'תמונת סדנא'}
                      className="workshop-card-image"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                )}
                <div className="workshop-card-body">
                  <h3 className="workshop-card-title">{w.title}</h3>
                  {w.instructor && (
                    <p className="workshop-card-meta">
                      <User size={14} />
                      {w.instructor}
                    </p>
                  )}
                  {w.price != null && (
                    <p className="workshop-card-price">
                      <Tag size={14} />
                      ₪{w.price}
                    </p>
                  )}
                  {w.duration && (
                    <p className="workshop-card-meta">
                      <Clock size={14} />
                      {w.duration}
                    </p>
                  )}
                  {w.description && (
                    <p className="workshop-card-description">{w.description}</p>
                  )}
                  {isRegistered(w.id) ? (
                    <button
                      type="button"
                      onClick={() => handleUnregister(w.id)}
                      disabled={actionId === w.id}
                      className="workshop-btn workshop-btn-outline"
                    >
                      {actionId === w.id ? <Loader2 size={18} className="workshop-btn-spin" /> : <X size={18} />}
                      <EditableLabel translationKey="workshops.cancelRegistration" fallback="בטל רישום" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleRegisterClick(w.id)}
                      disabled={actionId === w.id}
                      className="workshop-btn workshop-btn-primary"
                    >
                      {actionId === w.id ? <Loader2 size={18} className="workshop-btn-spin" /> : <BookOpen size={18} />}
                      <EditableLabel translationKey="workshops.register" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {!showMyRegistrationsOnly && workshopsToShow.length === 0 && myRegistrations.length === 0 && (
        <div className="workshops-empty">
          <p className="workshops-empty-text"><EditableLabel translationKey="workshops.noWorkshops" /></p>
        </div>
      )}

      {guestSuccessWorkshopId && (
        <div className="workshops-guest-success">
          <CheckCircle2 size={32} />
          <p>{t('workshops.guestRegisterSuccess')}</p>
          <button type="button" onClick={() => setGuestSuccessWorkshopId(null)} className="workshops-back-btn">
            {t('close')}
          </button>
        </div>
      )}

      <Dialog
        open={!!regModalWorkshopId}
        onClose={() => setRegModalWorkshopId(null)}
        labelledBy={regModalTitleId}
        className="workshops-modal-overlay"
        panelClassName="workshops-modal"
      >
        <div dir="rtl">
          <h3 id={regModalTitleId} className="workshops-modal-title"><EditableLabel translationKey="workshops.guestFormTitle" /></h3>
          <p className="workshops-modal-subtitle"><EditableLabel translationKey="workshops.guestFormSubtitle" /></p>
          <form onSubmit={handleGuestRegisterSubmit} className="workshops-guest-form">
            <div>
              <label htmlFor={guestNameId} className="workshops-guest-label">{t('registration.fullName')} *</label>
              <input
                id={guestNameId}
                type="text"
                value={guestForm.fullName}
                onChange={e => setGuestForm(prev => ({ ...prev, fullName: e.target.value }))}
                className="workshops-guest-input"
                placeholder={t('registration.fullName')}
                required
                autoComplete="name"
              />
            </div>
            <div>
              <label htmlFor={guestPhoneId} className="workshops-guest-label"><EditableLabel translationKey="registration.phone" /> *</label>
              <input
                id={guestPhoneId}
                type="tel"
                value={guestForm.phone}
                onChange={e => {
                  const v = e.target.value.replace(/\D/g, '');
                  if (v.length <= 10 && (v === '' || v === '0' || v.startsWith('05'))) setGuestForm(prev => ({ ...prev, phone: v }));
                }}
                className="workshops-guest-input"
                placeholder="0500000000"
                maxLength={10}
                required
                autoComplete="tel"
                inputMode="numeric"
              />
            </div>
            <div>
              <label htmlFor={guestTelegramId} className="workshops-guest-label">{t('registration.telegram')}</label>
              <input
                id={guestTelegramId}
                type="text"
                value={guestForm.telegram}
                onChange={e => setGuestForm(prev => ({ ...prev, telegram: e.target.value.replace(/@/g, '') }))}
                className="workshops-guest-input"
                placeholder="@username"
              />
            </div>
            {guestSubmitError && <p id={guestErrorId} className="workshops-guest-error" role="alert">{guestSubmitError}</p>}
            <div className="workshops-modal-buttons">
              <button type="submit" disabled={actionId === regModalWorkshopId} aria-disabled={actionId === regModalWorkshopId} className="workshop-btn workshop-btn-primary">
                {actionId === regModalWorkshopId ? <Loader2 size={18} className="workshop-btn-spin" aria-hidden="true" /> : null}
                <EditableLabel translationKey="workshops.register" fallback="הירשם לסדנא" />
              </button>
              <button type="button" onClick={() => setRegModalWorkshopId(null)} className="workshop-btn workshop-btn-outline">
                <EditableLabel translationKey="cancel" fallback="ביטול" />
              </button>
            </div>
          </form>
        </div>
      </Dialog>

      <div className="workshops-back-wrap">
        <button type="button" onClick={() => navigate('/')} className="workshops-back-btn">
          <EditableLabel translationKey="store.backToHome" />
        </button>
      </div>
    </div>
  );
};

function MyRegistrationsList({ registrationIds, onUnregister, siteUser, actionId, t }) {
  const [workshops, setWorkshops] = useState([]);
  const [loading, setLoading] = useState(!!registrationIds.length);

  useEffect(() => {
    if (registrationIds.length === 0) {
      setWorkshops([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const load = async () => {
      const list = [];
      for (const id of registrationIds) {
        const w = await getWorkshopById(id);
        if (w && !cancelled) list.push(w);
      }
      if (!cancelled) setWorkshops(list);
      setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [registrationIds.join(',')]);

  if (loading) return <div className="workshops-loading"><Loader size="medium" /></div>;
  if (workshops.length === 0) return null;

  return (
    <div className="workshops-grid">
      {workshops.map(w => (
        <div key={w.id} className="workshop-card glass-panel">
          {w.imageUrl && (
            <div className="workshop-card-image-wrap">
              <img
                src={w.imageUrl}
                alt={w.title || t('workshops.imageAlt') || 'תמונת סדנא'}
                className="workshop-card-image"
                loading="lazy"
                decoding="async"
              />
            </div>
          )}
          <div className="workshop-card-body">
            <h3 className="workshop-card-title">{w.title}</h3>
            {w.instructor && <p className="workshop-card-meta"><User size={14} /> {w.instructor}</p>}
            {w.duration && <p className="workshop-card-meta"><Clock size={14} /> {w.duration}</p>}
            {w.description && <p className="workshop-card-description">{w.description}</p>}
            <button
              type="button"
              onClick={() => onUnregister(w.id)}
              disabled={!siteUser || actionId === w.id}
              className="workshop-btn workshop-btn-outline"
            >
              {actionId === w.id ? <Loader2 size={18} className="workshop-btn-spin" /> : <X size={18} />}
              {t('workshops.cancelRegistration')}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default Workshops;
