import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Heart, MessageSquare, Clock, Plus, LogIn, Star, Filter, Users, Sparkles, Search } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useForumAuth } from '../context/ForumAuthContext';
import {
  getBlogPosts,
  createBlogPost,
  getBlogFollowsForUser,
  getBlogFollowerCountsForAuthors,
  followBlogAuthor,
  unfollowBlogAuthor,
  markBlogAuthorSeen
} from '../firebase/blog';
import { getForumUsersByIds } from '../firebase/forumUsers';
import { createNotification } from '../firebase/notifications';
import ForumPostEditor from '../components/forum/ForumPostEditor';
import ForumLoginModal from '../components/forum/ForumLoginModal';
import TagInput from '../components/forum/TagInput';
import PollEditor from '../components/forum/PollEditor';
import AuthorLink from '../components/forum/AuthorLink';
import Loader from '../components/Loader';
import SEO from '../components/SEO';
import { getReadTime } from '../utils/readTime';
import { isHtmlContentEmpty } from '../utils/htmlContent';
import { looksLikeRichHtml, htmlToPlainText } from '../utils/richTextDisplay';
import { useDraft } from '../hooks/useDraft';
import './Blog.css';

import { formatDateTime as formatDate } from '../utils/dateFormat';

const PREVIEW_LENGTH = 250;

