import { AlertCircle, MessageCircle } from 'lucide-react';
import { useContent } from '../context/ContentContext';
import { useLanguage } from '../i18n/LanguageContext';
import SEO from '../components/SEO';
import EditableContent from '../components/EditableContent';
import EditableLabel from '../components/EditableLabel';
import './Contact.css';

const Contact = () => {
  const { content } = useContent();
  const { t } = useLanguage();

  return (
    <div className="container contact-container">
      <SEO
        title="צור קשר | מדברים BDSM"
        description="צור קשר עם מדברים BDSM - וואטסאפ ותמיכה. Contact Talking BDSM - WhatsApp and support."
        canonicalPath="/contact"
      />

      <div className="contact-header">
         <h1 className="contact-title logo-font"><EditableLabel translationKey="contact.title" /></h1>
         <p className="contact-subtitle"><EditableLabel translationKey="contact.subtitle" /></p>
      </div>

      <div className="glass-panel contact-main-card">
         <div className="contact-top-line"></div>
         <div className="contact-alert">
           <AlertCircle size={14} className="contact-alert-icon" />{' '}
           <span className="contact-alert-text">
             <EditableContent contentPath="contact.alertText">{content.contact.alertText}</EditableContent>
           </span>
         </div>
         
         <h2 className="contact-main-title"><EditableLabel translationKey="contact.available" /></h2>
         <p className="contact-description">
           <EditableContent contentPath="contact.description">{content.contact.description}</EditableContent>
         </p>

         <a href={content.contact.whatsappLink} target="_blank" rel="noopener noreferrer" className="contact-whatsapp-btn">
           <MessageCircle size={24} className="contact-whatsapp-icon" />
           <span className="contact-whatsapp-text"><EditableLabel translationKey="contact.whatsappButton" /></span>
         </a>
         <p className="contact-support-note"><EditableLabel translationKey="contact.supportOnly" /></p>
      </div>

      <div className="contact-info-box">
         <h3 className="contact-info-title"><EditableLabel translationKey="contact.importantTitle" /></h3>
         <p className="contact-info-text">
           <EditableContent contentPath="contact.importantNote">{content.contact.importantNote}</EditableContent>
         </p>
      </div>
    </div>
  );
};

export default Contact;