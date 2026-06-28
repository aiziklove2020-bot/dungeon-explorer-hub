import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Users, Ticket, Calendar, Clock, Music, ShoppingCart,
  ClipboardList, ClipboardCheck
} from 'lucide-react';
import { FaFacebook, FaInstagram, FaTelegram, FaWhatsapp } from 'react-icons/fa';
import { useContent } from '../context/ContentContext';
import { useLanguage } from '../i18n/LanguageContext';
import RSSFeedTicker from '../components/RSSFeedTicker';
import Loader from '../components/Loader';
import SEO from '../components/SEO';
import EditableContent from '../components/EditableContent';
import EditableLabel from '../components/EditableLabel';
import { getActiveWorkshops } from '../firebase/workshops';
import { sanitizeExternalUrl } from '../utils/externalUrl';
import {
  ISRAEL_TZ,
  DEFAULT_PARTY_RETENTION_HOURS,
  getIsraelOffsetForWallTime,
  isPartyExpiredByExpiration,
} from '../../shared/partyExpiry.js';
import './Home.css';

const iconMap = {
  instagram: FaInstagram,
  channel: FaTelegram,
  discussion: FaTelegram,
  whatsapp: FaWhatsapp,
  facebook: FaFacebook
};

/**
 * Pull "today" in Asia/Jerusalem so the year used to render "DD.MM" → ISO
 * matches what users see on the page (independent of device TZ).
 */
function getTodayInIsrael() {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: ISRAEL_TZ,
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(new Date());
    const get = (type) => parts.find((p) => p.type === type)?.value;
    const year = parseInt(get('year'), 10);
    const month = parseInt(get('month'), 10);
    const day = parseInt(get('day'), 10);
    if (!year || !month || !day) return null;
    return { year, month, day };
  } catch {
    return null;
  }
}

const pad2 = (n) => String(n).padStart(2, '0');

/**
 * Public-facing visibility rule: each event in `content.json` carries an
 * explicit `expiration` ISO timestamp computed at publish time from
 * `partyDate + retentionHours`. We just compare it to "now" — no schema-aware
 * date math at view time, no DB calls.
 *
 * Legacy events that were published before the per-party `expiration` field
 * existed fall back to recomputing from the labeled "DD.MM" + the global
 * retention window (also stored in `content.json`), so older deployments stay
 * correct without a forced re-publish.
 */
const isPartyExpired = (event, retentionHours) =>
  isPartyExpiredByExpiration(event?.expiration, event?.date, retentionHours);

/**
 * Times before this hour (local Israel) are interpreted as the post-midnight
 * continuation of the previous evening — e.g. a party labeled "Friday 00:00" or
 * "Friday 02:00" is in fact the night that *starts* on Friday evening but whose
 * clock has rolled into Saturday. The on-page label stays "Friday" (guests
 * arrive Friday evening), but the ISO startDate sent to Google must reflect the
 * real calendar moment, otherwise Google sees a party 24h earlier than reality.
 */
const NIGHT_OWL_HOUR_CUTOFF = 6;

/**
 * Convert a party's "DD.MM" date + "HH:MM" time into ISO 8601 strings (with Israel
 * offset) for both startDate and an estimated endDate. Returns null if invalid.
 * `durationHours` defaults to 6 — a reasonable estimate for a night party so Google
 * has a concrete endDate (recommended for rich results).
 *
 * Night-party convention: when `time` is in the early-morning window (< 06:00),
 * the calendar date is shifted forward by one day for ISO output only. This keeps
 * the existing display ("Friday 00:00") while emitting the correct moment in
 * time (Saturday 00:00) to search engines.
 */