const Blog = () => {
  const { t } = useLanguage();
  const { forumUser } = useForumAuth();
  const navigate = useNavigate();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newImages, setNewImages] = useState([]);
  const [newTags, setNewTags] = useState([]);
  const [newPoll, setNewPoll] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [authorFilter, setAuthorFilter] = useState('');
  const [follows, setFollows] = useState([]);
  const [followerCounts, setFollowerCounts] = useState({});
  const [followActionId, setFollowActionId] = useState(null);
  const [authorProfiles, setAuthorProfiles] = useState({});

  const blogDraft = useDraft('blog_post');
  const [blogDraftRestored, setBlogDraftRestored] = useState(false);
  const canPost = forumUser && !forumUser.isBlocked;

  const loadPosts = useCallback(async () => {
    const p = await getBlogPosts();
    setPosts(p);
    const ids = [...new Set(p.map(post => post.authorId).filter(Boolean))];
    if (ids.length) getForumUsersByIds(ids).then(setAuthorProfiles).catch(() => {});
    return p;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await loadPosts();
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [loadPosts]);

  useEffect(() => {
    if (!forumUser?.id) {
      setFollows([]);
      return;
    }
    getBlogFollowsForUser(forumUser.id).then(setFollows).catch(() => setFollows([]));
  }, [forumUser?.id]);

  useEffect(() => {
    const ids = [...new Set(posts.map((p) => p.authorId).filter(Boolean))];
    if (ids.length === 0) {
      setFollowerCounts({});
      return;
    }
    getBlogFollowerCountsForAuthors(ids).then(setFollowerCounts).catch(() => {});
  }, [posts]);

  const uniqueAuthors = useMemo(() => {
    const map = new Map();
    posts.forEach((p) => {
      if (p.authorId && !map.has(p.authorId)) {
        map.set(p.authorId, { id: p.authorId, name: p.authorName || '—' });
      }
    });
    return Array.from(map.values());
  }, [posts]);

  const latestPostSecondsForAuthor = useCallback(
    (authorId) => {
      let max = 0;
      posts.forEach((p) => {
        if (p.authorId !== authorId) return;
        const s = p.createdAt?.seconds ?? 0;
        if (s > max) max = s;
      });
      return max;
    },
    [posts]
  );

  const hasUnreadForFollow = useCallback(
    (follow) => {
      const latest = latestPostSecondsForAuthor(follow.authorId);
      const seen = follow.lastSeenAt?.seconds ?? 0;
      return latest > seen;
    },
    [latestPostSecondsForAuthor]
  );

  const followSet = useMemo(() => new Set(follows.map((f) => f.authorId)), [follows]);

  const filteredPosts = useMemo(() => {
    let result = posts;
    if (authorFilter) result = result.filter((p) => p.authorId === authorFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(p => p.title?.toLowerCase().includes(q) || p.content?.toLowerCase().includes(q) || p.authorName?.toLowerCase().includes(q));
    }
    return result;
  }, [posts, authorFilter, searchQuery]);

  const refreshFollows = async () => {
    if (!forumUser?.id) return;
    const f = await getBlogFollowsForUser(forumUser.id);
    setFollows(f);
  };

  const handleFollowToggle = async (e, author) => {
    e.stopPropagation();
    if (!forumUser || author.id === forumUser.id) return;
    setFollowActionId(author.id);
    try {
      if (followSet.has(author.id)) {
        await unfollowBlogAuthor(forumUser.id, author.id);
      } else {
        await followBlogAuthor(forumUser.id, author.id, author.name);
        createNotification({ userId: author.id, type: 'follow', fromUserId: forumUser.id, fromUserName: forumUser.nickname, message: t('notifications.follow') || 'התחיל/ה לעקוב אחריך' }).catch(() => {});
      }
      await refreshFollows();
      const ids = [...new Set(posts.map((p) => p.authorId).filter(Boolean))];
      const counts = await getBlogFollowerCountsForAuthors(ids);
      setFollowerCounts(counts);
    } catch (err) {
      alert(err.message || 'שגיאה');
    } finally {
      setFollowActionId(null);
    }
  };

  const handleMarkAuthorRead = async (e, authorId) => {
    e.stopPropagation();
    if (!forumUser) return;
    try {
      await markBlogAuthorSeen(forumUser.id, authorId);
      await refreshFollows();
    } catch (err) {
      alert(err.message || 'שגיאה');
    }
  };

  useEffect(() => {
    if (showNew && !blogDraftRestored) {
      const saved = blogDraft.loadDraft();
      if (saved) {
        if (saved.title) setNewTitle(saved.title);
        if (saved.content) setNewContent(saved.content);
        if (saved.tags) setNewTags(saved.tags);
        setBlogDraftRestored(true);
      }
    }
  }, [showNew, blogDraftRestored, blogDraft]);

  useEffect(() => {
    if (showNew) blogDraft.saveDraft({ title: newTitle, content: newContent, tags: newTags });
  }, [newTitle, newContent, newTags, showNew, blogDraft]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || isHtmlContentEmpty(newContent) || !forumUser) return;
    setSubmitting(true);
    try {
      const postData = {
        title: newTitle.trim(),
        content: newContent,
        images: newImages,
        tags: newTags,
        authorId: forumUser.id,
        authorName: forumUser.nickname
      };
      if (newPoll?.question?.trim() && newPoll.options?.filter(o => o.trim()).length >= 2) {
        postData.poll = { question: newPoll.question.trim(), options: newPoll.options.filter(o => o.trim()), votes: {} };
      }
      await createBlogPost(postData);
      setNewTitle('');
      setNewContent('');
      setNewImages([]);
      setNewTags([]);
      setNewPoll(null);
      setShowNew(false);
      blogDraft.clearDraft();
      setBlogDraftRestored(false);
      await loadPosts();
    } catch (err) {
      alert(err.message || 'שגיאה');
    } finally {
      setSubmitting(false);
    }
  };

  const getPreview = (content) => {
    let s = String(content || '').replace(/\[spoiler\][\s\S]*?\[\/spoiler\]/gi, '[ספויילר]');
    if (looksLikeRichHtml(s)) {
      s = htmlToPlainText(s);
    }
    return s.length > PREVIEW_LENGTH ? s.slice(0, PREVIEW_LENGTH) + '...' : s;
  };

  return (
    <div className="blog-page container mx-auto px-4 max-w-4xl py-8 md:py-12">
      <SEO title={t('blog.title') || 'בלוג'} />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h1 className="text-3xl md:text-4xl font-black text-white">
          {t('blog.title') || 'בלוג'}
        </h1>
        {canPost ? (
          <button
            onClick={() => setShowNew(!showNew)}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-xl font-bold text-sm transition-colors"
          >
            <Plus size={16} />
            {t('blog.newPost') || 'כתוב פוסט'}
          </button>
        ) : !forumUser ? (
          <button
            onClick={() => setShowLogin(true)}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-xl font-bold text-sm transition-colors"
          >
            <LogIn size={16} />
            {t('forum.loginRegister') || 'התחברות / הרשמה'}
          </button>
        ) : null}
      </div>

      {forumUser?.isBlocked && (
        <div className="bg-red-900/30 border border-red-800 rounded-xl p-4 mb-6 text-center text-red-200 text-sm">
          {t('forum.blockedMessage') || 'המשתמש שלך חסום ולא ניתן לפרסם'}
        </div>
      )}

      {showNew && (
        <form onSubmit={handleSubmit} className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 mb-8 space-y-4">
          <h3 className="text-lg font-bold text-white">{t('blog.createPost') || 'כתיבת פוסט חדש'}</h3>
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder={t('blog.titlePlaceholder') || 'כותרת הפוסט'}
            className="w-full bg-black/40 border border-zinc-700 text-white text-sm p-3 rounded-xl focus:border-red-600 outline-none text-right"
            required
            maxLength={200}
          />
          <ForumPostEditor
            content={newContent}
            onContentChange={setNewContent}
            images={newImages}
            onImagesChange={setNewImages}
            placeholder={t('blog.contentPlaceholder') || 'כתוב את הפוסט שלך...'}
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
              {submitting ? (t('blog.publishing') || 'מפרסם...') : (t('blog.publish') || 'פרסם')}
            </button>
            <button
              type="button"
              onClick={() => setShowNew(false)}
              className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-xl font-bold text-sm"
            >
              {t('cancel') || 'ביטול'}
            </button>
          </div>
        </form>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder={t('search.searchBlog') || 'חיפוש בבלוג...'}
          className="w-full bg-black/40 border border-zinc-700 text-white text-sm pr-9 pl-3 py-2 rounded-xl focus:border-red-600 outline-none text-right"
        />
      </div>

      {uniqueAuthors.length > 0 && (
        <div className="mb-6 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Filter size={16} className="text-zinc-500 shrink-0" />
            <span className="text-zinc-400 text-sm font-bold">{t('blog.filterByAuthor') || 'סינון לפי כותב'}:</span>
            <button
              type="button"
              onClick={() => setAuthorFilter('')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${authorFilter === '' ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
            >
              {t('blog.allAuthors') || 'כל הכותבים'}
            </button>
            {uniqueAuthors.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setAuthorFilter(a.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors max-w-[200px] truncate ${authorFilter === a.id ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                title={a.name}
              >
                {a.name}
              </button>
            ))}
          </div>

          {forumUser && follows.length > 0 && (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={16} className="text-amber-400" />
                <span className="text-white font-bold text-sm">{t('blog.myAuthors') || 'כותבים במעקב שלי'}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {follows.map((f) => {
                  const unread = hasUnreadForFollow(f);
                  const label = f.authorName || uniqueAuthors.find((x) => x.id === f.authorId)?.name || '—';
                  return (
                    <div
                      key={f.authorId}
                      className="flex items-center gap-1.5 bg-zinc-800/80 rounded-lg pl-2 pr-1 py-1 border border-zinc-700"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setAuthorFilter(f.authorId);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="text-sm text-white font-medium hover:text-red-400 transition-colors"
                      >
                        {label}
                      </button>
                      {unread && (
                        <span className="text-[10px] font-bold bg-amber-600 text-white px-1.5 py-0.5 rounded">
                          {t('blog.newBadge') || 'חדש'}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => handleMarkAuthorRead(e, f.authorId)}
                        className="text-[10px] text-zinc-500 hover:text-zinc-300 underline px-1"
                        title={t('blog.markRead') || 'סמן כנקרא'}
                      >
                        {t('blog.markRead') || 'נקרא'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader /></div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 text-zinc-500">
          <BookOpen size={48} className="mx-auto mb-4 opacity-30" />
          <p>{t('blog.noPosts') || 'אין פוסטים עדיין. היה הראשון לכתוב!'}</p>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="text-center py-12 text-zinc-500">
          <p>{searchQuery.trim() ? (t('search.noResults') || 'לא נמצאו תוצאות') : (t('blog.noPostsForAuthor') || 'אין פוסטים מהכותב הזה')}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredPosts.map((post) => {
            const fc = followerCounts[post.authorId] ?? 0;
            const isFollowing = followSet.has(post.authorId);
            const showFollow = forumUser && post.authorId !== forumUser.id;
            return (
              <article
                key={post.id}
                className="blog-card bg-zinc-900/60 backdrop-blur border border-zinc-800 hover:border-zinc-600 rounded-xl p-5 transition-all group"
              >
                <h2 className="text-lg md:text-xl font-bold text-white mb-2">
                  <Link
                    to={`/blog/${post.id}`}
                    className="text-white group-hover:text-red-400 transition-colors no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-500 focus-visible:outline-offset-2 rounded"
                  >
                    {post.title}
                  </Link>
                </h2>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-zinc-400 text-xs mb-3">
                  <AuthorLink authorId={post.authorId} authorName={post.authorName} shortBio={authorProfiles[post.authorId]?.shortBio} />
                  <span className="flex items-center gap-1 text-zinc-400">
                    <Users size={12} aria-hidden="true" />
                    {fc} {t('blog.followers') || 'עוקבים'}
                  </span>
                  <span className="flex items-center gap-1 text-zinc-400">
                    <Clock size={12} aria-hidden="true" /> {formatDate(post.createdAt)}
                  </span>
                  <span className="text-zinc-400 text-[11px]">
                    {getReadTime(post.content, post.images?.length || 0)} {t('blog.readTime') || 'דקות קריאה'}
                  </span>
                  {showFollow && (
                    <button
                      type="button"
                      onClick={(e) => handleFollowToggle(e, { id: post.authorId, name: post.authorName })}
                      disabled={followActionId === post.authorId}
                      aria-disabled={followActionId === post.authorId}
                      aria-pressed={isFollowing}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold transition-colors ${isFollowing ? 'bg-amber-900/50 text-amber-200 hover:bg-amber-800/80' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}
                      title={isFollowing ? (t('blog.unfollow') || 'הסר ממעקב') : (t('blog.follow') || 'עקוב אחרי הכותב')}
                    >
                      {isFollowing ? <Star size={12} className="fill-amber-400 text-amber-400" aria-hidden="true" /> : <Star size={12} aria-hidden="true" />}
                      {isFollowing ? (t('blog.following') || 'במעקב') : (t('blog.follow') || 'עקוב')}
                    </button>
                  )}
                </div>
                {post.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {post.tags.map((tag, i) => (
                      <span key={i} className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-medium">{tag}</span>
                    ))}
                  </div>
                )}
                <Link
                  to={`/blog/${post.id}`}
                  className="block no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-500 focus-visible:outline-offset-2 rounded"
                  aria-label={`${t('a11y.openPost') || 'פתח פוסט'}: ${post.title}`}
                >
                  <p className="text-zinc-400 text-sm leading-relaxed mb-3 line-clamp-3">
                    {getPreview(post.content)}
                  </p>
                  {post.images && post.images.length > 0 && (
                    <div className="flex gap-2 mb-3">
                      {post.images.slice(0, 3).map((img, idx) => (
                        <img
                          key={idx}
                          src={img.url}
                          alt={`${t('a11y.imageBlogThumb') || 'תמונה ממאמר הבלוג'}: ${post.title}`}
                          className={`h-16 w-16 rounded-lg object-cover border border-zinc-700 ${img.isSpoiler ? 'blur-lg' : ''}`}
                          loading="lazy"
                        />
                      ))}
                      {post.images.length > 3 && (
                        <div className="h-16 w-16 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 text-xs font-bold" aria-hidden="true">
                          +{post.images.length - 3}
                        </div>
                      )}
                    </div>
                  )}
                </Link>
                <div className="flex items-center gap-4 text-zinc-400 text-xs">
                  {post.likeCount > 0 && (
                    <span className="flex items-center gap-1"><Heart size={12} /> {post.likeCount}</span>
                  )}
                  <span className="flex items-center gap-1"><MessageSquare size={12} /> {post.commentCount || 0} {t('blog.comments') || 'תגובות'}</span>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <ForumLoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} />
    </div>
  );
};

export default Blog;
