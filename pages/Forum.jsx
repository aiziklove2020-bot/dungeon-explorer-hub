import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Clock, LogIn, LogOut, Sparkles, User, Search } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useForumAuth } from '../context/ForumAuthContext';
import { getVisibleForumSections, getTopicsBySection } from '../firebase/forum';
import { countUnreadTopics } from '../utils/forumReadState';
import ForumLoginModal from '../components/forum/ForumLoginModal';
import Loader from '../components/Loader';
import SEO from '../components/SEO';
import './Forum.css';

import { formatDateTime as formatDate } from '../utils/dateFormat';

const Forum = () => {
  const { t } = useLanguage();
  const { forumUser, forumLogout } = useForumAuth();
  const navigate = useNavigate();
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [sectionUnread, setSectionUnread] = useState({});
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    getVisibleForumSections().then(s => { setSections(s); setLoading(false); });
  }, []);

  useEffect(() => {
    if (!forumUser?.id || sections.length === 0) {
      setSectionUnread({});
      return;
    }
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        sections.map(async (s) => {
          const tops = await getTopicsBySection(s.id);
          return [s.id, countUnreadTopics(tops, forumUser.id)];
        })
      );
      if (!cancelled) setSectionUnread(Object.fromEntries(entries));
    })();
    return () => { cancelled = true; };
  }, [sections, forumUser?.id]);

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections;
    const q = searchQuery.trim().toLowerCase();
    return sections.filter(s => s.title?.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q));
  }, [sections, searchQuery]);

  return (
    <div className="forum-page container mx-auto px-4 max-w-4xl py-8 md:py-12">
      <SEO title={t('forum.title') || 'פורום'} />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h1 className="text-3xl md:text-4xl font-black text-white">
          {t('forum.title') || 'פורום'}
        </h1>
        <div className="flex items-center gap-3">
          {forumUser ? (
            <>
              <span
                className="text-zinc-400 text-sm cursor-pointer hover:text-pink-300 transition-colors"
                onClick={() => navigate(`/profile/${forumUser.id}`)}
                title={t('profile.editProfile') || 'ערוך פרופיל'}
              >
                <User size={14} className="inline mr-1" />
                {t('forum.yourNickname') || 'הכינוי שלך'}: <span className="text-white font-bold">{forumUser.nickname}</span>
              </span>
              <button
                onClick={forumLogout}
                className="flex items-center gap-1 text-zinc-400 hover:text-white text-sm transition-colors"
              >
                <LogOut size={14} />
                {t('forum.logout') || 'התנתק'}
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowLogin(true)}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-xl font-bold text-sm transition-colors"
            >
              <LogIn size={16} />
              {t('forum.loginRegister') || 'התחברות / הרשמה'}
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      {!loading && sections.length > 0 && (
        <div className="relative mb-4">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t('search.searchForum') || 'חיפוש בפורום...'}
            className="w-full bg-black/40 border border-zinc-700 text-white text-sm pr-9 pl-3 py-2 rounded-xl focus:border-red-600 outline-none text-right"
          />
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader /></div>
      ) : filteredSections.length === 0 ? (
        <div className="text-center py-16 text-zinc-500">
          <MessageSquare size={48} className="mx-auto mb-4 opacity-30" />
          <p>{searchQuery.trim() ? (t('search.noResults') || 'לא נמצאו תוצאות') : (t('forum.noSections') || 'אין מדורים בפורום עדיין')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSections.map(section => {
            const unreadN = sectionUnread[section.id] || 0;
            return (
            <button
              key={section.id}
              onClick={() => navigate(`/forum/${section.id}`)}
              className={`forum-section-card w-full text-right backdrop-blur rounded-xl p-5 transition-all group border ${unreadN > 0 ? 'bg-zinc-900/80 border-amber-600/40 ring-1 ring-amber-600/15' : 'bg-zinc-900/60 border-zinc-800 hover:border-red-600/50'}`}
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg md:text-xl font-bold text-white group-hover:text-red-400 transition-colors">
                      {section.title}
                    </h2>
                    {forumUser && unreadN > 0 && (
                      <span className="flex items-center gap-1 text-[11px] font-bold bg-amber-600 text-white px-2 py-0.5 rounded-full">
                        <Sparkles size={12} />
                        {unreadN} {t('forum.unreadTopicsInSection') || 'לא נקראו'}
                      </span>
                    )}
                  </div>
                  {section.description && (
                    <p className="text-zinc-400 text-sm mt-1 line-clamp-2">{section.description}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 text-zinc-500 text-xs shrink-0">
                  <div className="flex items-center gap-1">
                    <MessageSquare size={14} />
                    <span>{section.topicCount || 0} {t('forum.topics') || 'נושאים'}</span>
                  </div>
                  {section.lastTopicAt && (
                    <div className="flex items-center gap-1">
                      <Clock size={12} />
                      <span>{formatDate(section.lastTopicAt)}</span>
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
          })}
        </div>
      )}

      <ForumLoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} />
    </div>
  );
};

export default Forum;
