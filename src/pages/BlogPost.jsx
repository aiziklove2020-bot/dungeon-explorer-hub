import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronRight, Clock, Pencil, Trash2, Save, X, Star, Users } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useForumAuth } from '../context/ForumAuthContext';
import { createNotification } from '../firebase/notifications';
import { extractMentions } from '../utils/mentions';
import { getForumUserByNickname, getForumUsersByIds } from '../firebase/forumUsers';
import {
  getBlogPostById,
  getCommentsByPost,
  createBlogComment,
  updateBlogComment,
  deleteBlogComment,
  toggleLikeBlogPost,
  toggleLikeBlogComment,
  updateBlogPost,
  deleteBlogPost,
  markBlogAuthorSeen,
  getBlogFollowerCount,
  getBlogFollowsForUser,
  followBlogAuthor,
  unfollowBlogAuthor,
  voteOnBlogPoll
} from '../firebase/blog';
import ForumPostContent from '../components/forum/ForumPostContent';
import ForumPostEditor from '../components/forum/ForumPostEditor';
import ForumLoginModal from '../components/forum/ForumLoginModal';
import LikeButton from '../components/forum/LikeButton';
import AuthorLink from '../components/forum/AuthorLink';
import BookmarkButton from '../components/forum/BookmarkButton';
import PollBlock from '../components/forum/PollBlock';
import Loader from '../components/Loader';
import SEO from '../components/SEO';
import { getReadTime } from '../utils/readTime';
import { isHtmlContentEmpty } from '../utils/htmlContent';
import './Blog.css';

import { formatDateTime as formatDate } from '../utils/dateFormat';

