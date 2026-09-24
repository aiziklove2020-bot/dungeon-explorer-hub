import { useState, useEffect } from 'react';
import { Save, Download, Upload as UploadIcon } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useContent } from '../../context/ContentContext';
import { 
  getSocialLinks, 
  updateSocialLinks, 
  getTelegramSettings, 
  updateTelegramSettings, 
  getAboutStory, 
  updateAboutStory, 
  getWhatsappGroups, 
  updateWhatsappGroups 
} from '../../firebase/settings';
import { getBotInfo } from '../../firebase/telegram';

const LinksSection = ({ showSaved }) => {
  const { t } = useLanguage();
  const { content, updateSocialLinks: updateSocialLinksContext, updateWhatsappGroups: updateWhatsappGroupsContext, updateRegistration, exportAllData, importAllData } = useContent();
  const [socialLinksData, setSocialLinksData] = useState(Array.isArray(content.socialLinks) ? content.socialLinks : []);
  const [whatsappGroupsData, setWhatsappGroupsData] = useState(content.whatsappGroups || { men: '', women: '' });
  const [telegramSettings, setTelegramSettings] = useState({
    botToken: '',
    chatId: '',
    enabled: false
  });
  const [showTelegramForm, setShowTelegramForm] = useState(false);
  const [botInfo, setBotInfo] = useState(null);
  const [aboutStory, setAboutStory] = useState({
    hebrew: '',
    english: ''
  });
  const [showAboutStoryForm, setShowAboutStoryForm] = useState(false);

  useEffect(() => {
    loadSocialLinks();
    loadTelegramSettings();
    loadWhatsappGroups();
    loadAboutStory();
  }, []);

  const loadSocialLinks = async () => {
    try {
      const links = await getSocialLinks();
      
      if (Array.isArray(links)) {
        setSocialLinksData(links);
      } else if (links && typeof links === 'object') {
        
        const linksArray = [
          { type: 'instagram', label: t('instagram'), url: links.instagram || '' },
          { type: 'channel', label: t('telegramChannel'), url: links.telegramChannel || '' },
          { type: 'discussion', label: t('telegramGroup'), url: links.telegramGroup || '' },
          { type: 'whatsapp', label: t('talkingBdsm'), url: links.whatsapp || '' },
          { type: 'facebook', label: t('facebook'), url: links.facebook || '' }
        ];
        setSocialLinksData(linksArray);
      } else {
        
        setSocialLinksData([
          { type: 'instagram', label: t('instagram'), url: '' },
          { type: 'channel', label: t('telegramChannel'), url: '' },
          { type: 'discussion', label: t('telegramGroup'), url: '' },
          { type: 'whatsapp', label: t('talkingBdsm'), url: '' },
          { type: 'facebook', label: t('facebook'), url: '' }
        ]);
      }
    } catch (error) {
      
      setSocialLinksData([
        { type: 'instagram', label: t('instagram'), url: '' },
        { type: 'channel', label: t('telegramChannel'), url: '' },
        { type: 'discussion', label: t('telegramGroup'), url: '' },
        { type: 'whatsapp', label: t('talkingBdsm'), url: '' },
        { type: 'facebook', label: t('facebook'), url: '' }
      ]);
    }
  };

  const loadTelegramSettings = async () => {
    try {
      const settings = await getTelegramSettings();
      setTelegramSettings(settings);
      if (settings.botToken) {
        const info = await getBotInfo(settings.botToken);
        setBotInfo(info);
      } else {
        setBotInfo(null);
      }
    } catch (error) {
    }
  };

  const loadWhatsappGroups = async () => {
    try {
      const groups = await getWhatsappGroups();
      setWhatsappGroupsData(groups);
    } catch (error) {
    }
  };

  const loadAboutStory = async () => {
    try {
      const story = await getAboutStory();
      setAboutStory(story);
    } catch (error) {
    }
  };

  const handleBotTokenChange = async (e) => {
    const newToken = e.target.value;
    setTelegramSettings({ ...telegramSettings, botToken: newToken });
    if (newToken && newToken.length > 20) {
      const info = await getBotInfo(newToken);
      setBotInfo(info);
    } else {
      setBotInfo(null);
    }
  };

  // Once even one bot is configured in the newer "טלגרם" tab, the settings
  // doc carries a `bots` array — and getTelegramSettings() (the function
  // every actual send path reads from) then ignores this doc's legacy
  // botToken/chatId/enabled fields entirely. Saving this old form still
  // "succeeds" (the write lands, showSaved() fires) but nothing downstream
  // ever reads it again — a silent no-op an admin has no way to notice.
  const isMultiBotMode = Array.isArray(telegramSettings.bots) && telegramSettings.bots.length > 0;

  const handleSaveTelegramSettings = async (e) => {
    e.preventDefault();
    if (isMultiBotMode) {
      alert('הגדרות טלגרם עברו לטאב "טלגרם" (מערכת רב-בוטים/ערוצים). המסך הזה כבר לא פעיל — שינויים כאן לא ישפיעו על שליחת הודעות. יש להגדיר בוטים וערוצים בטאב "טלגרם".');
      return;
    }
    try {
      await updateTelegramSettings(telegramSettings);
      showSaved();
    } catch (error) {
    }
  };

  const handleSaveAboutStory = async (e) => {
    e.preventDefault();
    try {
      await updateAboutStory(aboutStory);
      setShowAboutStoryForm(false);
      showSaved();
    } catch (error) {
    }
  };

  const handleExportAll = async () => {
    try {
      await exportAllData();
      showSaved();
    } catch (error) {
    }
  };

  const handleImportAll = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const success = await importAllData(event.target.result);
        if (success) {
          showSaved();
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="bg-[#121218] backdrop-blur-2xl border border-white/5 p-6 rounded-2xl space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">{t('linksAndGroups')}</h2>
        <div className="flex gap-2">
          <button
            onClick={handleExportAll}
            className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2"
          >
            <Download size={18} /> {t('admin.exportAllToJson')}
          </button>
          <label className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 cursor-pointer">
            <UploadIcon size={18} /> {t('admin.importAllFromJson')}
            <input 
              type="file" 
              accept=".json" 
              onChange={handleImportAll} 
              className="hidden" 
            />
          </label>
          <button
            onClick={async () => {
              try {
                
                const socialLinksObj = {
                  instagram: socialLinksData.find(l => l.type === 'instagram')?.url || '',
                  telegramChannel: socialLinksData.find(l => l.type === 'channel')?.url || '',
                  telegramGroup: socialLinksData.find(l => l.type === 'discussion')?.url || '',
                  whatsapp: socialLinksData.find(l => l.type === 'whatsapp')?.url || '',
                  facebook: socialLinksData.find(l => l.type === 'facebook')?.url || ''
                };

                await updateSocialLinks(socialLinksObj);
                await updateWhatsappGroups(whatsappGroupsData);

                updateSocialLinksContext(socialLinksData);
                updateWhatsappGroupsContext(whatsappGroupsData);
                
                showSaved();
              } catch (error) {
                alert(t('saveError'));
              }
            }}
            className="bg-[#ff5708] hover:bg-[#ff7a29] text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2"
          >
            <Save size={18} /> {t('saveAll')}
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-xl font-bold">{t('whatsappGroups')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1 text-right">
              <label className="text-xs uppercase font-bold text-[#94A3B8]">{t('menGroupLink')}</label>
              <input
                type="url"
                value={whatsappGroupsData.men || ''}
                onChange={e => setWhatsappGroupsData({...whatsappGroupsData, men: e.target.value})}
                className="w-full bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] p-3 rounded-xl focus:border-[#ff5708] outline-none text-white text-right"
                placeholder="https://chat.whatsapp.com/..."
              />
            </div>
            <div className="space-y-1 text-right">
              <label className="text-xs uppercase font-bold text-[#94A3B8]">{t('womenGroupLink')}</label>
              <input
                type="url"
                value={whatsappGroupsData.women || ''}
                onChange={e => setWhatsappGroupsData({...whatsappGroupsData, women: e.target.value})}
                className="w-full bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] p-3 rounded-xl focus:border-[#ff5708] outline-none text-white text-right"
                placeholder="https://chat.whatsapp.com/..."
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-bold">{t('socialMediaLinks')}</h3>
          {Array.isArray(socialLinksData) && socialLinksData.map((link, index) => (
            <div key={index} className="bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] p-4 rounded-xl space-y-3">
              <div className="space-y-1 text-right">
                <label className="text-xs uppercase font-bold text-[#94A3B8]">{t('label')}</label>
                <input
                  type="text"
                  value={link.label || ''}
                  onChange={e => {
                    const newLinks = [...socialLinksData];
                    newLinks[index] = { ...link, label: e.target.value };
                    setSocialLinksData(newLinks);
                  }}
                  className="w-full bg-[#121218] border border-[rgba(255,255,255,0.08)] p-3 rounded-lg focus:border-[#ff5708] outline-none text-white text-right"
                  placeholder="Instagram, Facebook, etc."
                />
              </div>
              <div className="space-y-1 text-right">
                <label className="text-xs uppercase font-bold text-[#94A3B8]">{t('urlLink')}</label>
                <input
                  type="text"
                  value={link.url}
                  onChange={e => {
                    const newLinks = [...socialLinksData];
                    newLinks[index] = { ...link, url: e.target.value };
                    setSocialLinksData(newLinks);
                  }}
                  className="w-full bg-[#121218] border border-[rgba(255,255,255,0.08)] p-3 rounded-lg focus:border-[#ff5708] outline-none text-white text-right"
                  placeholder="https://..."
                />
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4 border-t border-[rgba(255,255,255,0.08)] pt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">{t('admin.telegramSettings')}</h3>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  const dataStr = JSON.stringify(telegramSettings, null, 2);
                  const dataBlob = new Blob([dataStr], { type: 'application/json' });
                  const url = URL.createObjectURL(dataBlob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = 'telegram-settings.json';
                  link.click();
                  URL.revokeObjectURL(url);
                  showSaved();
                }}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2"
              >
                <Download size={16} /> {t('admin.exportJson')}
              </button>
              <button
                onClick={() => setShowTelegramForm(!showTelegramForm)}
                className="bg-[#ff5708] hover:bg-[#ff7a29] text-white px-4 py-2 rounded-xl font-bold text-sm"
              >
                {showTelegramForm ? t('admin.cancel') : t('admin.manageSettings')}
              </button>
            </div>
          </div>
          {showTelegramForm && isMultiBotMode && (
            <div className="bg-amber-900/30 border border-amber-600/50 text-amber-200 text-sm rounded-xl p-3">
              ⚠️ מוגדרים כבר בוטים בטאב "טלגרם" (מערכת רב-בוטים) — המסך הזה לא פעיל יותר ולא משפיע על שליחת הודעות. יש לנהל את ההגדרות בטאב "טלגרם".
            </div>
          )}
          {showTelegramForm && (
            <form onSubmit={handleSaveTelegramSettings} className="space-y-4">
              <div>
                <label className="text-xs uppercase font-bold text-[#94A3B8]">Bot Token</label>
                <input
                  type="text"
                  value={telegramSettings.botToken || ''}
                  onChange={handleBotTokenChange}
                  className="w-full bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] p-3 rounded-xl focus:border-[#ff5708] outline-none text-white text-right"
                  placeholder="Enter Bot Token from @BotFather"
                />
                {botInfo && (
                  <div className="mt-2 p-3 bg-green-900/20 border border-green-600/30 rounded-xl">
                    <p className="text-green-400 font-bold">✅ {t('admin.botIdentified')}</p>
                    <p className="text-white">{t('admin.botName')} {botInfo.first_name} {botInfo.last_name || ''}</p>
                    <p className="text-white">{t('admin.botUsername')} @{botInfo.username}</p>
                    <div className="mt-2 p-2 bg-yellow-900/20 border border-yellow-600/30 rounded text-xs text-yellow-300">
                      <strong>{t('admin.howUsersStartBot')}</strong>
                      <div className="mt-1 whitespace-pre-line">
                        {`1. פתחו טלגרם וחפשו: @${botInfo.username}\n2. לחצו על "Start" או שלחו /start\n3. עכשיו תוכלו לקבל הודעות מהבוט\n\nקישור ישיר: https://t.me/${botInfo.username}`}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs uppercase font-bold text-[#94A3B8]">Chat ID</label>
                <input
                  type="text"
                  value={telegramSettings.chatId || ''}
                  onChange={(e) => setTelegramSettings({ ...telegramSettings, chatId: e.target.value })}
                  className="w-full bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] p-3 rounded-xl focus:border-[#ff5708] outline-none text-white text-right"
                  placeholder="Enter Chat ID (number or @username)"
                />
                <p className="text-[#94A3B8] text-xs mt-1">
                  הזן את ה-Chat ID של הצ'אט שבו תרצה לקבל התראות (למשל: -1001234567890 או @username)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={telegramSettings.enabled}
                  onChange={(e) => setTelegramSettings({ ...telegramSettings, enabled: e.target.checked })}
                  className="w-5 h-5"
                />
                <label>{t('admin.enableTelegramNotifications')}</label>
              </div>
              <button type="submit" className="bg-[#ff5708] hover:bg-[#ff7a29] text-white px-6 py-2 rounded-xl font-bold">
                {t('save') || 'שמור'}
              </button>
            </form>
          )}
          <label className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 cursor-pointer inline-block">
            <UploadIcon size={16} /> {t('admin.importJson')}
            <input 
              type="file" 
              accept=".json" 
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = async (event) => {
                    try {
                      const parsed = JSON.parse(event.target.result);
                      setTelegramSettings(parsed);
                      await updateTelegramSettings(parsed);
                      showSaved();
                    } catch (error) {
                      alert(t('admin.errorImportingJson'));
                    }
                  };
                  reader.readAsText(file);
                }
              }} 
              className="hidden" 
            />
          </label>
        </div>
      </div>
    </div>
  );
};

export default LinksSection;

