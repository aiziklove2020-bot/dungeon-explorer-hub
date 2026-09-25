import { useState, useEffect } from 'react';
import { RotateCcw, Plus, Trash2 } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useContent } from '../../context/ContentContext';
import { getRssFeeds, addRssFeed, updateRssFeed, deleteRssFeed, getRssTickerSettings, updateRssTickerSettings } from '../../firebase/settings';
import { invalidateCache } from '../../firebase/dataAccess';
import useAdminSection from '../../hooks/useAdminSection';
import AdminLoader from './AdminLoader';

const RssSection = ({ showSaved }) => {
  const { t } = useLanguage();
  const { reloadContent } = useContent();
  const { data: rssFeeds, loading, reload: loadRssFeeds } = useAdminSection(getRssFeeds);
  const feeds = rssFeeds || [];
  const [editingRssFeed, setEditingRssFeed] = useState(null);
  const [rssFeedForm, setRssFeedForm] = useState({ text: '', enabled: true, order: 0 });
  const [tickerSpeed, setTickerSpeed] = useState(60);
  const [tickerSpeedSaving, setTickerSpeedSaving] = useState(false);

  const loadTickerSettings = () => {
    getRssTickerSettings().then(s => setTickerSpeed(Math.max(10, Math.min(300, Number(s?.speed) || 60))));
  };

  useEffect(() => {
    loadTickerSettings();
  }, []);

  const saveTickerSpeed = async () => {
    const speed = Math.max(10, Math.min(300, tickerSpeed));
    setTickerSpeedSaving(true);
    try {
      await updateRssTickerSettings({ speed });
      await invalidateCache('rssTickerSettings');
      setTickerSpeed(speed);
      showSaved();
    } catch (err) {
      alert(`${t('admin.errorSavingFeed')}: ${err.message}`);
    } finally {
      setTickerSpeedSaving(false);
    }
  };

  return (
    <div className="bg-[#121218] backdrop-blur-2xl border border-white/5 p-6 rounded-2xl space-y-6">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold">{t('admin.rssFeedsManagement')}</h2>
          <span className="px-2.5 py-1 rounded-full bg-[#1f1f23] text-[#94A3B8] text-xs font-bold">
            {feeds.filter(f => f.enabled).length} פעילים מתוך {feeds.length}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              await invalidateCache('rssFeeds');
              loadRssFeeds();
              reloadContent();
            }}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2"
          >
            <RotateCcw size={16} /> {t('admin.refresh')}
          </button>
          {!editingRssFeed && (
            <button
              onClick={() => {
                // feeds.length collides with an existing feed's order once
                // any feed has ever been deleted (e.g. orders 0,1,3 after
                // deleting order=2 — feeds.length is 3, tying the new feed
                // with the existing order=3 one), making manual reordering
                // unpredictable. Base it on the highest order actually in
                // use instead.
                const nextOrder = feeds.reduce((max, f) => Math.max(max, f.order || 0), -1) + 1;
                setEditingRssFeed({ id: null, text: '', enabled: true, order: nextOrder });
                setRssFeedForm({ text: '', enabled: true, order: nextOrder });
              }}
              className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2"
            >
              <Plus size={18} /> {t('admin.addNewFeed')}
            </button>
          )}
        </div>
      </div>

      <div className="bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] p-4 rounded-xl">
        <h3 className="text-lg font-bold mb-2">{t('admin.rssTickerSpeed')}</h3>
        <p className="text-[#a9a9b2] text-sm mb-3">{t('admin.rssTickerSpeedDescription')}</p>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="number"
            min={10}
            max={300}
            value={tickerSpeed}
            onChange={e => setTickerSpeed(parseInt(e.target.value, 10) || 60)}
            className="w-24 bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] p-2 rounded-xl focus:border-[#ff5708] outline-none text-white text-right"
          />
          <span className="text-[#94A3B8] text-sm">{t('admin.rssSpeedSeconds')}</span>
          <button
            onClick={saveTickerSpeed}
            disabled={tickerSpeedSaving}
            className="bg-[#ff5708] hover:bg-[#ff7a29] disabled:opacity-50 text-white px-4 py-2 rounded-xl font-bold"
          >
            {tickerSpeedSaving ? t('admin.saving') : t('admin.save')}
          </button>
        </div>
      </div>

      {editingRssFeed ? (
        <div className="bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] p-4 rounded-xl">
          <h3 className="text-lg font-bold mb-4">
            {editingRssFeed.id ? t('admin.editFeed') : t('admin.addNewFeed')}
          </h3>
          <div className="space-y-4">
            <div className="space-y-1 text-right">
              <label className="text-xs uppercase font-bold text-[#94A3B8]">{t('admin.text')} *</label>
              <textarea
                value={rssFeedForm.text}
                onChange={e => setRssFeedForm({ ...rssFeedForm, text: e.target.value })}
                rows={4}
                className="w-full bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] p-3 rounded-xl focus:border-[#ff5708] outline-none text-white text-right"
                placeholder={t('admin.enterRssText')}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1 text-right">
                <label className="text-xs uppercase font-bold text-[#94A3B8]">{t('admin.order')}</label>
                <input
                  type="number"
                  value={rssFeedForm.order}
                  onChange={e => setRssFeedForm({ ...rssFeedForm, order: parseInt(e.target.value) || 0 })}
                  className="w-full bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] p-3 rounded-xl focus:border-[#ff5708] outline-none text-white text-right"
                  min="0"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={rssFeedForm.enabled}
                  onChange={e => setRssFeedForm({ ...rssFeedForm, enabled: e.target.checked })}
                  className="w-5 h-5"
                />
                <label>{t('admin.enabled')}</label>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  try {
                    if (!rssFeedForm.text.trim()) {
                      alert(t('admin.pleaseEnterText'));
                      return;
                    }
                    if (editingRssFeed.id) {
                      await updateRssFeed(editingRssFeed.id, rssFeedForm);
                    } else {
                      await addRssFeed(rssFeedForm);
                    }
                    setEditingRssFeed(null);
                    setRssFeedForm({ text: '', enabled: true, order: 0 });
                    loadRssFeeds();
                    showSaved();
                  } catch (error) {
                    alert(`${t('admin.errorSavingFeed')}: ${error.message}`);
                  }
                }}
                className="bg-[#ff5708] hover:bg-[#ff7a29] text-white px-6 py-2 rounded-xl font-bold"
              >
                {t('admin.save')}
              </button>
              <button
                onClick={() => {
                  setEditingRssFeed(null);
                  setRssFeedForm({ text: '', enabled: true, order: 0 });
                }}
                className="bg-[#1f1f23] hover:bg-[#2a292e] text-white px-6 py-2 rounded-xl font-bold"
              >
                {t('admin.cancel')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {loading ? (
        <AdminLoader />
      ) : feeds.length === 0 ? (
        <div className="text-center py-12 text-[#94A3B8]">
          <p>{t('admin.noRssFeeds')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {feeds.map(feed => (
            <div key={feed.id} className="bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] p-4 rounded-xl">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${feed.enabled ? 'bg-green-600' : 'bg-[#353439]'}`}>
                      {feed.enabled ? t('admin.enabled') : t('admin.disabled')}
                    </span>
                    <span className="text-[#a9a9b2] text-xs">{t('admin.order')}: {feed.order || 0}</span>
                  </div>
                  <p className="text-white">{feed.text}</p>
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => {
                      setEditingRssFeed(feed);
                      setRssFeedForm({ text: feed.text, enabled: feed.enabled !== false, order: feed.order || 0 });
                    }}
                    className="bg-[#ff5708] hover:bg-[#ff7a29] text-white px-4 py-2 rounded-xl font-bold text-sm"
                  >
                    {t('admin.edit')}
                  </button>
                  <button
                    onClick={async () => {
                      if (window.confirm(t('admin.confirmDeleteFeed'))) {
                        try {
                          await deleteRssFeed(feed.id);
                          loadRssFeeds();
                          reloadContent();
                          showSaved();
                        } catch (error) {
                          alert(`${t('admin.errorDeletingFeed')}: ${error.message}`);
                        }
                      }
                    }}
                    className="bg-[#93000a]/60 hover:bg-[#93000a] text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RssSection;

