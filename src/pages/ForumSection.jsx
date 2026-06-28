import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MessageSquare, Pin, Lock, Heart, Clock, ChevronRight, Plus, Sparkles, Search } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useForumAuth } from '../context/ForumAuthContext';
import {
  getForumSectionById,
  getTopicsBySection,
  createTopic
} from '../firebase/forum';
import { getForumUsersByIds } from '../firebase/forumUsers';
import ForumPostEditor from '../components/forum/ForumPostEditor';
import ForumLoginModal from '../components/forum/ForumLoginModal';
import AuthorLink from '../components/forum/AuthorLink';
import TagInput from '../components/forum/TagInput';
import PollEditor from '../components/forum/PollEditor';
import Loader from '../components/Loader';
import SEO from '../components/SEO';
import './Forum.css';
import { isTopicUnread, getTopicReadMap } from '../utils/forumReadState';
import { isHtmlContentEmpty } from '../utils/htmlContent';
import { useDraft } from '../hooks/useDraft';

import { formatDateTime as formatDate } from '../utils/dateFormat';

const ForumSection = () => {
  const { sectionId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { forumUser } = useForumAuth();

  const [section, setSection] = useState(null);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewTopic, setShowNewTopic] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newImages, setNewImages] = useState([]);
  const [newTags, setNewTags] = useState([]);
  const [newPoll, setNewPoll] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [tagFilter, setTagFilter] = useState('');
  const [authorProfiles, setAuthorProfiles] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState('activity');

  const draft = useDraft(`forum_topic_${sectionId}`);
  const [draftRestored, setDraftRestored] = useState(false);
  const canPost = forumUser && !forumUser.isBlocked;

  useEffect(() => {
    const load = async () => {
      const [sec, tops] = await Promise.all([
        getForumSectionById(sectionId),
        getTopicsBySection(sectionId)
      ]);
      setSection(sec);
      setTopics(tops);
      setLoading(false);

      const ids = tops.map(t => t.authorId).filter(Boolean);
      if (ids.length) getForumUsersByIds(ids).then(setAuthorProfiles).catch(() => {});
    };
    load();
  }, [sectionId]);

  useEffect(() => {
    if (showNewTopic && !draftRestored) {
      const saved = draft.loadDraft();
      if (saved) {
        if (saved.title) setNewTitle(saved.title);
        if (saved.content) setNewContent(saved.content);
        if (saved.tags) setNewTags(saved.tags);
        setDraftRestored(true);
      }
    }
  }, [showNewTopic, draftRestored, draft]);

  useEffect(() => {
    if (showNewTopic) draft.saveDraft({ title: newTitle, content: newContent, tags: newTags });
  }, [newTitle, newContent, newTags, showNewTopic, draft]);

  const handleSubmitTopic = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || isHtmlContentEmpty(newContent) || !forumUser) return;
    setSubmitting(true);
    try {
      const topicData = {
        sectionId,
        title: newTitle.trim(),
        content: newContent,
        images: newImages,
        tags: newTags,
        authorId: forumUser.id,
        authorName: forumUser.nickname
      };
      if (newPoll?.question?.trim() && newPoll.options?.filter(o => o.trim()).length >= 2) {
        topicData.poll = { question: newPoll.question.trim(), options: newPoll.options.filter(o => o.trim()), votes: {} };
      }
      await createTopic(topicData);
      setNewTitle('');
      setNewContent('');
      setNewImages([]);
      setNewTags([]);
      setNewPoll(null);
      setShowNewTopic(false);
      draft.clearDraft();
      setDraftRestored(false);
      const tops = await getTopicsBySection(sectionId);
      setTopics(tops);
      const ids = tops.map(t => t.authorId).filter(Boolean);
      if (ids.length) getForumUsersByIds(ids).then(setAuthorProfiles).catch(() => {});
    } catch (err) {
      alert(err.message || 'שגיאה');
    } finally {
      setSubmitting(false);
    }
  };

  const allTags = useMemo(() => {
    const set = new Set();
    topics.forEach(t => (t.tags || []).forEach(tag => set.add(tag)));
    return [...set].sort();
  }, [topics]);

  const processedTopics = useMemo(() => {
    let result = [...topics];
    if (tagFilter) result = result.filter(t => (t.tags || []).includes(tagFilter));
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(t => t.title?.toLowerCase().includes(q) || t.content?.toLowerCase().includes(q) || t.authorName?.toLowerCase().includes(q));
    }
    const activitySec = (t) => Math.max(t.createdAt?.seconds || 0, t.lastReplyAt?.seconds || 0);
    if (sortMode === 'newest') {
      result.sort((a, b) => { if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1; return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0); });
    } else if (sortMode === 'likes') {
      result.sort((a, b) => { if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1; return (b.likeCount || 0) - (a.likeCount || 0); });
    } else if (sortMode === 'replies') {
      result.sort((a, b) => { if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1; return (b.replyCount || 0) - (a.replyCount || 0); });
    } else {
      result.sort((a, b) => { if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1; return activitySec(b) - activitySec(a); });
    }
    return result;
  }, [topics, searchQuery, sortMode, tagFilter]);

  if (loading) return <div className="flex justify-center py-16"><Loader /></div>;
  if (!section) return <div className="text-center py-16 text-zinc-500">{t('forum.sectionNotFound') || 'המדור לא נמצא'}</div>;

  return (
    <div className="forum-page container mx-auto px-4 max-w-4xl py-8 md:py-12">
      <SEO
        title={`${section.title} | פורום מדברים BDSM`}
        description={section.description || `מדור ${section.title} בפורום מדברים BDSM - דיונים, שאלות וטיפים בקהילה.`}
        canonicalPath={`/forum/${section.id}`}
      />

      <div className="forum-breadcrumb flex items-center gap-2 mb-6 text-sm flex-wrap">
        <button onClick={() => navigate('/forum')} className="hover:text-white text-zinc-400">{t('forum.title') || 'פורום'}</button>
        <ChevronRight size={14} className="text-zinc-600" />
        <span className="text-white font-bold">{section.title}</span>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white">{section.title}</h1>
          {section.description && <p className="text-zinc-400 text-sm mt-1">{section.description}</p>}
        </div>
        {canPost ? (
          <button
            onClick={() => setShowNewTopic(!showNewTopic)}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-xl font-bold text-sm transition-colors"
          >
            <Plus size={16} />
            {t('forum.newTopic') || 'נושא חדש'}
          </button>
        ) : !forumUser ? (
          <button
            onClick={() => setShowLogin(true)}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-xl font-bold text-sm transition-colors"
          >
            {t('forum.loginToPost') || 'התחבר כדי לפרסם'}
          </button>
        ) : null}
      </div>

      {/* Search & Sort */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t('search.searchForum') || 'חיפוש בפורום...'}
            className="w-full bg-black/40 border border-zinc-700 text-white text-sm pr-9 pl-3 py-2 rounded-xl focus:border-red-600 outline-none text-right"
          />
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {[
            { key: 'activity', label: t('forum.sortLatestActivity') || 'פעילות אחרונה' },
            { key: 'newest', label: t('forum.sortNewest') || 'חדש ביותר' },
            { key: 'likes', label: t('forum.sortMostLiked') || 'הכי אהוב' },
            { key: 'replies', label: t('forum.sortMostReplies') || 'הכי מגיב' },
          ].map(s => (
            <button
              key={s.key}
              type="button"
              onClick={() => setSortMode(s.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors min-h-[36px] ${sortMode === s.key ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tag filter */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mb-4">
          <span className="text-zinc-500 text-xs font-bold">{t('forum.filterByTag') || 'סינון לפי תגית'}:</span>
          <button type="button" onClick={() => setTagFilter('')} className={`px-3 py-1.5 rounded-lg text-xs font-bold min-h-[36px] ${!tagFilter ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>
            {t('forum.allTags') || 'הכל'}
          </button>
          {allTags.map(tag => (
            <button key={tag} type="button" onClick={() => setTagFilter(tag)} className={`px-3 py-1.5 rounded-lg text-xs font-bold min-h-[36px] ${tagFilter === tag ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>
              {tag}
            </button>
          ))}
        </div>
      )}

      {forumUser?.isBlocked && (
        <div className="bg-red-900/30 border border-red-800 rounded-xl p-4 mb-6 text-center text-red-200 text-sm">
          {t('forum.blockedMessage') || 'המשתמש שלך חסום ולא ניתן לפרסם בפורום'}
        </div>
      )}

      {showNewTopic && (
        <form onSubmit={handleSubmitTopic} className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 mb-6 space-y-4">
          <h3 className="text-lg font-bold text-white">{t('forum.createTopic') || 'יצירת נושא חדש'}</h3>
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder={t('forum.topicTitlePlaceholder') || 'כותרת הנושא'}
            className="w-full bg-black/40 border border-zinc-700 text-white text-sm p-3 rounded-xl focus:border-red-600 outline-none text-right"
            required
            maxLength={150}
          />
          <ForumPostEditor
            content={newContent}
            onContentChange={setNewContent}
            images={newImages}
            onImagesChange={setNewImages}
            placeholder={t('forum.topicContentPlaceholder') || 'תוכן הנושא...'}
          />
          <div>
            <label className="text-zinc-400 text-xs font-bold mb-1 block">{t('forum.addTag') || 'הוסף תגית'}</label>
            <TagInput tags={newTags} onChange={setNewTags} />
          </div>
          {newPoll ? (
            <PollEditor poll={newPoll} onChange={setNewPoll} onRemove={() => setNewPoll(null)} />
          ) : (
            <button type="button" onClick={() => setNewPoll({ question: '', options: ['', ''], votes: {} })} className="flex items-center gap-1 text-purple-400 hover:text-purple-300 text-sm">
              <span>📊</span> {t('poll.addPoll') || 'הוסף סקר'}
            </button>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting || !newTitle.trim() || isHtmlContentEmpty(newContent)}
              className="bg-red-600 hover:bg-red-500 disabled:bg-zinc-700 text-white px-6 py-2 rounded-xl font-bold text-sm transition-colors"
            >
              {submitting ? (t('forum.publishing') || 'מפרסם...') : (t('forum.publish') || 'פרסם')}
            </button>
            <button
              type="button"
              onClick={() => setShowNewTopic(false)}
              className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-xl font-bold text-sm"
            >
              {t('cancel') || 'ביטול'}
            </button>
          </div>
        </form>
      )}

      {processedTopics.length === 0 ? (
        <div className="text-center py-16 text-zinc-500">
          <MessageSquare size={48} className="mx-auto mb-4 opacity-30" />
          <p>{searchQuery.trim() ? (t('search.noResults') || 'לא נמצאו תוצאות') : (t('forum.noTopics') || 'אין נושאים במדור זה עדיין')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(() => {
            const readMap = forumUser ? getTopicReadMap(forumUser.id) : {};
            return processedTopics.map(topic => {
            const unread = forumUser && isTopicUnread(topic, forumUser.id);
            const everRead = readMap[topic.id] != null;
            return (
            <button
              key={topic.id}
              onClick={() => navigate(`/forum/${sectionId}/${topic.id}`)}
              className={`forum-post-card w-full text-right rounded-xl p-4 transition-all border ${unread ? 'bg-zinc-900/70 border-amber-600/50 ring-1 ring-amber-600/20' : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-600'}`}
            >
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {topic.isPinned && <Pin size={14} className="text-yellow-400 shrink-0" />}
                    {topic.isLocked && <Lock size={14} className="text-zinc-500 shrink-0" />}
                    {unread && (
                      <span className="flex items-center gap-1 text-[10px] font-bold bg-amber-600 text-white px-1.5 py-0.5 rounded shrink-0">
                        <Sparkles size={10} />
                        {everRead
                          ? (t('forum.unreadNewReplies') || 'תגובות חדשות')
                          : (t('forum.unreadTopic') || 'לא נקרא')}
                      </span>
                    )}
                    <h3 className="font-bold text-white truncate">{topic.title}</h3>
                  </div>
                  {topic.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-1">
                      {topic.tags.map((tag, i) => (
                        <span key={i} className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-medium">{tag}</span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-zinc-500 text-xs">
                    <AuthorLink authorId={topic.authorId} authorName={topic.authorName} shortBio={authorProfiles[topic.authorId]?.shortBio} />
                    <span>&middot;</span>
                    <span>{formatDate(topic.createdAt)}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 text-zinc-500 text-xs shrink-0">
                  <div className="flex items-center gap-1">
                    <MessageSquare size={12} />
                    <span>{topic.replyCount || 0}</span>
                  </div>
                  {topic.likeCount > 0 && (
                    <div className="flex items-center gap-1">
                      <Heart size={12} />
                      <span>{topic.likeCount}</span>
                    </div>
                  )}
                  {topic.lastReplyAt && (
                    <div className="flex items-center gap-1 mt-1">
                      <Clock size={11} />
                      <span className="text-[11px]">{topic.lastReplyAuthorName}</span>
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
            });
          })()}
        </div>
      )}

      <ForumLoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} />
    </div>
  );
};

export default ForumSection;
