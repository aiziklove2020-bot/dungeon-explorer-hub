import { useState, useEffect, useRef } from 'react';
import { markTopicRead, getTopicActivitySeconds } from '../utils/forumReadState';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronRight, Pin, Lock, Quote, Clock, Pencil, Trash2, Save, X } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useSiteAuth } from '../context/AuthContext';
import { useForumAuth } from '../context/ForumAuthContext';
import { createNotification } from '../firebase/notifications';
import { extractMentions } from '../utils/mentions';
import { getForumUserByNickname, getForumUsersByIds } from '../firebase/forumUsers';
import {
  getTopicById,
  getForumSectionById,
  getRepliesByTopic,
  createReply,
  updateReply,
  deleteReply,
  updateTopic,
  deleteTopic,
  toggleLikeTopic,
  toggleLikeReply,
  voteOnTopicPoll
} from '../firebase/forum';
import ForumPostContent from '../components/forum/ForumPostContent';
import RichQuotePreview from '../components/forum/RichQuotePreview';
import { isHtmlContentEmpty } from '../utils/htmlContent';
import ForumPostEditor from '../components/forum/ForumPostEditor';
import ForumLoginModal from '../components/forum/ForumLoginModal';
import LikeButton from '../components/forum/LikeButton';
import AuthorLink from '../components/forum/AuthorLink';
import BookmarkButton from '../components/forum/BookmarkButton';
import PollBlock from '../components/forum/PollBlock';
import Loader from '../components/Loader';
import SEO from '../components/SEO';
import './Forum.css';

import { formatDateTime as formatDate } from '../utils/dateFormat';