const partyToIsoDates = (dateStr, timeStr, durationHours = 6) => {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const parts = dateStr.trim().split('.');
  const dayInput = parseInt(parts[0], 10);
  const monthInput = parseInt(parts[1], 10);
  if (isNaN(dayInput) || isNaN(monthInput) || dayInput < 1 || dayInput > 31 || monthInput < 1 || monthInput > 12) return null;
  const israelToday = getTodayInIsrael();
  const yearInput = israelToday ? israelToday.year : new Date().getFullYear();
  let hour = 0;
  let minute = 0;
  if (timeStr) {
    const [h, min] = String(timeStr).split(':').map(Number);
    if (!isNaN(h)) hour = h;
    if (!isNaN(min)) minute = min;
  }
  // Apply the night-owl shift before formatting, so end-of-day rollover and
  // month/year boundaries are handled by the Date constructor.
  const dayShift = hour < NIGHT_OWL_HOUR_CUTOFF ? 1 : 0;
  const startAnchor = new Date(Date.UTC(yearInput, monthInput - 1, dayInput + dayShift));
  const year = startAnchor.getUTCFullYear();
  const month = startAnchor.getUTCMonth() + 1;
  const day = startAnchor.getUTCDate();
  const startOffset = getIsraelOffsetForWallTime(year, month, day, hour, minute);
  const startDate = `${year}-${pad2(month)}-${pad2(day)}T${pad2(hour)}:${pad2(minute)}:00${startOffset}`;
  // Compute end wall time by adding hours; roll into next day when needed.
  const endTotalMinutes = hour * 60 + minute + durationHours * 60;
  const endDayOffset = Math.floor(endTotalMinutes / (24 * 60));
  const endMinutesOfDay = endTotalMinutes % (24 * 60);
  const endHour = Math.floor(endMinutesOfDay / 60);
  const endMinute = endMinutesOfDay % 60;
  const endAnchor = new Date(Date.UTC(year, month - 1, day + endDayOffset, endHour, endMinute));
  const endY = endAnchor.getUTCFullYear();
  const endM = endAnchor.getUTCMonth() + 1;
  const endD = endAnchor.getUTCDate();
  const endOffset = getIsraelOffsetForWallTime(endY, endM, endD, endHour, endMinute);
  const endDate = `${endY}-${pad2(endM)}-${pad2(endD)}T${pad2(endHour)}:${pad2(endMinute)}:00${endOffset}`;
  return { startDate, endDate };
};

