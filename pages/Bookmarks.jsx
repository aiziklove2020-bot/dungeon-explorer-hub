import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bookmark, MessageSquare, BookOpen } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useForumAuth } from '../context/ForumAuthContext';
import { getUserBookmarks, removeBookmark } from '../firebase/bookmarks';
import { getTopicById } from '../firebase/forum';
import { getBlogPostById } from '../firebase/blog';
import Loader from '../components/Loader';
import SEO from '../components/SEO';

import { formatDate } from '../utils/dateFormat';

const Bookmarks = () => {
  const { t } = useLanguage();
  const { forumUser } = useForumAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!forumUser?.id) { setLoading(false); return; }
    (async () => {
      const bookmarks = await getUserBookmarks(forumUser.id);
      const resolved = await Promise.all(bookmarks.map(async (b) => {
        try {
          if (b.itemType === 'topic') {
            const topic = await getTopicById(b.itemId);
            return topic ? { ...b, data: topic } : null;
          } else if (b.itemType === 'blogPost') {
            const post = await getBlogPostById(b.itemId);
            return post ? { ...b, data: post } : null;
          }
        } catch { /* ignore */ }
        return null;
      }));
      setItems(resolved.filter(Boolean));
      setLoading(false);
    })();
  }, [forumUser?.id]);

  const handleRemove = async (b) => {
    await removeBookmark(forumUser.id, b.itemType, b.itemId);
    setItems(prev => prev.filter(x => x.id !== b.id));
  };

  const topicItems = items.filter(b => b.itemType === 'topic');
  const blogItems = items.filter(b => b.itemType === 'blogPost');

  return (
    <div className="container mx-auto px-4 max-w-4xl py-8 md:py-12" dir="rtl">
      <SEO title={t('bookmarks.title') || 'מועדפים'} noindex />
      <h1 className="text-3xl md:text-4xl font-black text-white mb-8 flex items-center gap-3">
        <Bookmark size={28} className="text-amber-400" />
        {t('bookmarks.title') || 'מועדפים'}
      </h1>

      {loading ? <Loader /> : !forumUser ? (
        <p className="text-zinc-400 text-center py-16">{t('forum.loginToPost') || 'יש להתחבר'}</p>
      ) : items.length === 0 ? (
        <p className="text-zinc-400 text-center py-16">{t('bookmarks.empty') || 'אין פריטים שמורים'}</p>
      ) : (
        <div className="space-y-8">
          {topicItems.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-zinc-300 mb-3 flex items-center gap-2">
                <MessageSquare size={16} aria-hidden="true" /> {t('bookmarks.forumTopics') || 'נושאים מהפורום'}
              </h2>
              <ul className="space-y-2">
                {topicItems.map(b => (
                  <li key={b.id} className="flex items-center gap-3 bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 hover:border-zinc-600 transition-colors">
                    <Link
                      to={`/forum/${b.data.sectionId}/${b.data.id}`}
                      className="flex-1 min-w-0 no-underline rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-500 focus-visible:outline-offset-2"
                    >
                      <p className="text-white font-bold truncate">{b.data.title}</p>
                      <p className="text-zinc-400 text-xs mt-0.5">{b.data.authorName} · {formatDate(b.data.createdAt)}</p>
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleRemove(b)}
                      className="text-zinc-300 hover:text-red-300 text-xs shrink-0 px-2 py-1"
                      aria-label={`${t('bookmarks.remove') || 'הסר'}: ${b.data.title}`}
                    >
                      {t('bookmarks.remove') || 'הסר'}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {blogItems.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-zinc-300 mb-3 flex items-center gap-2">
                <BookOpen size={16} aria-hidden="true" /> {t('bookmarks.blogPosts') || 'פוסטים מהבלוג'}
              </h2>
              <ul className="space-y-2">
                {blogItems.map(b => (
                  <li key={b.id} className="flex items-center gap-3 bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 hover:border-zinc-600 transition-colors">
                    <Link
                      to={`/blog/${b.data.id}`}
                      className="flex-1 min-w-0 no-underline rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-500 focus-visible:outline-offset-2"
                    >
                      <p className="text-white font-bold truncate">{b.data.title}</p>
                      <p className="text-zinc-400 text-xs mt-0.5">{b.data.authorName} · {formatDate(b.data.createdAt)}</p>
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleRemove(b)}
                      className="text-zinc-300 hover:text-red-300 text-xs shrink-0 px-2 py-1"
                      aria-label={`${t('bookmarks.remove') || 'הסר'}: ${b.data.title}`}
                    >
                      {t('bookmarks.remove') || 'הסר'}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Bookmarks;
