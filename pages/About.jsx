import { Info } from 'lucide-react';
import { useContent } from '../context/ContentContext';
import { useLanguage } from '../i18n/LanguageContext';
import SEO from '../components/SEO';
import EditableContent from '../components/EditableContent';
import EditableLabel from '../components/EditableLabel';
import './About.css';

const About = () => {
  const { content } = useContent();
  const { t } = useLanguage();

  return (
    <div className="container about-container">
      <SEO
        title="אודות | מדברים BDSM"
        description="אודות מדברים BDSM - קהילה בטוחה ומכבדת. About Talking BDSM - safe and respectful community."
        canonicalPath="/about"
      />

      <div className="about-header">
         <span className="about-badge"><EditableLabel translationKey="about.badge" /></span>
         <h1 className="about-title logo-font"><EditableLabel translationKey="about.title" /></h1>
         <p className="about-subtitle"><EditableLabel translationKey="about.subtitle" /></p>
      </div>

      <div className="glass-panel about-main-section">
        <div>
          <h2 className="about-role-title">
            <EditableContent contentPath="about.roleTitle" as="span">{content.about.roleTitle}</EditableContent>
          </h2>
          <p className="about-role-text">
            <EditableContent contentPath="about.roleText">{content.about.roleText}</EditableContent>
          </p>
          <p className="about-role-subtext">
            <EditableContent contentPath="about.roleSubtext">{content.about.roleSubtext}</EditableContent>
          </p>
        </div>
        <div className="about-icon-container">
          <Info size={80} className="about-icon" />
        </div>
      </div>

      <div className="about-cards-grid">
        {content.about.infoCards && content.about.infoCards.map((val, i) => (
          <div key={i} className={`about-card ${val.accent}`}>
            <h4 className="about-card-title">
              <EditableContent contentPath={`about.infoCards.${i}.title`}>{val.title}</EditableContent>
            </h4>
            <p className="about-card-text">
              <EditableContent contentPath={`about.infoCards.${i}.text`}>{val.text}</EditableContent>
            </p>
          </div>
        ))}
      </div>

      <div className="glass-panel about-steps-section">
        <h2 className="about-steps-title"><EditableLabel translationKey="about.howItWorks" /></h2>
        <div className="about-steps-grid">
          {content.about.steps && content.about.steps.map((s, i) => (
            <div key={i} className="about-step">
              <div className="about-step-number">{s.n}</div>
              <h5 className="about-step-title">
                <EditableContent contentPath={`about.steps.${i}.t`} as="span">{s.t}</EditableContent>
              </h5>
              <p className="about-step-description">
                <EditableContent contentPath={`about.steps.${i}.d`}>{s.d}</EditableContent>
              </p>
              {s.n === 3 && (
                <div className="about-step-note">
                  <p className="about-step-note-label"><EditableLabel translationKey="about.entryNoteLabel" /></p>
                  <p className="about-step-note-text">
                    "<EditableContent contentPath="about.entryNote">{content.about.entryNote}</EditableContent>"
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default About;

