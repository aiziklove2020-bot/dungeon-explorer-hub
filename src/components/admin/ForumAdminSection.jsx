import { useState, useEffect, useRef } from 'react';
import {
  Plus, Trash2, Eye, EyeOff, ChevronUp, ChevronDown, Pin, Lock,
  ArrowRight, Pencil, Save, X, MessageSquare
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import useAdminSection from '../../hooks/useAdminSection';
import AdminLoader from './AdminLoader';
import ForumPostContent from '../forum/ForumPostContent';
import RichQuotePreview from '../forum/RichQuotePreview';
import SpoilerWrapButton from '../forum/SpoilerWrapButton';
import {
  getForumSections,
  createForumSection,
  updateForumSection,
  deleteForumSection,
  reorderForumSections,
  getTopicsBySection,
  updateTopic,
  deleteTopic,
  togglePinTopic,
  toggleLockTopic,
  getRepliesByTopic,
  updateReply,
  deleteReply
} from '../../firebase/forum';

const ForumAdminSection = ({ showSaved }) => {
  const { t } = useLanguage();
  const editTopicContentRef = useRef(null);
  const editReplyContentRef = useRef(null);
  const { data: sectionsData, loading, reload: reloadSections } = useAdminSection(getForumSections);
  const [sections, setSections] = useState([]);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');

  // Drill-down state
  const [viewSection, setViewSection] = useState(null);
  const [topics, setTopics] = useState([]);
  const [topicsLoading, setTopicsLoading] = useState(false);

  const [viewTopic, setViewTopic] = useState(null);
  const [replies, setReplies] = useState([]);
  const [repliesLoading, setRepliesLoading] = useState(false);

  // Editing
  const [editingSectionId, setEditingSectionId] = useState(null);
  const [editSectionForm, setEditSectionForm] = useState({ title: '', description: '' });
  const [editingTopicId, setEditingTopicId] = useState(null);
  const [editTopicForm, setEditTopicForm] = useState({ title: '', content: '' });
  const [editingReplyId, setEditingReplyId] = useState(null);
  const [editReplyContent, setEditReplyContent] = useState('');

  useEffect(() => { if (sectionsData) setSections(sectionsData); }, [sectionsData]);

  // ---- Section management ----

  const handleCreateSection = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    await createForumSection({ title: newTitle.trim(), description: newDesc.trim() });
    setNewTitle('');
    setNewDesc('');
    reloadSections();
    showSaved();
  };

  const handleDeleteSection = async (id, title) => {
    if (!confirm(`למחוק את המדור "${title}" וכל הנושאים והתגובות שבו?`)) return;
    await deleteForumSection(id);
    reloadSections();
    showSaved();
  };

  const handleToggleVisibility = async (id, currentlyVisible) => {
    await updateForumSection(id, { visible: !currentlyVisible });
    reloadSections();
    showSaved();
  };

  const handleMoveSection = async (idx, direction) => {
    const ids = sections.map(s => s.id);
    const swapIdx = idx + direction;
    if (swapIdx < 0 || swapIdx >= ids.length) return;
    [ids[idx], ids[swapIdx]] = [ids[swapIdx], ids[idx]];
    await reorderForumSections(ids);
    reloadSections();
    showSaved();
  };

  const startEditSection = (sec) => {
    setEditingSectionId(sec.id);
    setEditSectionForm({ title: sec.title || '', description: sec.description || '' });
  };

  const saveEditSection = async () => {
    await updateForumSection(editingSectionId, editSectionForm);
    setEditingSectionId(null);
    reloadSections();
    showSaved();
  };

  // ---- Topic drill-down ----

  const openSection = async (sec) => {
    setViewSection(sec);
    setViewTopic(null);
    setTopicsLoading(true);
    const tops = await getTopicsBySection(sec.id);
    setTopics(tops);
    setTopicsLoading(false);
  };

  const handleDeleteTopic = async (topicId) => {
    if (!confirm('למחוק נושא זה וכל התגובות?')) return;
    await deleteTopic(topicId);
    const tops = await getTopicsBySection(viewSection.id);
    setTopics(tops);
    reloadSections();
    showSaved();
  };

  const handleTogglePin = async (topicId) => {
    await togglePinTopic(topicId);
    const tops = await getTopicsBySection(viewSection.id);
    setTopics(tops);
    showSaved();
  };

  const handleToggleLock = async (topicId) => {
    await toggleLockTopic(topicId);
    const tops = await getTopicsBySection(viewSection.id);
    setTopics(tops);
    showSaved();
  };

  const startEditTopic = (topic) => {
    setEditingTopicId(topic.id);
    setEditTopicForm({ title: topic.title || '', content: topic.content || '' });
  };

  const saveEditTopic = async () => {
    await updateTopic(editingTopicId, editTopicForm);
    setEditingTopicId(null);
    const tops = await getTopicsBySection(viewSection.id);
    setTopics(tops);
    showSaved();
  };

  // ---- Reply drill-down ----

  const openTopic = async (topic) => {
    setViewTopic(topic);
    setRepliesLoading(true);
    const reps = await getRepliesByTopic(topic.id);
    setReplies(reps);
    setRepliesLoading(false);
  };

  const handleDeleteReply = async (replyId) => {
    if (!confirm('למחוק תגובה זו?')) return;
    await deleteReply(replyId);
    const reps = await getRepliesByTopic(viewTopic.id);
    setReplies(reps);
    showSaved();
  };

  const startEditReply = (reply) => {
    setEditingReplyId(reply.id);
    setEditReplyContent(reply.content || '');
  };

  const saveEditReply = async () => {
    await updateReply(editingReplyId, { content: editReplyContent });
    setEditingReplyId(null);
    const reps = await getRepliesByTopic(viewTopic.id);
    setReplies(reps);
    showSaved();
  };

  const formatDate = (ts) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts.seconds ? ts.seconds * 1000 : ts);
    return d.toLocaleDateString('he-IL', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  // ---- Render: Replies list ----
  if (viewTopic) {
    return (
      <div className="bg-[#121218] backdrop-blur-2xl border border-white/5 p-4 md:p-6 rounded-xl md:rounded-2xl space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => setViewTopic(null)} className="text-[#a9a9b2] hover:text-white"><ArrowRight size={20} /></button>
          <h2 className="text-xl font-bold">{viewTopic.title}</h2>
        </div>

        <div className="bg-[#1f1f23]/80 border border-[rgba(255,255,255,0.08)] rounded-xl p-4 mb-4">
          <p className="text-[#94A3B8] text-xs mb-2">{viewTopic.authorName} ({viewTopic.authorId}) &middot; {formatDate(viewTopic.createdAt)}</p>
          <ForumPostContent content={viewTopic.content} images={viewTopic.images} uncensored />
        </div>

        <h3 className="text-lg font-bold">תגובות ({replies.length})</h3>

        {repliesLoading ? <AdminLoader /> : replies.length === 0 ? (
          <p className="text-[#94A3B8] text-sm text-center py-8">אין תגובות</p>
        ) : (
          <div className="space-y-3">
            {replies.map(reply => (
              <div key={reply.id} className="bg-[#1f1f23]/80 border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
                {editingReplyId === reply.id ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <SpoilerWrapButton
                        fieldRef={editReplyContentRef}
                        value={editReplyContent}
                        onValueChange={setEditReplyContent}
                      />
                    </div>
                    <textarea
                      ref={editReplyContentRef}
                      value={editReplyContent}
                      onChange={(e) => setEditReplyContent(e.target.value)}
                      rows={4}
                      className="w-full bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] text-white text-sm p-3 rounded-xl focus:border-[#e11d48] outline-none text-right"
                    />
                    <div className="flex gap-2">
                      <button onClick={saveEditReply} className="bg-[#e11d48] hover:bg-[#be0037] text-white px-4 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1"><Save size={14} /> שמור</button>
                      <button onClick={() => setEditingReplyId(null)} className="bg-[#1f1f23] hover:bg-[#2a292e] text-white px-4 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1"><X size={14} /> ביטול</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-[#94A3B8] text-xs mb-2">
                      <span className="text-[#e4e1e7] font-bold">{reply.authorName}</span> (ID: {reply.authorId})
                      &middot; {formatDate(reply.createdAt)}
                      {reply.editedAt && <span className="text-yellow-600"> (נערך)</span>}
                    </p>
                    {reply.quotedContent && (
                      <div className="border-r-2 border-[#e11d48] bg-[#1f1f23]/50 rounded px-3 py-2 mb-2 text-xs">
                        <span className="font-bold text-[#e4e1e7]">{reply.quotedAuthorName}:</span>
                        <RichQuotePreview content={reply.quotedContent} className="text-[11px] mt-1" />
                      </div>
                    )}
                    <ForumPostContent content={reply.content} images={reply.images} uncensored />
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => startEditReply(reply)} className="bg-[#1f1f23] hover:bg-[#2a292e] text-white px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1"><Pencil size={12} /> ערוך</button>
                      <button onClick={() => handleDeleteReply(reply.id)} className="bg-[#93000a] hover:bg-[#be0037] text-white px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1"><Trash2 size={12} /> מחק</button>
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

  // ---- Render: Topics list ----
  if (viewSection) {
    return (
      <div className="bg-[#121218] backdrop-blur-2xl border border-white/5 p-4 md:p-6 rounded-xl md:rounded-2xl space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => setViewSection(null)} className="text-[#a9a9b2] hover:text-white"><ArrowRight size={20} /></button>
          <h2 className="text-xl font-bold">נושאים: {viewSection.title}</h2>
        </div>

        {topicsLoading ? <AdminLoader /> : topics.length === 0 ? (
          <p className="text-[#94A3B8] text-sm text-center py-8">אין נושאים במדור זה</p>
        ) : (
          <div className="space-y-3">
            {topics.map(topic => (
              <div key={topic.id} className="bg-[#1f1f23]/80 border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
                {editingTopicId === topic.id ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editTopicForm.title}
                      onChange={(e) => setEditTopicForm({ ...editTopicForm, title: e.target.value })}
                      className="w-full bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] text-white text-sm p-3 rounded-xl focus:border-[#e11d48] outline-none text-right"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <SpoilerWrapButton
                        fieldRef={editTopicContentRef}
                        value={editTopicForm.content}
                        onValueChange={(content) => setEditTopicForm((prev) => ({ ...prev, content }))}
                      />
                    </div>
                    <textarea
                      ref={editTopicContentRef}
                      value={editTopicForm.content}
                      onChange={(e) => setEditTopicForm({ ...editTopicForm, content: e.target.value })}
                      rows={4}
                      className="w-full bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] text-white text-sm p-3 rounded-xl focus:border-[#e11d48] outline-none text-right"
                    />
                    <div className="flex gap-2">
                      <button onClick={saveEditTopic} className="bg-[#e11d48] hover:bg-[#be0037] text-white px-4 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1"><Save size={14} /> שמור</button>
                      <button onClick={() => setEditingTopicId(null)} className="bg-[#1f1f23] hover:bg-[#2a292e] text-white px-4 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1"><X size={14} /> ביטול</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {topic.isPinned && <Pin size={14} className="text-yellow-400" />}
                          {topic.isLocked && <Lock size={14} className="text-[#94A3B8]" />}
                          <h3 className="font-bold text-white truncate">{topic.title}</h3>
                        </div>
                        <p className="text-[#94A3B8] text-xs">
                          {topic.authorName} (ID: {topic.authorId}) &middot; {formatDate(topic.createdAt)}
                          &middot; {topic.replyCount || 0} תגובות &middot; {topic.likeCount || 0} לייקים
                        </p>
                      </div>
                      <button onClick={() => openTopic(topic)} className="bg-[#1f1f23] hover:bg-[#2a292e] text-white px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
                        <MessageSquare size={12} /> צפה בתגובות
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <button onClick={() => startEditTopic(topic)} className="bg-[#1f1f23] hover:bg-[#2a292e] text-white px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1"><Pencil size={12} /> ערוך</button>
                      <button onClick={() => handleTogglePin(topic.id)} className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 ${topic.isPinned ? 'bg-yellow-600 hover:bg-yellow-500 text-white' : 'bg-[#1f1f23] hover:bg-[#2a292e] text-white'}`}>
                        <Pin size={12} /> {topic.isPinned ? 'בטל נעיצה' : 'נעץ'}
                      </button>
                      <button onClick={() => handleToggleLock(topic.id)} className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 ${topic.isLocked ? 'bg-[#353439] hover:bg-[#39393d] text-white' : 'bg-[#1f1f23] hover:bg-[#2a292e] text-white'}`}>
                        <Lock size={12} /> {topic.isLocked ? 'בטל נעילה' : 'נעל'}
                      </button>
                      <button onClick={() => handleDeleteTopic(topic.id)} className="bg-[#93000a] hover:bg-[#be0037] text-white px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1"><Trash2 size={12} /> מחק</button>
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

  // ---- Render: Sections list ----
  return (
    <div className="bg-[#121218] backdrop-blur-2xl border border-white/5 p-4 md:p-6 rounded-xl md:rounded-2xl space-y-4 md:space-y-6">
      <div className="flex items-center gap-3">
        <h2 className="text-xl md:text-2xl font-bold">ניהול פורום</h2>
        <span className="px-2.5 py-1 rounded-full bg-[#1f1f23] text-[#94A3B8] text-xs font-bold">
          {sections.filter(s => s.visible !== false).length} מדורים גלויים מתוך {sections.length}
        </span>
      </div>

      {/* Create section */}
      <form onSubmit={handleCreateSection} className="bg-[#1f1f23]/80 border border-[rgba(255,255,255,0.08)] rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-bold text-[#a9a9b2]">הוסף מדור חדש</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="שם המדור"
            className="bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] text-white text-sm p-3 rounded-xl focus:border-[#e11d48] outline-none text-right"
            required
          />
          <input
            type="text"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="תיאור (אופציונלי)"
            className="bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] text-white text-sm p-3 rounded-xl focus:border-[#e11d48] outline-none text-right"
          />
        </div>
        <button type="submit" className="bg-[#e11d48] hover:bg-[#be0037] text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-1">
          <Plus size={16} /> הוסף מדור
        </button>
      </form>

      {/* Sections list */}
      {loading ? <AdminLoader /> : sections.length === 0 ? (
        <p className="text-[#94A3B8] text-sm text-center py-8">אין מדורים עדיין</p>
      ) : (
        <div className="space-y-3">
          {sections.map((sec, idx) => (
            <div key={sec.id} className={`bg-[#1f1f23]/80 border rounded-xl p-4 ${sec.visible === false ? 'border-[rgba(255,255,255,0.08)] opacity-60' : 'border-[rgba(255,255,255,0.08)]'}`}>
              {editingSectionId === sec.id ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editSectionForm.title}
                    onChange={(e) => setEditSectionForm({ ...editSectionForm, title: e.target.value })}
                    className="w-full bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] text-white text-sm p-3 rounded-xl focus:border-[#e11d48] outline-none text-right"
                  />
                  <input
                    type="text"
                    value={editSectionForm.description}
                    onChange={(e) => setEditSectionForm({ ...editSectionForm, description: e.target.value })}
                    className="w-full bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] text-white text-sm p-3 rounded-xl focus:border-[#e11d48] outline-none text-right"
                  />
                  <div className="flex gap-2">
                    <button onClick={saveEditSection} className="bg-[#e11d48] hover:bg-[#be0037] text-white px-4 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1"><Save size={14} /> שמור</button>
                    <button onClick={() => setEditingSectionId(null)} className="bg-[#1f1f23] hover:bg-[#2a292e] text-white px-4 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1"><X size={14} /> ביטול</button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-center gap-3">
                  <button
                    type="button"
                    onClick={() => openSection(sec)}
                    className="flex-1 min-w-0 text-right cursor-pointer bg-transparent border-0 p-0 m-0"
                    aria-label={`${t('a11y.openSection') || 'פתח מדור'}: ${sec.title}`}
                  >
                    <h3 className="font-bold text-white hover:text-[#ffb4ab] transition-colors">{sec.title}</h3>
                    {sec.description && <p className="text-[#a9a9b2] text-xs mt-0.5">{sec.description}</p>}
                    <p className="text-[#a9a9b2] text-xs mt-1">{sec.topicCount || 0} נושאים {sec.visible === false && ' • מוסתר'}</p>
                  </button>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleMoveSection(idx, -1)}
                      disabled={idx === 0}
                      aria-disabled={idx === 0}
                      aria-label={t('a11y.moveUp')}
                      className="p-1 text-[#a9a9b2] hover:text-white disabled:text-[#5c3f40]"
                    >
                      <ChevronUp size={16} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveSection(idx, 1)}
                      disabled={idx === sections.length - 1}
                      aria-disabled={idx === sections.length - 1}
                      aria-label={t('a11y.moveDown')}
                      className="p-1 text-[#a9a9b2] hover:text-white disabled:text-[#5c3f40]"
                    >
                      <ChevronDown size={16} aria-hidden="true" />
                    </button>
                    <button type="button" onClick={() => startEditSection(sec)} className="p-1 text-[#a9a9b2] hover:text-white" aria-label={t('a11y.edit')}>
                      <Pencil size={16} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleVisibility(sec.id, sec.visible !== false)}
                      className="p-1 text-[#a9a9b2] hover:text-white"
                      aria-label={sec.visible === false ? (t('show') || 'הצג') : (t('hide') || 'הסתר')}
                      aria-pressed={sec.visible === false}
                    >
                      {sec.visible === false ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                    </button>
                    <button type="button" onClick={() => handleDeleteSection(sec.id, sec.title)} className="p-1 text-[#ffb4ab] hover:text-[#ffb4ab]" aria-label={`${t('a11y.delete')}: ${sec.title}`}>
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ForumAdminSection;