const Home = ({ navigate: handleNavigate }) => {
  const { content, isInitialized, contentLoadError, reloadContent } = useContent();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [workshopsEnabled, setWorkshopsEnabled] = useState((content.activeWorkshopsCount ?? 0) > 0);
  // Re-evaluate expiration while the tab stays open (parties drop off at midnight IL).
  const [, setExpiryTick] = useState(0);

  useEffect(() => {
    getActiveWorkshops().then(list => setWorkshopsEnabled(list.length > 0)).catch(() => {});
  }, []);

  useEffect(() => {
    const id = setInterval(() => setExpiryTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  // storeEnabled comes from content.json (set at publish time) — no Firestore reads needed
  const storeEnabled = content.storeEnabled ?? false;

  const partyRetentionHours = content.partyRetentionHours ?? DEFAULT_PARTY_RETENTION_HOURS;
  const visibleEvents = (content.events || []).filter(ev => !isPartyExpired(ev, partyRetentionHours));
  const visibleExternalEvents = (content.externalEvents || []).filter(ev => !isPartyExpired(ev, partyRetentionHours));
  const getEventKey = (ev, index) => ev?.id || `${ev?.date || 'date'}-${ev?.title || 'event'}-${index}`;

  const defaultDescription = 'מדברים BDSM - קהילה, אירועים, הרשמה למסיבות וסדנאות. Talking BDSM - community, events, party registration and workshops.';
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const webSiteStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'מדברים BDSM | Talking BDSM',
    url: origin,
    inLanguage: 'he',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${origin}/forum?q={search_term_string}`,
      'query-input': 'required name=search_term_string'
    }
  };
  const organizationStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'מדברים BDSM',
    alternateName: 'Talking BDSM',
    url: origin,
    logo: origin ? `${origin}/icon-512.png` : undefined,
    inLanguage: 'he'
  };
  // Emit one Event JSON-LD per upcoming party so Google can surface them in the
  // Events knowledge panel. Skip events without a date or title. We must satisfy
  // schema.org/Event required fields (startDate ISO 8601 + location for offline
  // events) plus the recommended fields Google flags: endDate, performer, offers.
  // Exact venues are intentionally undisclosed for community privacy, so the
  // location is the city only — schema.org/Place permits this.
  const buildEventJsonLd = (ev, fallbackUrl) => {
    const dates = partyToIsoDates(ev.date, ev.time);
    if (!dates) return null;
    const registrationUrl = sanitizeExternalUrl(ev.registrationLink) || fallbackUrl;
    const offers = registrationUrl
      ? {
          '@type': 'Offer',
          url: registrationUrl,
          availability: 'https://schema.org/InStock',
          validFrom: new Date().toISOString(),
        }
      : undefined;
    // Strip any existing "dj" prefix (some entries store " Dj Nimrod") to avoid
    // emitting "DJ Dj Nimrod" in structured data.
    const djName = ev.dj ? String(ev.dj).trim().replace(/^dj\s+/i, '') : '';
    const performer = djName
      ? { '@type': 'PerformingGroup', name: `DJ ${djName}` }
      : undefined;
    return {
      '@context': 'https://schema.org',
      '@type': 'Event',
      name: ev.title,
      startDate: dates.startDate,
      endDate: dates.endDate,
      eventStatus: 'https://schema.org/EventScheduled',
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      location: {
        '@type': 'Place',
        name: 'Tel Aviv area, Israel',
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Tel Aviv',
          addressRegion: 'Tel Aviv District',
          addressCountry: 'IL',
        },
      },
      description: ev.description || undefined,
      image: ev.img || undefined,
      performer,
      offers,
      organizer: { '@type': 'Organization', name: 'מדברים BDSM', url: origin || undefined },
    };
  };

  const internalRegisterUrl = origin ? `${origin}/register` : undefined;
  const eventStructuredData = [
    ...visibleEvents
      .filter((ev) => ev?.date && ev?.title)
      .map((ev) => buildEventJsonLd(ev, ev?.id && origin ? `${origin}/register?partyId=${ev.id}` : internalRegisterUrl)),
    ...visibleExternalEvents
      .filter((ev) => ev?.date && ev?.title)
      .map((ev) => buildEventJsonLd(ev, undefined)),
  ].filter(Boolean);

  return (
    <div className="home-container">
      <SEO
        title="מדברים BDSM | Talking BDSM"
        description={defaultDescription}
        canonicalPath="/"
        structuredData={[webSiteStructuredData, organizationStructuredData, ...eventStructuredData]}
      />
      <header className="hero-section hero-gradient">
        {/* Single page <h1> for SEO. Visual styling unchanged. */}
        <h1 className="hero-title logo-font">
          <EditableContent contentPath="hero.titleHebrew" className="hero-title-hebrew">
            {content.hero.titleHebrew}
          </EditableContent>
          {' '}
          <br className="hero-title-break" />
          {' '}
          <EditableContent contentPath="hero.titleEnglish" className="hero-title-english">
            {content.hero.titleEnglish}
          </EditableContent>
        </h1>
        <div className="hero-subtitle english-sub">
          <EditableContent contentPath="hero.subtitle">{content.hero.subtitle}</EditableContent>
        </div>
        <div className="hero-tagline">
          <EditableContent contentPath="hero.tagline">{content.hero.tagline}</EditableContent>
        </div>
      </header>

      <div className="hero-below-section">
        <RSSFeedTicker />
        {storeEnabled && (
          <div className="hero-shop-below-rss">
            <button onClick={() => navigate('/store')} className="hero-store-btn">
              <ShoppingCart size={20} className="hero-store-btn-icon" /> <span className="hero-store-btn-text"><EditableLabel translationKey="home.storeButton" /></span>
            </button>
          </div>
        )}
      </div>

      {((visibleEvents.length > 0) || storeEnabled || workshopsEnabled) && (
        <div className="hero-cta-buttons">
          {visibleEvents.length > 0 && (
            <button onClick={() => handleNavigate('register')} className="hero-register-btn">
              <Ticket size={20} className="hero-register-btn-icon" /> <span className="hero-register-btn-text"><EditableLabel translationKey="home.registerButton" /></span>
            </button>
          )}
          {workshopsEnabled && (
            <button onClick={() => navigate('/workshops')} className="hero-workshops-btn">
              <ClipboardList size={20} className="hero-workshops-btn-icon" /> <span className="hero-workshops-btn-text"><EditableLabel translationKey="home.workshopsButton" fallback="רישום לסדנאות" /></span>
            </button>
          )}
          {storeEnabled && (
            <button onClick={() => navigate('/store')} className="hero-store-btn">
              <ShoppingCart size={20} className="hero-store-btn-icon" /> <span className="hero-store-btn-text"><EditableLabel translationKey="home.storeButton" /></span>
            </button>
          )}
        </div>
      )}

      {!isInitialized && (
        <section className="events-section">
          <h2 className="events-title logo-font"><EditableLabel translationKey="home.internalParties" /></h2>
          <div className="events-empty-state flex items-center justify-center min-h-[200px]">
            <Loader size="medium" />
          </div>
        </section>
      )}

      {isInitialized && visibleEvents.length > 0 && (
        <section className="events-section">
          <h2 className="events-title logo-font"><EditableLabel translationKey="home.internalParties" /></h2>
          <div className="events-grid">
            {visibleEvents.map((ev, i) => {
              const registrationHref = sanitizeExternalUrl(ev.registrationLink);
              return (
              <div key={getEventKey(ev, i)} className="event-card glass-panel">
                <div className="event-image-container">
                  <img
                    src={ev.img}
                    className="event-image filter-none transform-none"
                    alt={ev.title}
                    loading={i < 2 ? 'eager' : 'lazy'}
                    decoding="async"
                  />
                </div>
                <div className="event-content">
                  <div className="event-meta">
                     <span className="event-meta-item"><Calendar size={12} className="event-meta-icon"/>{ev.day} {ev.date}</span>
                     <span className="event-meta-item"><Clock size={12} className="event-meta-icon"/>{ev.time}</span>
                     <span className="event-meta-item"><Music size={12} className="event-meta-icon"/>DJ {ev.dj}</span>
                  </div>
                  <h3 className="event-title">{ev.title}</h3>
                  <p className="event-description">{ev.description}</p>
                  {registrationHref ? (
                    <a 
                      href={registrationHref}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="event-register-btn"
                    >
                      {ev.day === 'חמישי' ? <ClipboardList size={18}/> : <ClipboardCheck size={18}/>}
                      <span><EditableLabel translationKey="home.registerTo" />{ev.day}</span>
                    </a>
                  ) : (
                    <button onClick={() => navigate(`/register?partyId=${ev.id || ''}`)} className="event-register-btn">
                      {ev.day === 'חמישי' ? <ClipboardList size={18}/> : <ClipboardCheck size={18}/>}
                      <span><EditableLabel translationKey="home.registerTo" />{ev.day}</span>
                    </button>
                  )}
                </div>
              </div>
            );})}
          </div>
        </section>
      )}

      {isInitialized && visibleEvents.length === 0 && (
        <section className="events-section">
          <div className="events-empty-state">
            {contentLoadError ? (
              <>
                <p className="events-empty-message">{t('home.contentLoadError') || 'לא הצלחנו לטעון את האירועים.'}</p>
                <button type="button" onClick={() => reloadContent()} className="event-register-btn mt-4">
                  {t('home.retryLoad') || 'נסו שוב'}
                </button>
              </>
            ) : (
              <>
                <p className="events-empty-message"><EditableLabel translationKey="home.noActiveParties" fallback={t('noActiveParties')} /></p>
                <p className="events-empty-subtitle"><EditableLabel translationKey="home.checkBackLater" fallback="נא לבדוק שוב מאוחר יותר" /></p>
              </>
            )}
          </div>
        </section>
      )}

      {visibleExternalEvents.length > 0 && (
        <section className="events-section external-events-section">
          <h2 className="events-title events-title-blue logo-font"><EditableLabel translationKey="home.externalParties" /></h2>
          <div className="events-grid">
            {visibleExternalEvents.map((ev, i) => {
              const registrationHref = sanitizeExternalUrl(ev.registrationLink);
              return (
              <div key={getEventKey(ev, i)} className="event-card event-card-blue glass-panel">
                <div className="event-image-container">
                  <img
                    src={ev.img}
                    className="event-image filter-none transform-none"
                    alt={ev.title}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div className="event-content">
                  <div className="event-meta">
                     <span className="event-meta-item"><Calendar size={12} className="event-meta-icon-blue"/>{ev.day} {ev.date}</span>
                     <span className="event-meta-item"><Clock size={12} className="event-meta-icon-blue"/>{ev.time}</span>
                     {ev.dj && <span className="event-meta-item"><Music size={12} className="event-meta-icon-blue"/>DJ {ev.dj}</span>}
                  </div>
                  <h3 className="event-title">{ev.title}</h3>
                  <p className="event-description">{ev.description}</p>
                  {registrationHref ? (
                    <a 
                      href={registrationHref}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="event-register-btn event-register-btn-blue"
                    >
                      <ClipboardList size={18}/>
                      <EditableLabel translationKey="home.registerExternal" />
                    </a>
                  ) : (
                    <div className="event-register-btn-disabled">
                      <EditableLabel translationKey="home.noRegistrationLink" />
                    </div>
                  )}
                </div>
              </div>
            );})}
          </div>
        </section>
      )}

      <section className="balances-section">
        <div className="balances-container">
          <h2 className="balances-title logo-font"><EditableLabel translationKey="home.balanceGroups" /></h2>
          <p className="balances-subtitle"><EditableLabel translationKey="home.balanceSubtitle" /></p>
          <div className="balances-grid">
            {[
              { labelKey: 'home.men', color: 'balance-button-blue', icon: User, link: content.whatsappGroups?.men },
              { labelKey: 'home.women', color: 'balance-button-pink', icon: Users, link: content.whatsappGroups?.women }
            ].map((b) => {
              const safeHref = sanitizeExternalUrl(b.link);
              return (
              <a 
                key={b.labelKey}
                href={safeHref || '#'} 
                target="_blank" 
                rel="noopener noreferrer"
                className={`balance-button ${b.color}`}
                onClick={!safeHref ? (e) => e.preventDefault() : undefined}
              >
                <b.icon size={24} className="balance-icon" />
                <span className="balance-label"><EditableLabel translationKey={b.labelKey} /></span>
                <span className="balance-subtext"><EditableLabel translationKey="home.requestEntry" /></span>
              </a>
            );})}
          </div>
        </div>
      </section>

      <section className="social-section">
        <h2 className="social-title"><EditableLabel translationKey="home.findUsOnline" /></h2>
        <div className="social-grid">
          {content.socialLinks && Array.isArray(content.socialLinks) && content.socialLinks.map((s) => {
            const IconComponent = iconMap[s.type] || FaWhatsapp;
            const colorMap = {
              instagram: 'social-icon-container-instagram',
              channel: 'social-icon-container-blue',
              discussion: 'social-icon-container-blue',
              whatsapp: 'social-icon-container-green',
              facebook: 'social-icon-container-facebook'
            };
            const safeHref = sanitizeExternalUrl(s.url);
            return (
              <a
                key={`${s.type || 'social'}-${s.label || 'label'}-${s.url || 'url'}`}
                href={safeHref || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="social-link"
                onClick={!safeHref ? (e) => e.preventDefault() : undefined}
              >
                <div className={`social-icon-container ${colorMap[s.type] || 'social-icon-container-default'}`}>
                  <IconComponent size={20} className="social-icon" />
                </div>
                <span className="social-label">{s.label}</span>
              </a>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default Home;

