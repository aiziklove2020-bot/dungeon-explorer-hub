import { useState, useEffect, useId, useRef } from 'react';
import { X, MessageCircle, Send, Trash2 } from 'lucide-react';
import { useLanguage } from './i18n/LanguageContext';
import { getSupportChatSettings } from './firebase/settings';
import { sendSupportMessage, sendSupportToTelegram, subscribeToSupportMessages, fetchSupportMessages, getSessionId, deleteSupportChatSession } from './firebase/supportChat';
import './SupportChat.css';

const DISPLAY_NAME_KEY = 'support_chat_name';
const getStoredDisplayName = () => (typeof window !== 'undefined' ? localStorage.getItem(DISPLAY_NAME_KEY) || '' : '');

const SupportChat = ({ initialSettings = null }) => {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  // If initialSettings provided by parent (App.jsx), skip the lazy fetch
  const [enabled, setEnabled] = useState(initialSettings !== null ? (initialSettings?.enabled === true) : null);
  const [settings, setSettings] = useState(initialSettings);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [confirmedName, setConfirmedName] = useState(getStoredDisplayName);
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [deleting, setDeleting] = useState(false);
  const messagesEndRef = useRef(null);
  /** Synchronous guard — `sending` state updates too late to block double Enter / double click */
  const sendInFlightRef = useRef(false);
  const sessionId = getSessionId();
  // Track whether we've already loaded settings to avoid re-fetching
  const settingsLoadedRef = useRef(initialSettings !== null);
  const launcherRef = useRef(null);
  const panelRef = useRef(null);
  const nameInputRef = useRef(null);
  const messageInputRef = useRef(null);
  const titleId = useId();
  const nameInputId = useId();
  const messageInputId = useId();

  // Load settings lazily when the chat button is first clicked; returns whether enabled
  const loadSettingsOnce = async () => {
    if (settingsLoadedRef.current) return enabled;
    settingsLoadedRef.current = true;
    try {
      const s = await getSupportChatSettings();
      const isEnabled = s?.enabled === true;
      setEnabled(isEnabled);
      setSettings(s);
      return isEnabled;
    } catch {
      setEnabled(false);
      return false;
    }
  };

  // Real-time subscription + refresh when tab visible + polling fallback
  useEffect(() => {
    if (!enabled || !sessionId) return;
    const subRef = { current: null };
    const setup = () => {
      if (subRef.current) subRef.current();
      subRef.current = subscribeToSupportMessages(sessionId, setMessages);
    };
    const refresh = () => fetchSupportMessages(sessionId).then(setMessages).catch(() => {});
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refresh();
        setup();
      }
    };
    setup();
    document.addEventListener('visibilitychange', onVisibilityChange);
    const poll = setInterval(refresh, 15000);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      clearInterval(poll);
      if (subRef.current) subRef.current();
    };
  }, [enabled, sessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Move focus into the panel when it opens, and back to the launcher when it
  // closes (parity with native disclosure widgets).
  useEffect(() => {
    if (!isOpen) return undefined;
    const id = requestAnimationFrame(() => {
      const target = nameInputRef.current || messageInputRef.current || panelRef.current;
      target?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(id);
  }, [isOpen, isMinimized]);

  // Escape closes the panel — non-modal popover, no focus trap.
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setIsMinimized(false);
        launcherRef.current?.focus({ preventScroll: true });
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending || sendInFlightRef.current) return;
    sendInFlightRef.current = true;
    setSending(true);
    setError(null);
    try {
      await sendSupportMessage(text, sessionId);
      if (settings?.configured) {
        await sendSupportToTelegram(sessionId, text, confirmedName || null);
      }
      setInput('');
    } catch (err) {
      setError(err.message || t('supportChat.sendError'));
    } finally {
      sendInFlightRef.current = false;
      setSending(false);
    }
  };

  const hasName = (confirmedName || '').trim() !== '';

  const confirmAndSaveName = () => {
    const name = (displayNameInput || '').trim();
    if (!name) return;
    if (typeof window !== 'undefined') {
      localStorage.setItem(DISPLAY_NAME_KEY, name);
    }
    setConfirmedName(name);
    setDisplayNameInput(name);
  };

  const clearStoredName = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(DISPLAY_NAME_KEY);
    }
    setConfirmedName('');
    setDisplayNameInput('');
  };

  const handleDeleteChat = async () => {
    if (!window.confirm(t('supportChat.deleteConfirm') || 'למחוק את כל הודעות הצ\'אט?')) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteSupportChatSession(sessionId);
      setMessages([]);
      clearStoredName();
    } catch (err) {
      setError(err.message || t('supportChat.deleteError'));
    } finally {
      setDeleting(false);
    }
  };

  // Once settings are loaded and chat is explicitly disabled, hide completely
  if (enabled === false) return null;

  const handleChatOpen = async () => {
    const isEnabled = settingsLoadedRef.current ? enabled : await loadSettingsOnce();
    if (isEnabled) setIsOpen(true);
  };

  return (
    <>
      <button
        ref={launcherRef}
        type="button"
        className={`support-chat-button ${isOpen ? 'hidden' : ''}`}
        onClick={handleChatOpen}
        aria-label={t('supportChat.open')}
        aria-expanded={isOpen}
        aria-controls={isOpen ? titleId + '-panel' : undefined}
        tabIndex={isOpen ? -1 : 0}
        aria-hidden={isOpen ? 'true' : undefined}
      >
        <MessageCircle size={24} aria-hidden="true" />
        <span className="support-chat-button-pulse" aria-hidden="true"></span>
      </button>

      {isOpen && (
        <div
          ref={panelRef}
          id={titleId + '-panel'}
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
          tabIndex={-1}
          className={`support-chat-window ${isMinimized ? 'minimized' : ''}`}
        >
          {/* The equivalent @media rule in SupportChat.css kept getting
              dropped from the production CSS build (never reproduced why —
              same class of issue hit the RSS ticker keyframes and the
              overscroll-behavior rule), so it's inlined here to guarantee it
              ships: full-screen panel below 480px instead of the floating
              desktop-sized card. */}
          <style>{`
            @media (max-width: 480px) {
              .support-chat-window {
                width: 100vw !important;
                height: 100vh !important;
                max-width: 100vw !important;
                max-height: 100vh !important;
                top: 0 !important;
                bottom: 0 !important;
                right: 0 !important;
                left: 0 !important;
                border-radius: 0 !important;
              }
            }
          `}</style>
          <div className="support-chat-header">
            <div className="support-chat-header-content">
              <div className="support-chat-header-icon" aria-hidden="true">
                <MessageCircle size={20} />
              </div>
              <div className="support-chat-header-text">
                <h3 id={titleId}>{t('supportChat.title')}</h3>
                <p>{t('supportChat.subtitle')}</p>
              </div>
            </div>
            <div className="support-chat-header-actions">
              <button
                type="button"
                className="support-chat-delete"
                onClick={handleDeleteChat}
                disabled={deleting || messages.length === 0}
                aria-disabled={deleting || messages.length === 0}
                aria-label={t('supportChat.deleteChat')}
                title={t('supportChat.deleteChat')}
              >
                <Trash2 size={18} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="support-chat-minimize"
                onClick={() => setIsMinimized(!isMinimized)}
                aria-label={t('supportChat.minimize')}
                aria-expanded={!isMinimized}
              >
                <span aria-hidden="true">−</span>
              </button>
              <button
                type="button"
                className="support-chat-close"
                onClick={() => {
                  setIsOpen(false);
                  setIsMinimized(false);
                  launcherRef.current?.focus({ preventScroll: true });
                }}
                aria-label={t('supportChat.close')}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {!hasName ? (
                <div className="support-chat-name-gate">
                  <p className="support-chat-name-gate-title">{t('supportChat.nameRequiredTitle')}</p>
                  <label htmlFor={nameInputId} className="sr-only">
                    {t('supportChat.displayNamePlaceholder')}
                  </label>
                  <input
                    ref={nameInputRef}
                    id={nameInputId}
                    type="text"
                    value={displayNameInput}
                    onChange={(e) => setDisplayNameInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter' || e.nativeEvent.isComposing) return;
                      e.preventDefault();
                      confirmAndSaveName();
                    }}
                    placeholder={t('supportChat.displayNamePlaceholder')}
                    className="support-chat-name-input"
                    maxLength={80}
                  />
                  <button
                    type="button"
                    className="support-chat-start-btn"
                    onClick={confirmAndSaveName}
                    disabled={!displayNameInput.trim()}
                    aria-disabled={!displayNameInput.trim()}
                  >
                    {t('supportChat.startChat')}
                  </button>
                </div>
              ) : (
                <>
                  <div className="support-chat-name-badge">
                    {t('supportChat.chatAsName')}: <strong>{confirmedName.trim()}</strong>
                  </div>
                  <div
                    className="support-chat-messages"
                    role="log"
                    aria-live="polite"
                    aria-label={t('supportChat.title')}
                  >
                {messages.length === 0 && (
                  <div className="support-chat-empty">
                    {t('supportChat.welcome')}
                  </div>
                )}
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`support-chat-msg support-chat-msg--${m.role}`}
                  >
                    <span className="support-chat-msg-text">{m.text}</span>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              {error && <div className="support-chat-error" role="alert">{error}</div>}
              <div className="support-chat-input-row">
                <label htmlFor={messageInputId} className="sr-only">
                  {t('supportChat.placeholder')}
                </label>
                <input
                  ref={messageInputRef}
                  id={messageInputId}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return;
                    e.preventDefault();
                    handleSend();
                  }}
                  placeholder={t('supportChat.placeholder')}
                  disabled={sending}
                  className="support-chat-input"
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!input.trim() || sending}
                  aria-disabled={!input.trim() || sending}
                  className="support-chat-send"
                  aria-label={t('supportChat.send')}
                >
                  <Send size={18} aria-hidden="true" />
                </button>
              </div>
                </>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
};

export default SupportChat;