const BlogPost = () => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { forumUser, isForumAdmin } = useForumAuth();

  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);

  const [commentContent, setCommentContent] = useState('');
  const [commentImages, setCommentImages] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editImages, setEditImages] = useState([]);

  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentContent, setEditCommentContent] = useState('');
  const [editCommentImages, setEditCommentImages] = useState([]);
  const [editCommentSubmitting, setEditCommentSubmitting] = useState(false);

  const [followerCount, setFollowerCount] = useState(0);
  const [isFollowingAuthor, setIsFollowingAuthor] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [authorProfiles, setAuthorProfiles] = useState({});

  const canComment = forumUser && !forumUser.isBlocked;
  const isAuthor = forumUser && post && forumUser.id === post.authorId;
  const canModifyPost = isAuthor || isForumAdmin;

  const refreshAuthorProfiles = (p, c) => {
    const ids = [p?.authorId, ...c.map(cm => cm.authorId)].filter(Boolean);
    if (ids.length) getForumUsersByIds(ids).then(setAuthorProfiles).catch(() => {});
  };

  useEffect(() => {
    const load = async () => {
      const [p, c] = await Promise.all([
        getBlogPostById(postId),
        getCommentsByPost(postId)
      ]);
      setPost(p);
      setComments(c);
      setLoading(false);
      refreshAuthorProfiles(p, c);
    };
    load();
  }, [postId]);

  useEffect(() => {
    if (!post?.authorId || !forumUser?.id || post.authorId === forumUser.id) return;
    markBlogAuthorSeen(forumUser.id, post.authorId).catch(() => {});
  }, [post?.authorId, post?.id, forumUser?.id]);

  useEffect(() => {
    if (!post?.authorId) return;
    getBlogFollowerCount(post.authorId).then(setFollowerCount).catch(() => setFollowerCount(0));
    if (forumUser?.id) {
      getBlogFollowsForUser(forumUser.id)
        .then((follows) => setIsFollowingAuthor(follows.some((f) => f.authorId === post.authorId)))
        .catch(() => setIsFollowingAuthor(false));
    } else {
      setIsFollowingAuthor(false);
    }
  }, [post?.authorId, forumUser?.id]);

  const handleFollowTogglePost = async () => {
    if (!forumUser || !post?.authorId || post.authorId === forumUser.id || followBusy) return;
    setFollowBusy(true);
    try {
      if (isFollowingAuthor) {
        await unfollowBlogAuthor(forumUser.id, post.authorId);
        setIsFollowingAuthor(false);
      } else {
        await followBlogAuthor(forumUser.id, post.authorId, post.authorName);
        setIsFollowingAuthor(true);
        createNotification({ userId: post.authorId, type: 'follow', fromUserId: forumUser.id, fromUserName: forumUser.nickname, message: t('notifications.follow') || 'התחיל/ה לעקוב אחריך' }).catch(() => {});
      }
      const n = await getBlogFollowerCount(post.authorId);
      setFollowerCount(n);
    } catch (err) {
      alert(err.message || 'שגיאה');
    } finally {
      setFollowBusy(false);
    }
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (isHtmlContentEmpty(commentContent) || !forumUser) return;
    setSubmitting(true);
    try {
      await createBlogComment({
        postId,
        content: commentContent,
        images: commentImages,
        authorId: forumUser.id,
        authorName: forumUser.nickname
      });
      if (post.authorId && post.authorId !== forumUser.id) {
        createNotification({ userId: post.authorId, type: 'comment', fromUserId: forumUser.id, fromUserName: forumUser.nickname, refId: postId, refTitle: post.title, message: t('notifications.comment') || 'הגיב/ה לפוסט שלך' }).catch(() => {});
      }
      const mentioned = extractMentions(commentContent);
      mentioned.forEach(nick => {
        if (nick === forumUser.nickname) return;
        getForumUserByNickname(nick).then(u => {
          if (u && u.id !== forumUser.id && u.id !== post.authorId) {
            createNotification({ userId: u.id, type: 'mention_blog', fromUserId: forumUser.id, fromUserName: forumUser.nickname, refId: postId, refTitle: post.title, message: t('notifications.mention') || 'הזכיר/ה אותך' });
          }
        }).catch(() => {});
      });
      setCommentContent('');
      setCommentImages([]);
      const [c, p] = await Promise.all([getCommentsByPost(postId), getBlogPostById(postId)]);
      setComments(c);
      setPost(p);
      refreshAuthorProfiles(p, c);
    } catch (err) {
      alert(err.message || 'שגיאה');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLikePost = async () => {
    if (!forumUser) return;
    const nowLiked = await toggleLikeBlogPost(postId, forumUser.id);
    setPost(prev => ({
      ...prev,
      likes: nowLiked
        ? [...(prev.likes || []), forumUser.id]
        : (prev.likes || []).filter(id => id !== forumUser.id),
      likeCount: (prev.likeCount || 0) + (nowLiked ? 1 : -1)
    }));
  };

  const handleLikeComment = async (commentId) => {
    if (!forumUser) return;
    const nowLiked = await toggleLikeBlogComment(commentId, forumUser.id);
    setComments(prev => prev.map(c => {
      if (c.id !== commentId) return c;
      return {
        ...c,
        likes: nowLiked
          ? [...(c.likes || []), forumUser.id]
          : (c.likes || []).filter(id => id !== forumUser.id),
        likeCount: (c.likeCount || 0) + (nowLiked ? 1 : -1)
      };
    }));
  };

  const startEdit = () => {
    setEditTitle(post.title);
    setEditContent(post.content);
    setEditImages(post.images || []);
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!editTitle?.trim() || isHtmlContentEmpty(editContent)) return;
    try {
      await updateBlogPost(postId, {
        title: editTitle.trim(),
        content: editContent,
        images: editImages
      });
      const p = await getBlogPostById(postId);
      setPost(p);
      setEditing(false);
    } catch (err) {
      alert(err.message || 'שגיאה');
    }
  };

  const handleDelete = async () => {
    if (!confirm(t('blog.confirmDelete') || 'למחוק את הפוסט? הפעולה בלתי הפיכה.')) return;
    await deleteBlogPost(postId);
    navigate('/blog');
  };

  const startEditComment = (comment) => {
    setEditingCommentId(comment.id);
    setEditCommentContent(comment.content || '');
    setEditCommentImages(comment.images || []);
  };

  const cancelEditComment = () => {
    setEditingCommentId(null);
    setEditCommentContent('');
    setEditCommentImages([]);
  };

  const saveEditComment = async (commentId) => {
    if (isHtmlContentEmpty(editCommentContent)) return;
    setEditCommentSubmitting(true);
    try {
      await updateBlogComment(commentId, { content: editCommentContent, images: editCommentImages });
      setEditingCommentId(null);
      setEditCommentContent('');
      setEditCommentImages([]);
      const c = await getCommentsByPost(postId);
      setComments(c);
    } catch (err) {
      alert(err.message || 'שגיאה');
    } finally {
      setEditCommentSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm(t('blog.confirmDeleteComment') || 'למחוק תגובה זו?')) return;
    try {
      await deleteBlogComment(commentId);
      const [c, p] = await Promise.all([getCommentsByPost(postId), getBlogPostById(postId)]);
      setComments(c);
      setPost(p);
    } catch (err) {
      alert(err.message || 'שגיאה');
    }
  };

  if (loading) return <div className="flex justify-center py-16"><Loader /></div>;
  if (!post) return <div className="text-center py-16 text-zinc-500">{t('blog.postNotFound') || 'הפוסט לא נמצא'}</div>;

  const postLiked = forumUser && (post.likes || []).includes(forumUser.id);

  // Build a plain-text excerpt for meta description / OG description from the
  // post body. Strip HTML and collapse whitespace; cap at ~200 chars per
  // Google guidance.
  const plainExcerpt = (post.content || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);
  const publishedIso = post.createdAt?.toDate ? post.createdAt.toDate().toISOString()
    : (typeof post.createdAt === 'string' ? post.createdAt : undefined);
  const modifiedIso = post.updatedAt?.toDate ? post.updatedAt.toDate().toISOString()
    : publishedIso;
  const blogPostStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: plainExcerpt || undefined,
    author: post.authorNickname ? { '@type': 'Person', name: post.authorNickname } : undefined,
    datePublished: publishedIso,
    dateModified: modifiedIso,
    mainEntityOfPage: typeof window !== 'undefined' ? window.location.href : undefined
  };

  return (
    <div className="blog-page container mx-auto px-4 max-w-4xl py-8 md:py-12">
      <SEO
        title={`${post.title} | בלוג מדברים BDSM`}
        description={plainExcerpt || `${post.title} - בלוג מדברים BDSM.`}
        canonicalPath={`/blog/${post.id}`}
        ogType="article"
        articlePublishedTime={publishedIso}
        articleModifiedTime={modifiedIso}
        articleAuthor={post.authorNickname}
        structuredData={blogPostStructuredData}
      />

      <div className="forum-breadcrumb flex items-center gap-2 mb-6 text-sm flex-wrap">
        <button onClick={() => navigate('/blog')} className="hover:text-white text-zinc-400 shrink-0">{t('blog.title') || 'בלוג'}</button>
        <ChevronRight size={14} className="text-zinc-600 shrink-0" />
        <span className="text-white font-bold truncate max-w-[60vw] sm:max-w-[250px]">{post.title}</span>
      </div>

      {/* Post */}
      <article className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 mb-6">
        {editing ? (
          <div className="space-y-4">
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full bg-black/40 border border-zinc-700 text-white text-lg font-bold p-3 rounded-xl focus:border-red-600 outline-none text-right"
            />
            <ForumPostEditor
              content={editContent}
              onContentChange={setEditContent}
              images={editImages}
              onImagesChange={setEditImages}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={saveEdit}
                disabled={!editTitle?.trim() || isHtmlContentEmpty(editContent)}
                className="bg-red-600 hover:bg-red-500 disabled:bg-zinc-700 text-white px-5 py-2 rounded-xl font-bold text-sm flex items-center gap-1"
              >
                <Save size={14} /> {t('save') || 'שמור'}
              </button>
              <button onClick={() => setEditing(false)} className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-1"><X size={14} /> {t('cancel') || 'ביטול'}</button>
            </div>
          </div>
        ) : (
          <>
            <h1 className="text-xl md:text-2xl font-black text-white mb-3">{post.title}</h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-4 text-zinc-500 text-xs">
              <AuthorLink authorId={post.authorId} authorName={post.authorName} shortBio={authorProfiles[post.authorId]?.shortBio} />
              <span className="flex items-center gap-1">
                <Users size={12} /> {followerCount} {t('blog.followers') || 'עוקבים'}
              </span>
              <span className="flex items-center gap-1"><Clock size={12} /> {formatDate(post.createdAt)}</span>
              <span className="text-zinc-600 text-[11px]">
                {getReadTime(post.content, post.images?.length || 0)} {t('blog.readTime') || 'דקות קריאה'}
              </span>
              {forumUser && post.authorId !== forumUser.id && (
                <button
                  type="button"
                  onClick={handleFollowTogglePost}
                  disabled={followBusy}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold transition-colors ${isFollowingAuthor ? 'bg-amber-900/50 text-amber-200' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}
                >
                  {isFollowingAuthor ? <Star size={12} className="fill-amber-400 text-amber-400" /> : <Star size={12} />}
                  {isFollowingAuthor ? (t('blog.following') || 'במעקב') : (t('blog.follow') || 'עקוב')}
                </button>
              )}
            </div>
            <ForumPostContent content={post.content} images={post.images} />
            {post.poll && (
              <PollBlock
                poll={post.poll}
                userId={forumUser?.id}
                onVote={async (optIdx) => {
                  await voteOnBlogPoll(postId, optIdx, forumUser.id);
                  const p = await getBlogPostById(postId);
                  setPost(p);
                }}
              />
            )}
            <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center gap-3">
              <LikeButton
                liked={postLiked}
                count={post.likeCount || 0}
                onToggle={handleLikePost}
                disabled={!forumUser}
              />
              <BookmarkButton userId={forumUser?.id} itemType="blogPost" itemId={postId} />
              {canModifyPost && (
                <>
                  <button onClick={startEdit} className="flex items-center gap-1 text-zinc-500 hover:text-white text-sm transition-colors">
                    <Pencil size={14} /> {t('edit') || 'ערוך'}
                  </button>
                  <button onClick={handleDelete} className="flex items-center gap-1 text-red-600 hover:text-red-400 text-sm transition-colors">
                    <Trash2 size={14} /> {t('delete') || 'מחק'}
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </article>

      {/* Comments */}
      {comments.length > 0 && (
        <div className="space-y-4 mb-8">
          <h2 className="text-lg font-bold text-white">{t('blog.comments') || 'תגובות'} ({comments.length})</h2>
          {comments.map(comment => {
            const commentLiked = forumUser && (comment.likes || []).includes(forumUser.id);
            const isCommentAuthor = forumUser && forumUser.id === comment.authorId;
            const canModifyComment = isCommentAuthor || isForumAdmin;
            const isEditingThis = editingCommentId === comment.id;

            return (
              <div key={comment.id} className="forum-post-card bg-zinc-900/40 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2 text-xs text-zinc-500">
                  <AuthorLink authorId={comment.authorId} authorName={comment.authorName} shortBio={authorProfiles[comment.authorId]?.shortBio} />
                  <span className="flex items-center gap-1"><Clock size={12} /> {formatDate(comment.createdAt)}</span>
                  {comment.editedAt && <span className="text-zinc-600">({t('forum.edited') || 'נערך'})</span>}
                </div>

                {isEditingThis ? (
                  <div className="space-y-3 mt-2">
                    <ForumPostEditor
                      content={editCommentContent}
                      onContentChange={setEditCommentContent}
                      images={editCommentImages}
                      onImagesChange={setEditCommentImages}
                      placeholder={t('blog.commentPlaceholder') || 'כתוב תגובה...'}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => saveEditComment(comment.id)}
                        disabled={editCommentSubmitting || isHtmlContentEmpty(editCommentContent)}
                        className="bg-red-600 hover:bg-red-500 disabled:bg-zinc-700 text-white px-4 py-1.5 rounded-lg font-bold text-sm transition-colors"
                      >
                        {editCommentSubmitting ? (t('saving') || 'שומר...') : (t('save') || 'שמור')}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEditComment}
                        className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-1.5 rounded-lg font-bold text-sm"
                      >
                        {t('cancel') || 'ביטול'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <ForumPostContent content={comment.content} images={comment.images} />
                )}

                <div className="mt-3 pt-2 border-t border-zinc-800/50 flex items-center gap-3">
                  <LikeButton
                    liked={commentLiked}
                    count={comment.likeCount || 0}
                    onToggle={() => handleLikeComment(comment.id)}
                    disabled={!forumUser}
                  />
                  {canModifyComment && !isEditingThis && (
                    <>
                      <button
                        type="button"
                        onClick={() => startEditComment(comment)}
                        className="flex items-center gap-1 text-zinc-500 hover:text-yellow-400 text-sm transition-colors"
                      >
                        <Pencil size={13} />
                        {t('edit') || 'עריכה'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteComment(comment.id)}
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

      {/* Comment form */}
      {canComment && (
        <form onSubmit={handleSubmitComment} className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-4">
          <h3 className="text-lg font-bold text-white">{t('blog.addComment') || 'הוסף תגובה'}</h3>
          <ForumPostEditor
            content={commentContent}
            onContentChange={setCommentContent}
            images={commentImages}
            onImagesChange={setCommentImages}
            placeholder={t('blog.commentPlaceholder') || 'כתוב תגובה...'}
          />
          <button
            type="submit"
            disabled={submitting || isHtmlContentEmpty(commentContent)}
            className="bg-red-600 hover:bg-red-500 disabled:bg-zinc-700 text-white px-6 py-2 rounded-xl font-bold text-sm transition-colors"
          >
            {submitting ? (t('blog.publishing') || 'מפרסם...') : (t('blog.publishComment') || 'שלח תגובה')}
          </button>
        </form>
      )}

      {!forumUser && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-center text-zinc-400 text-sm">
          <button onClick={() => setShowLogin(true)} className="text-red-400 hover:text-red-300 font-bold underline">
            {t('blog.loginToComment') || 'התחבר כדי להגיב'}
          </button>
        </div>
      )}

      <ForumLoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} />
    </div>
  );
};

export default BlogPost;
