import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { useContent } from '../../context/ContentContext';
import { useLanguage } from '../../i18n/LanguageContext';

const ContactSection = ({ showSaved }) => {
  const { content, updateContact } = useContent();
  const { t } = useLanguage();
  const [contactData, setContactData] = useState(content.contact);

  useEffect(() => {
    setContactData({ ...content.contact });
  }, [content]);

  return (
    <div className="bg-[#121218] backdrop-blur-2xl border border-white/5 p-6 rounded-2xl space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">{t('admin.editContactPage')}</h2>
        <button
          onClick={() => {
            updateContact(contactData);
            showSaved();
          }}
          className="bg-[#ff5708] hover:bg-[#ff7a29] text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2"
        >
          <Save size={18} /> {t('save')}
        </button>
      </div>
      <div className="space-y-1 text-right">
        <label className="text-xs uppercase font-bold text-[#94A3B8]">{t('admin.whatsappLink')}</label>
        <input
          type="text"
          value={contactData.whatsappLink}
          onChange={e => setContactData({...contactData, whatsappLink: e.target.value})}
          className="w-full bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] p-3 rounded-xl focus:border-[#ff5708] outline-none text-white text-right"
        />
      </div>
      <div className="space-y-1 text-right">
        <label className="text-xs uppercase font-bold text-[#94A3B8]">{t('admin.alertText')}</label>
        <input
          type="text"
          value={contactData.alertText}
          onChange={e => setContactData({...contactData, alertText: e.target.value})}
          className="w-full bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] p-3 rounded-xl focus:border-[#ff5708] outline-none text-white text-right"
        />
      </div>
      <div className="space-y-1 text-right">
        <label className="text-xs uppercase font-bold text-[#94A3B8]">{t('admin.description')}</label>
        <textarea
          value={contactData.description}
          onChange={e => setContactData({...contactData, description: e.target.value})}
          rows={4}
          className="w-full bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] p-3 rounded-xl focus:border-[#ff5708] outline-none text-white text-right"
        />
      </div>
      <div className="space-y-1 text-right">
        <label className="text-xs uppercase font-bold text-[#94A3B8]">{t('admin.importantNote')}</label>
        <textarea
          value={contactData.importantNote}
          onChange={e => setContactData({...contactData, importantNote: e.target.value})}
          rows={3}
          className="w-full bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] p-3 rounded-xl focus:border-[#ff5708] outline-none text-white text-right"
        />
      </div>
    </div>
  );
};

export default ContactSection;

