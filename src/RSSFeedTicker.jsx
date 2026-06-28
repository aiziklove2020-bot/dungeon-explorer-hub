import { useRef, useState, useEffect } from 'react';
import { Pause, Play } from 'lucide-react';
import { useContent } from '../context/ContentContext';
import { useLanguage } from '../i18n/LanguageContext';
import { getRssTickerSettings } from '../firebase/settings';
import './RSSFeedTicker.css';

const RSS_CACHE_KEY = 'tbdsm_rss_feeds_cache';

const RSSFeedTicker = () => {
  const { content } = useContent();
  const { t } = useLanguage();
  const [paused, setPaused] = useState(false);
  const [cachedFeeds, setCachedFeeds] = useState(() => {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    try {
      const raw = window.localStorage.getItem(RSS_CACHE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const liveFeeds = Array.isArray(content.rssFeeds) ? content.rssFeeds : [];
  const feeds = liveFeeds.length > 0 ? liveFeeds : cachedFeeds;
  const tickerRef = useRef(null);
  const [tickerSettings, setTickerSettings] = useState({ speed: 60 });

  const loadTickerSettings = () => {
    getRssTickerSettings().then(s => setTickerSettings(s || { speed: 60 }));
  };

  useEffect(() => {
    loadTickerSettings();
  }, []);

  useEffect(() => {
    if (!Array.isArray(liveFeeds) || liveFeeds.length === 0) return;
    setCachedFeeds(liveFeeds);
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      window.localStorage.setItem(RSS_CACHE_KEY, JSON.stringify(liveFeeds));
    } catch (err) {
      // localStorage may be full or disabled (private mode); cached in memory only.
      console.warn('RSSFeedTicker: failed to persist feed cache:', err);
    }
  }, [liveFeeds]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') loadTickerSettings();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  if (feeds.length === 0) {
    return null;
  }

  const duplicatedFeeds = [...feeds, ...feeds, ...feeds, ...feeds];
  const durationSec = Math.max(10, Math.min(300, Number(tickerSettings.speed) || 60));

  return (
    <div className="rss-ticker">
      <div className="rss-ticker-container">
        <button
          type="button"
          className="rss-ticker-toggle"
          onClick={() => setPaused((prev) => !prev)}
          aria-label={paused ? (t('a11y.playTicker') || 'נגן מהדורת חדשות') : (t('a11y.pauseTicker') || 'השהה מהדורת חדשות')}
          aria-pressed={paused}
          title={paused ? (t('a11y.playTicker') || 'נגן') : (t('a11y.pauseTicker') || 'השהה')}
        >
          {paused ? <Play size={14} aria-hidden="true" /> : <Pause size={14} aria-hidden="true" />}
        </button>
        <div className="rss-ticker-wrapper" ref={tickerRef}>
          <div
            className="rss-ticker-scroll"
            style={{
              animationDuration: `${durationSec}s`,
              animationPlayState: paused ? 'paused' : 'running',
            }}
          >
            {duplicatedFeeds.map((feed, index) => (
              <div key={`${feed.id}-${index}`} className="rss-feed-item">
                <span className="rss-feed-text">{feed.text}</span>
                <span className="rss-feed-separator" aria-hidden="true">•</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RSSFeedTicker;