const ForumTopic = () => {
  const { sectionId, topicId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { siteUser } = useSiteAuth();
  const { forumUser, isForumAdmin } = useForumAuth();
  const replyFormRef = useRef(null);

  const [section, setSection] = useState(null);
  const [topic, setTopic] = useState(null);
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);

  const [replyContent, setReplyContent] = useState('');
  const [replyImages, setReplyImages] = useState([]);
  const [quotedReply, setQuotedReply] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  const [editingReplyId, setEditingReplyId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [editImages, setEditImages] = useState([]);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [editingTopic, setEditingTopic] = useState(false);
  const [editTopicTitle, setEditTopicTitle] = useState('');
  const [editTopicContent, setEditTopicContent] = useState('');
  const [editTopicImages, setEditTopicImages] = useState([]);
  const [topicEditSubmitting, setTopicEditSubmitting] = useState(false);

  const [authorProfiles, setAuthorProfiles] = useState({});

  // Inline error message for action failures (replaces prior alert() calls).
  // Rendered into an aria-live region so screen readers announce updates.
  const [actionError, setActionError] = useState('');
  const errorRegionRef = useRef(null);
  const showActionError = (err) => {
    const message = (err && (err.message || err.toString())) || (t('error.generic') || 'שגיאה');
    setActionError(message);
    if (errorRegionRef.current && typeof errorRegionRef.current.scrollIntoView === 'function') {
      try { errorRegionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (_) { /* noop */ }
    }
  };
  const clearActionError = () => setActionError('');

  const canReply = forumUser && !forumUser.isBlocked && !topic?.isLocked;

  const refreshAuthorProfiles = (top, reps) => {
    const ids = [top?.authorId, ...reps.map(r => r.authorId)].filter(Boolean);
    if (ids.length) getForumUsersByIds(ids).then(setAuthorProfiles).catch(() => {});
  };

  useEffect(() => {
    const load = async () => {
      const [sec, top, reps] = await Promise.all([
        getForumSectionById(sectionId),
        getTopicById(topicId),
        getRepliesByTopic(topicId)
      ]);
      setSection(sec);
      setTopic(top);
      setReplies(reps);
      setLoading(false);
      refreshAuthorProfiles(top, reps);
    };
    load();
  }, [sectionId, topicId]);

  useEffect(() => {
    if (!forumUser?.id || !topic?.id) return;
    markTopicRead(forumUser.id, topic.id, getTopicActivitySeconds(topic));
  }, [forumUser?.id, topic]);

  const handleQuote = (reply) => {
    setQuotedReply(reply);
    replyFormRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmitReply = async (e) => {
    e.preventDefault();
    if (isHtmlContentEmpty(replyContent) || !forumUser) return;
    setSubmitting(true);
    clearActionError();
    try {
      await createReply({
        topicId,
        content: replyContent,
        images: replyImages,
        authorId: forumUser.id,
        authorName: forumUser.nickname,
        quotedReplyId: quotedReply?.id || null,
        quotedContent: quotedReply?.content?.slice(0, 300) || null,
        quotedAuthorName: quotedReply?.authorName || null
      });
      if (topic.authorId && topic.authorId !== forumUser.id) {
        createNotification({ userId: topic.authorId, type: 'reply', fromUserId: forumUser.id, fromUserName: forumUser.nickname, refId: `${sectionId}/${topicId}`, refTitle: topic.title, message: t('notifications.reply') || 'הגיב/ה לנושא שלך' }).catch(() => {});
      }
      const mentioned = extractMentions(replyContent);
      mentioned.forEach(nick => {
        if (nick === forumUser.nickname) return;
        getForumUserByNickname(nick).then(u => {
          if (u && u.id !== forumUser.id && u.id !== topic.authorId) {
            createNotification({ userId: u.id, type: 'mention_topic', fromUserId: forumUser.id, fromUserName: forumUser.nickname, refId: `${sectionId}/${topicId}`, refTitle: topic.title, message: t('notifications.mention') || 'הזכיר/ה אותך' });
          }
        }).catch(() => {});
      });
      setReplyContent('');
      setReplyImages([]);
      setQuotedReply(null);
      const reps = await getRepliesByTopic(topicId);
      setReplies(reps);
      const top = await getTopicById(topicId);
      setTopic(top);
      refreshAuthorProfiles(top, reps);
    } catch (err) {
      showActionError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLikeTopic = async () => {
    if (!forumUser) return;
    const nowLiked = await toggleLikeTopic(topicId, forumUser.id);
    setTopic(prev => ({
      ...prev,
      likes: nowLiked
        ? [...(prev.likes || []), forumUser.id]
        : (prev.likes || []).filter(id => id !== forumUser.id),
      likeCount: (prev.likeCount || 0) + (nowLiked ? 1 : -1)
    }));
  };

  const handleLikeReply = async (replyId) => {
    if (!forumUser) return;
    const nowLiked = await toggleLikeReply(replyId, forumUser.id);
    setReplies(prev => prev.map(r => {
      if (r.id !== replyId) return r;
      return {
        ...r,
        likes: nowLiked
          ? [...(r.likes || []), forumUser.id]
          : (r.likes || []).filter(id => id !== forumUser.id),
        likeCount: (r.likeCount || 0) + (nowLiked ? 1 : -1)
      };
    }));
  };

  const startEditReply = (reply) => {
    setEditingReplyId(reply.id);
    setEditContent(reply.content || '');
    setEditImages(reply.images || []);
  };

  const cancelEditReply = () => {
    setEditingReplyId(null);
    setEditContent('');
    setEditImages([]);
  };

  const handleSaveEditReply = async (replyId) => {
    if (isHtmlContentEmpty(editContent)) return;
    setEditSubmitting(true);
    clearActionError();
    try {
      await updateReply(replyId, { content: editContent, images: editImages });
      setEditingReplyId(null);
      setEditContent('');
      setEditImages([]);
      const reps = await getRepliesByTopic(topicId);
      setReplies(reps);
    } catch (err) {
      showActionError(err);
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteReply = async (replyId) => {
    if (!window.confirm(t('forum.confirmDeleteReply') || 'למחוק תגובה זו?')) return;
    clearActionError();
    try {
      await deleteReply(replyId);
      const reps = await getRepliesByTopic(topicId);
      setReplies(reps);
      const top = await getTopicById(topicId);
      setTopic(top);
    } catch (err) {
      showActionError(err);
    }
  };

  const startEditTopic = () => {
    if (!topic) return;
    setEditTopicTitle(topic.title || '');
    setEditTopicContent(topic.content || '');
    setEditTopicImages(topic.images || []);
    setEditingTopic(true);
  };

  const cancelEditTopic = () => {
    setEditingTopic(false);
    setEditTopicTitle('');
    setEditTopicContent('');
    setEditTopicImages([]);
  };

  const handleSaveEditTopic = async () => {
    if (!editTopicTitle.trim() || isHtmlContentEmpty(editTopicContent)) return;
    setTopicEditSubmitting(true);
    clearActionError();
    try {
      await updateTopic(topicId, {
        title: editTopicTitle.trim(),
        content: editTopicContent,
        images: editTopicImages
      });
      const top = await getTopicById(topicId);
      setTopic(top);
      setEditingTopic(false);
    } catch (err) {
      showActionError(err);
    } finally {
      setTopicEditSubmitting(false);
    }
  };

  const handleDeleteTopic = async () => {
    if (!window.confirm(t('forum.confirmDeleteTopic') || 'למחוק את הנושא וכל התגובות?')) return;
    clearActionError();
    try {
      await deleteTopic(topicId);
      navigate(`/forum/${sectionId}`);
    } catch (err) {
      showActionError(err);
    }
  };

  if (loading) return <div className="flex justify-center py-16"><Loader /></div>;
  if (!topic) return <div className="text-center py-16 text-zinc-500">{t('forum.topicNotFound') || 'הנושא לא נמצא'}</div>;

  const topicLiked = forumUser && (topic.likes || []).includes(forumUser.id);

  const isSiteAdmin = siteUser?.level === 'admin';
  const isTopicAuthor = forumUser && String(forumUser.id) === String(topic.authorId);
  const canModifyTopic = isTopicAuthor || isForumAdmin || isSiteAdmin;

  const topicExcerpt = (topic.content || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);
  const topicPublishedIso = topic.createdAt?.toDate ? topic.createdAt.toDate().toISOString()
    : (typeof topic.createdAt === 'string' ? topic.createdAt : undefined);
  const forumStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'DiscussionForumPosting',
    headline: topic.title,
    text: topicExcerpt || undefined,
    author: topic.authorNickname ? { '@type': 'Person', name: topic.authorNickname } : undefined,
    datePublished: topicPublishedIso,
    interactionStatistic: {
      '@type': 'InteractionCounter',
      interactionType: 'https://schema.org/CommentAction',
      userInteractionCount: replies.length
    },
    mainEntityOfPage: typeof window !== 'undefined' ? window.location.href : undefined
  };

  return (
    <div className="forum-page container mx-auto px-4 max-w-4xl py-8 md:py-12">
      <SEO
        title={`${topic.title} | פורום מדברים BDSM`}
        description={topicExcerpt || `${topic.title} - דיון בפורום מדברים BDSM.`}
        canonicalPath={`/forum/${sectionId}/${topic.id}`}
        ogType="article"
        articlePublishedTime={topicPublishedIso}
        articleAuthor={topic.authorNickname}
        structuredData={forumStructuredData}
      />

      <div className="forum-breadcrumb flex items-center gap-2 mb-6 text-sm flex-wrap">
        <button onClick={() => navigate('/forum')} className="hover:text-white text-zinc-400">{t('forum.title') || 'פורום'}</button>
        <ChevronRight size={14} className="text-zinc-600" />
        <button onClick={() => navigate(`/forum/${sectionId}`)} className="hover:text-white text-zinc-400">{section?.title || '...'}</button>
        <ChevronRight size={14} className="text-zinc-600" />
        <span className="text-white font-bold truncate max-w-[50vw] sm:max-w-[200px]">{topic.title}</span>
      </div>

      <div
        ref={errorRegionRef}
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
      >
        {actionError && (
          <div className="bg-red-900/40 border border-red-800 text-red-100 rounded-xl p-3 mb-4 flex items-start justify-between gap-3 text-sm">
            <span className="flex-1">{actionError}</span>
            <button
              type="button"
              onClick={clearActionError}
              aria-label={t('close') || 'סגור'}
              className="text-red-200 hover:text-white shrink-0"
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Topic */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 mb-6">
        {editingTopic ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-1">
              {topic.isPinned && <Pin size={14} className="text-yellow-400 shrink-0" />}
              {topic.isLocked && <Lock size={14} className="text-zinc-500 shrink-0" />}
            </div>
            <input
              type="text"
              value={editTopicTitle}
              onChange={(e) => setEditTopicTitle(e.target.value)}
              className="w-full bg-black/40 border border-zinc-700 text-white text-lg font-bold p-3 rounded-xl focus:border-red-600 outline-none text-right"
              placeholder={t('forum.topicTitlePlaceholder') || 'כותרת'}
            />
            <ForumPostEditor
              content={editTopicContent}
              onContentChange={setEditTopicContent}
              images={editTopicImages}
              onImagesChange={setEditTopicImages}
              placeholder={t('forum.topicContentPlaceholder') || 'תוכן...'}
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleSaveEditTopic}
                disabled={topicEditSubmitting || !editTopicTitle.trim() || isHtmlContentEmpty(editTopicContent)}
                className="bg-red-600 hover:bg-red-500 disabled:bg-zinc-700 text-white px-5 py-2 rounded-xl font-bold text-sm flex items-center gap-1"
              >
                <Save size={14} />
                {topicEditSubmitting ? (t('saving') || 'שומר...') : (t('save') || 'שמור')}
              </button>
              <button
                type="button"
                onClick={cancelEditTopic}
                className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-1"
              >
                <X size={14} />
                {t('cancel') || 'ביטול'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-3">
              {topic.isPinned && <Pin size={14} className="text-yellow-400" />}
              {topic.isLocked && <Lock size={14} className="text-zinc-500" />}
              <h1 className="text-xl md:text-2xl font-black text-white">{topic.title}</h1>
            </div>
            <div className="flex items-center gap-3 mb-4 text-zinc-500 text-xs">
              <AuthorLink authorId={topic.authorId} authorName={topic.authorName} shortBio={authorProfiles[topic.authorId]?.shortBio} />
              <span className="flex items-center gap-1"><Clock size={12} /> {formatDate(topic.createdAt)}</span>
            </div>
            <ForumPostContent content={topic.content} images={topic.images} />
            {topic.poll && (
              <PollBlock
                poll={topic.poll}
                userId={forumUser?.id}
                onVote={async (optIdx) => {
                  await voteOnTopicPoll(topicId, optIdx, forumUser.id);
                  const top = await getTopicById(topicId);
                  setTopic(top);
                }}
              />
            )}
            <div className="mt-4 pt-3 border-t border-zinc-800 flex flex-wrap items-center gap-3">
              <LikeButton
                liked={topicLiked}
                count={topic.likeCount || 0}
                onToggle={handleLikeTopic}
                disabled={!forumUser}
              />
              <BookmarkButton userId={forumUser?.id} itemType="topic" itemId={topicId} />
              {canModifyTopic && (
                <>
                  <button
                    type="button"
                    onClick={startEditTopic}
                    className="flex items-center gap-1 text-zinc-500 hover:text-yellow-400 text-sm transition-colors"
                  >
                    <Pencil size={14} />
                    {t('edit') || 'עריכה'}
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteTopic}
                    className="flex items-center gap-1 text-zinc-500 hover:text-red-400 text-sm transition-colors"
                  >
                    <Trash2 size={14} />
                    {t('delete') || 'מחיקה'}
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Replies */}
      {replies.length > 0 && (
        <div className="space-y-4 mb-8">
          <h2 className="text-lg font-bold text-white">{t('forum.replies') || 'תגובות'} ({replies.length})</h2>
          {replies.map(reply => {
            const replyLiked = forumUser && (reply.likes || []).includes(forumUser.id);
            const isAuthor = forumUser && String(forumUser.id) === String(reply.authorId);
            const canModify = isAuthor || isForumAdmin || isSiteAdmin;
            const isEditing = editingReplyId === reply.id;

            return (
              <div key={reply.id} className="forum-post-card bg-zinc-900/40 border border-zinc-800 rounded-xl p-4">
                {reply.quotedContent && (
                  <div className="forum-quoted-block mb-3 border-r-2 border-zinc-600 pr-3">
                    <p className="text-xs text-zinc-500 mb-1 font-bold">{reply.quotedAuthorName || '???'} {t('forum.wrote') || 'כתב/ה'}:</p>
                    <RichQuotePreview content={reply.quotedContent} />
                  </div>
                )}
                <div className="flex items-center gap-3 mb-2 text-xs text-zinc-500">
                  <AuthorLink authorId={reply.authorId} authorName={reply.authorName} shortBio={authorProfiles[reply.authorId]?.shortBio} />
                  <span className="flex items-center gap-1"><Clock size={12} /> {formatDate(reply.createdAt)}</span>
                  {reply.editedAt && <span className="text-zinc-600">({t('forum.edited') || 'נערך'})</span>}
                </div>

                {isEditing ? (
                  <div className="space-y-3 mt-2">
                    <ForumPostEditor
                      content={editContent}
                      onContentChange={setEditContent}
                      images={editImages}
                      onImagesChange={setEditImages}
                      placeholder={t('forum.replyPlaceholder') || 'כתוב תגובה...'}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleSaveEditReply(reply.id)}
                        disabled={editSubmitting || isHtmlContentEmpty(editContent)}
                        className="bg-red-600 hover:bg-red-500 disabled:bg-zinc-700 text-white px-4 py-1.5 rounded-lg font-bold text-sm transition-colors"
                      >
                        {editSubmitting ? (t('saving') || 'שומר...') : (t('save') || 'שמור')}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEditReply}
                        className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-1.5 rounded-lg font-bold text-sm"
                      >
                        {t('cancel') || 'ביטול'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <ForumPostContent content={reply.content} images={reply.images} />
                )}

                <div className="mt-3 pt-2 border-t border-zinc-800/50 flex items-center gap-3">
                  <LikeButton
                    liked={replyLiked}
                    count={reply.likeCount || 0}
                    onToggle={() => handleLikeReply(reply.id)}
                    disabled={!forumUser}
                  />
                  {canReply && (
                    <button
                      type="button"
                      onClick={() => handleQuote(reply)}
                      className="flex items-center gap-1 text-zinc-500 hover:text-white text-sm transition-colors"
                    >
                      <Quote size={14} />
                      {t('forum.quote') || 'ציטוט'}
                    </button>
                  )}
                  {canModify && !isEditing && (
                    <>
                      <button
                        type="button"
                        onClick={() => startEditReply(reply)}
                        className="flex items-center gap-1 text-zinc-500 hover:text-yellow-400 text-sm transition-colors"
                      >
                        <Pencil size={13} />
                        {t('edit') || 'עריכה'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteReply(reply.id)}
                        className="flex items-center gap-1 text-zinc-500 hover:text-red-400 text-sm transition-colors"
                      >
                        <Trash2 size={13} />
                        {t('delete') || 'מחיקה'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reply form */}
      {topic.isLocked && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-center text-zinc-500 text-sm">
          <Lock size={16} className="mx-auto mb-2" />
          {t('forum.topicLocked') || 'הנושא נעול ולא ניתן להגיב'}
        </div>
      )}

      {forumUser?.isBlocked && (
        <div className="bg-red-900/30 border border-red-800 rounded-xl p-4 text-center text-red-200 text-sm">
          {t('forum.blockedMessage') || 'המשתמש שלך חסום ולא ניתן לפרסם בפורום'}
        </div>
      )}

      {canReply && (
        <form ref={replyFormRef} onSubmit={handleSubmitReply} className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-4">
          <h3 className="text-lg font-bold text-white">{t('forum.addReply') || 'הוסף תגובה'}</h3>

          {quotedReply && (
            <div className="forum-quoted-block flex justify-between items-start gap-2 border-r-2 border-zinc-600 pr-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-zinc-500 mb-1 font-bold">{t('forum.quoting') || 'מצטט/ת את'} {quotedReply.authorName}:</p>
                <RichQuotePreview content={quotedReply.content?.slice(0, 600) || ''} />
              </div>
              <button type="button" onClick={() => setQuotedReply(null)} className="text-zinc-500 hover:text-white text-xs shrink-0 mr-2">
                {t('forum.removeQuote') || 'הסר ציטוט'}
              </button>
            </div>
          )}

          <ForumPostEditor
            content={replyContent}
            onContentChange={setReplyContent}
            images={replyImages}
            onImagesChange={setReplyImages}
            placeholder={t('forum.replyPlaceholder') || 'כתוב תגובה...'}
          />
          <button
            type="submit"
            disabled={submitting || isHtmlContentEmpty(replyContent)}
            className="bg-red-600 hover:bg-red-500 disabled:bg-zinc-700 text-white px-6 py-2 rounded-xl font-bold text-sm transition-colors"
          >
            {submitting ? (t('forum.publishing') || 'מפרסם...') : (t('forum.publishReply') || 'שלח תגובה')}
          </button>
        </form>
      )}

      {!forumUser && !topic.isLocked && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-center text-zinc-400 text-sm">
          <button type="button" onClick={() => setShowLogin(true)} className="text-red-300 hover:text-red-200 font-bold underline">
            {t('forum.loginToReply') || 'התחבר כדי להגיב'}
          </button>
        </div>
      )}

      <ForumLoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} />
    </div>
  );
};

export default ForumTopic;
