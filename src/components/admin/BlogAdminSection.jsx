import { useState, useEffect, useRef } from 'react';
import { Trash2, ArrowRight, Pencil, Save, X, MessageSquare } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import useAdminSection from '../../hooks/useAdminSection';
import AdminLoader from './AdminLoader';
import ForumPostContent from '../forum/ForumPostContent';
import SpoilerWrapButton from '../forum/SpoilerWrapButton';
import {
  getBlogPosts,
  updateBlogPost,
  deleteBlogPost,
  getCommentsByPost,
  updateBlogComment,
  deleteBlogComment
} from '../../firebase/blog';
import { formatDateTime as formatDate } from '../../utils/dateFormat';

const BlogAdminSection = ({ showSaved }) => {
  const { t } = useLanguage();
  const editPostContentRef = useRef(null);
  const editCommentContentRef = useRef(null);
  const { data: postsData, loading, reload: reloadPosts } = useAdminSection(getBlogPosts);
  const [posts, setPosts] = useState([]);

  // Drill-down
  const [viewPost, setViewPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);

  // Editing
  const [editingPostId, setEditingPostId] = useState(null);
  const [editPostForm, setEditPostForm] = useState({ title: '', content: '' });
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentContent, setEditCommentContent] = useState('');

  useEffect(() => { if (postsData) setPosts(postsData); }, [postsData]);


  // ---- Post actions ----

  const handleDeletePost = async (postId) => {
    if (!confirm('למחוק את הפוסט וכל התגובות?')) return;
    await deleteBlogPost(postId);
    reloadPosts();
    showSaved();
  };

  const startEditPost = (post) => {
    setEditingPostId(post.id);
    setEditPostForm({ title: post.title || '', content: post.content || '' });
  };

  const saveEditPost = async () => {
    await updateBlogPost(editingPostId, editPostForm);
    setEditingPostId(null);
    reloadPosts();
    showSaved();
  };

  // ---- Comments drill-down ----

  const openPost = async (post) => {
    setViewPost(post);
    setCommentsLoading(true);
    const c = await getCommentsByPost(post.id);
    setComments(c);
    setCommentsLoading(false);
  };

  const handleDeleteComment = async (commentId) => {
    if (!confirm('למחוק תגובה זו?')) return;
    await deleteBlogComment(commentId);
    const c = await getCommentsByPost(viewPost.id);
    setComments(c);
    showSaved();
  };

  const startEditComment = (comment) => {
    setEditingCommentId(comment.id);
    setEditCommentContent(comment.content || '');
  };

  const saveEditComment = async () => {
    await updateBlogComment(editingCommentId, { content: editCommentContent });
    setEditingCommentId(null);
    const c = await getCommentsByPost(viewPost.id);
    setComments(c);
    showSaved();
  };

  // ---- Render: Comments list ----
  if (viewPost) {
    return (
      <div className="bg-[#121218] backdrop-blur-2xl border border-white/5 p-4 md:p-6 rounded-xl md:rounded-2xl space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => setViewPost(null)} className="text-[#a9a9b2] hover:text-white"><ArrowRight size={20} /></button>
          <h2 className="text-xl font-bold truncate">{viewPost.title}</h2>
        </div>

        <div className="bg-[#1f1f23]/80 border border-[rgba(255,255,255,0.08)] rounded-xl p-4 mb-4">
          <p className="text-[#94A3B8] text-xs mb-2">{viewPost.authorName} ({viewPost.authorId}) &middot; {formatDate(viewPost.createdAt)}</p>
          <ForumPostContent content={viewPost.content} images={viewPost.images} uncensored />
        </div>

        <h3 className="text-lg font-bold">תגובות ({comments.length})</h3>

        {commentsLoading ? <AdminLoader /> : comments.length === 0 ? (
          <p className="text-[#94A3B8] text-sm text-center py-8">אין תגובות</p>
        ) : (
          <div className="space-y-3">
            {comments.map(comment => (
              <div key={comment.id} className="bg-[#1f1f23]/80 border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
                {editingCommentId === comment.id ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <SpoilerWrapButton
                        fieldRef={editCommentContentRef}
                        value={editCommentContent}
                        onValueChange={setEditCommentContent}
                      />
                    </div>
                    <textarea
                      ref={editCommentContentRef}
                      value={editCommentContent}
                      onChange={(e) => setEditCommentContent(e.target.value)}
                      rows={4}
                      className="w-full bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] text-white text-sm p-3 rounded-xl focus:border-[#e11d48] outline-none text-right"
                    />
                    <div className="flex gap-2">
                      <button onClick={saveEditComment} className="bg-[#e11d48] hover:bg-[#be0037] text-white px-4 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1"><Save size={14} /> שמור</button>
                      <button onClick={() => setEditingCommentId(null)} className="bg-[#1f1f23] hover:bg-[#2a292e] text-white px-4 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1"><X size={14} /> ביטול</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-[#94A3B8] text-xs mb-2">
                      <span className="text-[#e4e1e7] font-bold">{comment.authorName}</span> (ID: {comment.authorId})
                      &middot; {formatDate(comment.createdAt)}
                      {comment.editedAt && <span className="text-yellow-600"> (נערך)</span>}
                    </p>
                    <ForumPostContent content={comment.content} images={comment.images} uncensored />
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => startEditComment(comment)} className="bg-[#1f1f23] hover:bg-[#2a292e] text-white px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1"><Pencil size={12} /> ערוך</button>
                      <button onClick={() => handleDeleteComment(comment.id)} className="bg-[#93000a] hover:bg-[#be0037] text-white px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1"><Trash2 size={12} /> מחק</button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ---- Render: Posts list ----
  return (
    <div className="bg-[#121218] backdrop-blur-2xl border border-white/5 p-4 md:p-6 rounded-xl md:rounded-2xl space-y-4 md:space-y-6">
      <h2 className="text-xl md:text-2xl font-bold">ניהול בלוג</h2>

      {loading ? <AdminLoader /> : posts.length === 0 ? (
        <p className="text-[#94A3B8] text-sm text-center py-8">אין פוסטים עדיין</p>
      ) : (
        <div className="space-y-3">
          {posts.map(post => (
            <div key={post.id} className="bg-[#1f1f23]/80 border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
              {editingPostId === post.id ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editPostForm.title}
                    onChange={(e) => setEditPostForm({ ...editPostForm, title: e.target.value })}
                    className="w-full bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] text-white text-sm p-3 rounded-xl focus:border-[#e11d48] outline-none text-right"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <SpoilerWrapButton
                      fieldRef={editPostContentRef}
                      value={editPostForm.content}
                      onValueChange={(content) => setEditPostForm((prev) => ({ ...prev, content }))}
                    />
                  </div>
                  <textarea
                    ref={editPostContentRef}
                    value={editPostForm.content}
                    onChange={(e) => setEditPostForm({ ...editPostForm, content: e.target.value })}
                    rows={5}
                    className="w-full bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] text-white text-sm p-3 rounded-xl focus:border-[#e11d48] outline-none text-right"
                  />
                  <div className="flex gap-2">
                    <button onClick={saveEditPost} className="bg-[#e11d48] hover:bg-[#be0037] text-white px-4 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1"><Save size={14} /> שמור</button>
                    <button onClick={() => setEditingPostId(null)} className="bg-[#1f1f23] hover:bg-[#2a292e] text-white px-4 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1"><X size={14} /> ביטול</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-white truncate">{post.title}</h3>
                      <p className="text-[#94A3B8] text-xs mt-1">
                        {post.authorName} (ID: {post.authorId}) &middot; {formatDate(post.createdAt)}
                        &middot; {post.commentCount || 0} תגובות &middot; {post.likeCount || 0} לייקים
                      </p>
                    </div>
                    <button onClick={() => openPost(post)} className="bg-[#1f1f23] hover:bg-[#2a292e] text-white px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shrink-0">
                      <MessageSquare size={12} /> תגובות
                    </button>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => startEditPost(post)} className="bg-[#1f1f23] hover:bg-[#2a292e] text-white px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1"><Pencil size={12} /> ערוך</button>
                    <button onClick={() => handleDeletePost(post.id)} className="bg-[#93000a] hover:bg-[#be0037] text-white px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1"><Trash2 size={12} /> מחק</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BlogAdminSection;
