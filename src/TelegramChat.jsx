import { useState } from 'react';
import { X, MessageCircle, Send } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import './TelegramChat.css';

const TelegramChat = ({ botUsername, enabled = true }) => {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const handleDirectChat = () => {
    if (botUsername) {
      const cleanUsername = botUsername.replace('@', '');
      
      window.open(`https://t.me/${cleanUsername}`, '_blank');
    }
  };

  if (!enabled || !botUsername) {
    return null;
  }

  return (
    <>
      
      <button
        className={`telegram-chat-button ${isOpen ? 'hidden' : ''}`}
        onClick={() => setIsOpen(true)}
        aria-label={t('telegramChat.openChat')}
      >
        <MessageCircle size={24} />
        <span className="telegram-chat-button-pulse"></span>
      </button>

      {isOpen && (
        <div className={`telegram-chat-window ${isMinimized ? 'minimized' : ''}`}>
          
          <div className="telegram-chat-header">
            <div className="telegram-chat-header-content">
              <div className="telegram-chat-header-icon">
                <MessageCircle size={20} />
              </div>
              <div className="telegram-chat-header-text">
                <h3>{t('telegramChat.title')}</h3>
                <p>{t('telegramChat.subtitle')}</p>
              </div>
            </div>
            <div className="telegram-chat-header-actions">
              <button
                className="telegram-chat-minimize"
                onClick={() => setIsMinimized(!isMinimized)}
                aria-label={t('telegramChat.minimize')}
              >
                <span>−</span>
              </button>
              <button
                className="telegram-chat-close"
                onClick={() => {
                  setIsOpen(false);
                  setIsMinimized(false);
                }}
                aria-label={t('telegramChat.close')}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <div className="telegram-chat-content">
              <div className="telegram-chat-widget-container">
                <div className="telegram-chat-fallback">
                  <div className="telegram-chat-fallback-icon">
                    <MessageCircle size={48} />
                  </div>
                  <h4>{t('telegramChat.startChatting')}</h4>
                  <p className="telegram-chat-fallback-subtitle">
                    {t('telegramChat.clickToOpen')}
                  </p>
                  <button
                    className="telegram-chat-direct-button"
                    onClick={handleDirectChat}
                  >
                    <Send size={18} />
                    <span>{t('telegramChat.openButton')}</span>
                  </button>
                  <p className="telegram-chat-fallback-note">
                    {t('telegramChat.downloadNote')} <a href="https://telegram.org/apps" target="_blank" rel="noopener noreferrer">{t('telegramChat.downloadLink')}</a>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default TelegramChat;

