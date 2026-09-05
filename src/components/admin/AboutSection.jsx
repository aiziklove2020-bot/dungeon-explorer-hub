import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { useContent } from '../../context/ContentContext';
import { useLanguage } from '../../i18n/LanguageContext';

const AboutSection = ({ showSaved }) => {
  const { content, updateAbout } = useContent();
  const { t } = useLanguage();
  const [aboutData, setAboutData] = useState(() => ({
    ...content.about,
    infoCards: content.about.infoCards.map(c => ({ ...c })),
    steps: content.about.steps.map(s => ({ ...s }))
  }));

  useEffect(() => {
    setAboutData({ 
      ...content.about,
      infoCards: content.about.infoCards.map(c => ({ ...c })),
      steps: content.about.steps.map(s => ({ ...s }))
    });
  }, [content]);

  return (
    <div className="bg-[#121218] backdrop-blur-2xl border border-white/5 p-4 md:p-6 rounded-xl md:rounded-2xl space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <h2 className="text-xl md:text-2xl font-bold">{t('admin.editAboutPage')}</h2>
        <button
          onClick={async () => {
            try {
              await updateAbout(aboutData);
              showSaved();
            } catch (error) {
              alert(t('admin.errorSaving'));
            }
          }}
          className="bg-[#e11d48] hover:bg-[#be0037] text-white px-4 md:px-6 py-2 rounded-xl font-bold flex items-center gap-2 text-sm md:text-base w-full sm:w-auto justify-center"
        >
          <Save size={16} className="md:w-[18px] md:h-[18px]" /> {t('save')}
        </button>
      </div>
      
      <div className="space-y-4">
        <div className="space-y-1 text-right">
          <label className="text-xs uppercase font-bold text-zinc-500">{t('admin.roleTitle')}</label>
          <input
            type="text"
            value={aboutData.roleTitle}
            onChange={e => setAboutData({...aboutData, roleTitle: e.target.value})}
            className="w-full bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] p-3 rounded-xl focus:border-[#e11d48] outline-none text-white text-right"
          />
        </div>
        <div className="space-y-1 text-right">
          <label className="text-xs uppercase font-bold text-zinc-500">{t('admin.roleText')}</label>
          <textarea
            value={aboutData.roleText}
            onChange={e => setAboutData({...aboutData, roleText: e.target.value})}
            rows={4}
            className="w-full bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] p-3 rounded-xl focus:border-[#e11d48] outline-none text-white text-right"
          />
        </div>
        <div className="space-y-1 text-right">
          <label className="text-xs uppercase font-bold text-zinc-500">{t('admin.secondaryText')}</label>
          <textarea
            value={aboutData.roleSubtext}
            onChange={e => setAboutData({...aboutData, roleSubtext: e.target.value})}
            rows={3}
            className="w-full bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] p-3 rounded-xl focus:border-[#e11d48] outline-none text-white text-right"
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-bold">{t('admin.infoCards')}</h3>
        {aboutData.infoCards && aboutData.infoCards.map((card, index) => (
          <div key={index} className="bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] p-4 rounded-xl space-y-3">
            <input
              type="text"
              value={card.title}
              onChange={e => {
                const newCards = [...aboutData.infoCards];
                newCards[index] = { ...card, title: e.target.value };
                setAboutData({...aboutData, infoCards: newCards});
              }}
              className="w-full bg-zinc-900 border border-zinc-700 p-2 rounded-lg focus:border-[#e11d48] outline-none text-white text-right font-bold"
              placeholder={t('admin.title')}
            />
            <textarea
              value={card.text}
              onChange={e => {
                const newCards = [...aboutData.infoCards];
                newCards[index] = { ...card, text: e.target.value };
                setAboutData({...aboutData, infoCards: newCards});
              }}
              rows={3}
              className="w-full bg-zinc-900 border border-zinc-700 p-2 rounded-lg focus:border-[#e11d48] outline-none text-white text-right"
              placeholder={t('admin.text')}
            />
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-bold">{t('admin.processSteps')}</h3>
        {aboutData.steps && aboutData.steps.map((step, index) => (
          <div key={index} className="bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] p-4 rounded-xl space-y-3">
            <div className="flex gap-3">
              <input
                type="number"
                value={step.n}
                onChange={e => {
                  const newSteps = [...aboutData.steps];
                  newSteps[index] = { ...step, n: parseInt(e.target.value) };
                  setAboutData({...aboutData, steps: newSteps});
                }}
                className="w-16 bg-zinc-900 border border-zinc-700 p-2 rounded-lg focus:border-[#e11d48] outline-none text-white text-center font-bold"
              />
              <input
                type="text"
                value={step.t}
                onChange={e => {
                  const newSteps = [...aboutData.steps];
                  newSteps[index] = { ...step, t: e.target.value };
                  setAboutData({...aboutData, steps: newSteps});
                }}
                className="flex-1 bg-zinc-900 border border-zinc-700 p-2 rounded-lg focus:border-[#e11d48] outline-none text-white text-right font-bold"
                placeholder={t('admin.title')}
              />
            </div>
            <textarea
              value={step.d}
              onChange={e => {
                const newSteps = [...aboutData.steps];
                newSteps[index] = { ...step, d: e.target.value };
                setAboutData({...aboutData, steps: newSteps});
              }}
              rows={2}
              className="w-full bg-zinc-900 border border-zinc-700 p-2 rounded-lg focus:border-[#e11d48] outline-none text-white text-right"
              placeholder={t('admin.description')}
            />
          </div>
        ))}
        <div className="space-y-1 text-right">
          <label className="text-xs uppercase font-bold text-zinc-500">{t('admin.entryNote')}</label>
          <input
            type="text"
            value={aboutData.entryNote}
            onChange={e => setAboutData({...aboutData, entryNote: e.target.value})}
            className="w-full bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] p-3 rounded-xl focus:border-[#e11d48] outline-none text-white text-right"
          />
        </div>
      </div>
    </div>
  );
};

export default AboutSection;

