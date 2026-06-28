import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import SEO from '../components/SEO';
import './Privacy.css';

const PRIVACY_LAST_UPDATED = '2025-03-08';

const Privacy = () => {
  const { t } = useLanguage();

  return (
    <div className="container privacy-container">
      <SEO
        title="מדיניות פרטיות | מדברים BDSM"
        description="מדיניות פרטיות – Talking BDSM (מדברים BDSM). Privacy policy for the app and website."
        canonicalPath="/privacy"
      />
      <div className="privacy-header">
        <h1 className="privacy-title logo-font">{t('privacy.title')}</h1>
        <p className="privacy-updated">
          {t('privacy.lastUpdated')}: {PRIVACY_LAST_UPDATED}
        </p>
      </div>

      <div className="glass-panel privacy-main">
        <section className="privacy-section">
          <h2 className="privacy-h2">{t('privacy.section1Title')}</h2>
          <ul className="privacy-list">
            <li>{t('privacy.section1Item1')}</li>
            <li>{t('privacy.section1Item2')}</li>
            <li>{t('privacy.section1Item3')}</li>
          </ul>
        </section>

        <section className="privacy-section">
          <h2 className="privacy-h2">{t('privacy.section2Title')}</h2>
          <ul className="privacy-list">
            <li>{t('privacy.section2Item1')}</li>
            <li>{t('privacy.section2Item2')}</li>
            <li>{t('privacy.section2Item3')}</li>
            <li>{t('privacy.section2Item4')}</li>
          </ul>
        </section>

        <section className="privacy-section">
          <h2 className="privacy-h2">{t('privacy.section3Title')}</h2>
          <p className="privacy-p">{t('privacy.section3Text')}</p>
        </section>

        <section className="privacy-section">
          <h2 className="privacy-h2">{t('privacy.section4Title')}</h2>
          <p className="privacy-p">{t('privacy.section4Text')}</p>
        </section>

        <section className="privacy-section">
          <h2 className="privacy-h2">{t('privacy.section5Title')}</h2>
          <p className="privacy-p">
            {t('privacy.section5Text')}{' '}
            <Link to="/deleterequest" className="privacy-link">{t('privacy.section5DeleteLink')}</Link>.
          </p>
        </section>

        <section className="privacy-section">
          <h2 className="privacy-h2">{t('privacy.section6Title')}</h2>
          <p className="privacy-p">{t('privacy.section6Text')}</p>
        </section>

        <section className="privacy-section">
          <h2 className="privacy-h2">{t('privacy.section7Title')}</h2>
          <p className="privacy-p">{t('privacy.section7Text')}</p>
        </section>

        <section className="privacy-section">
          <h2 className="privacy-h2">{t('privacy.section8Title')}</h2>
          <p className="privacy-p">{t('privacy.section8Text')}</p>
        </section>

        <section className="privacy-section">
          <h2 className="privacy-h2">{t('privacy.section9Title')}</h2>
          <p className="privacy-p">
            {t('privacy.section9Text')}{' '}
            <Link to="/contact" className="privacy-link">
              {t('privacy.contactPage')}
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
};

export default Privacy;
