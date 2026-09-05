import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { useContent } from '../../context/ContentContext';
import { useLanguage } from '../../i18n/LanguageContext';

const HeroSection = ({ showSaved }) => {
  const { content, updateHero } = useContent();
  const { t } = useLanguage();
  const [heroData, setHeroData] = useState(content.hero);

  useEffect(() => {
    setHeroData({ ...content.hero });
  }, [content]);

  return (
    <div className="bg-[#121218] backdrop-blur-2xl border border-white/5 p-4 md:p-6 rounded-xl md:rounded-2xl space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <h2 className="text-xl md:text-2xl font-bold">{t('admin.editHeroSection')}</h2>
        <button
          onClick={async () => {
            try {
              await updateHero(heroData);
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1 text-right">
          <label className="text-xs uppercase font-bold text-[#94A3B8]">{t('admin.hebrewTitlePart1')}</label>
          <input
            type="text"
            value={heroData.titleHebrew}
            onChange={e => setHeroData({...heroData, titleHebrew: e.target.value})}
            className="w-full bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] p-3 rounded-xl focus:border-[#e11d48] outline-none text-white text-right"
          />
        </div>
        <div className="space-y-1 text-right">
          <label className="text-xs uppercase font-bold text-[#94A3B8]">{t('admin.hebrewTitlePart2')}</label>
          <input
            type="text"
            value={heroData.titleEnglish}
            onChange={e => setHeroData({...heroData, titleEnglish: e.target.value})}
            className="w-full bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] p-3 rounded-xl focus:border-[#e11d48] outline-none text-white text-right"
          />
        </div>
      </div>
      <div className="space-y-1 text-right">
        <label className="text-xs uppercase font-bold text-[#94A3B8]">{t('admin.subtitleEnglish')}</label>
        <input
          type="text"
          value={heroData.subtitle}
          onChange={e => setHeroData({...heroData, subtitle: e.target.value})}
          className="w-full bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] p-3 rounded-xl focus:border-[#e11d48] outline-none text-white text-right"
        />
      </div>
      <div className="space-y-1 text-right">
        <label className="text-xs uppercase font-bold text-[#94A3B8]">{t('admin.slogan')}</label>
        <input
          type="text"
          value={heroData.tagline}
          onChange={e => setHeroData({...heroData, tagline: e.target.value})}
          className="w-full bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] p-3 rounded-xl focus:border-[#e11d48] outline-none text-white text-right"
        />
      </div>
    </div>
  );
};

export default HeroSection;

