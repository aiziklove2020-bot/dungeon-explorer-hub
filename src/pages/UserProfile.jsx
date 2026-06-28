import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowRight, Pencil, Save, X, MessageSquare, BookOpen, Mail } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useForumAuth } from '../context/ForumAuthContext';
import { getForumUserById, updateForumUserProfile } from '../firebase/forumUsers';
import { getTopicsByAuthor } from '../firebase/forum';
import { getBlogPostsByAuthor } from '../firebase/blog';
import ForumImageUpload from '../components/forum/ForumImageUpload';
import ForumPostContent from '../components/forum/ForumPostContent';
import SpoilerWrapButton from '../components/forum/SpoilerWrapButton';
import Loader from '../components/Loader';
import SEO from '../components/SEO';

const MAX_SHORT_BIO = 60;
const MAX_BIO = 1000;
const MAX_PHOTOS = 3;

import { formatDate } from '../utils/dateFormat';

const UserProfile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { forumUser, isForumAdmin } = useForumAuth();

  const [profileUser, setProfileUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [topics, setTopics] = useState([]);
  const [blogPosts, setBlogPosts] = useState([]);

  const [editing, setEditing] = useState(false);
  const editBioRef = useRef(null);
  const [editShortBio, setEditShortBio] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editPhotos, setEditPhotos] = useState([]);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  const canEdit = forumUser && (forumUser.id === userId || isForumAdmin);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const [user, authorTopics, authorPosts] = await Promise.all([
        getForumUserById(userId),
        getTopicsByAuthor(userId, 5),
        getBlogPostsByAuthor(userId).then(posts => posts.slice(0, 5))
      ]);
      setProfileUser(user);
      setTopics(authorTopics);
      setBlogPosts(authorPosts);
    } catch {
      setProfileUser(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const startEditing = () => {
    setEditShortBio(profileUser?.shortBio || '');
    setEditBio(profileUser?.bio || '');
    setEditPhotos((profileUser?.profilePhotos || []).map(p => ({ url: p.url, isSpoiler: false })));
    setEditing(true);
    setSavedMsg('');
  };

  const cancelEditing = () => {
    setEditing(false);
    setSavedMsg('');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateForumUserProfile(userId, {
        shortBio: editShortBio.slice(0, MAX_SHORT_BIO),
        bio: editBio.slice(0, MAX_BIO),
        profilePhotos: editPhotos.slice(0, MAX_PHOTOS).map(p => ({ url: p.url }))
      });
      setEditing(false);
      setSavedMsg(t('profile.saved') || 'הפרופיל נשמר בהצלחה');
      await loadProfile();
      setTimeout(() => setSavedMsg(''), 3000);
    } catch (err) {
      alert(err.message || 'שגיאה בשמירה');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;

  if (!profileUser) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-400 text-lg mb-4">{t('profile.userNotFound') || 'המשתמש לא נמצא'}</p>
          <button onClick={() => navigate(-1)} className="text-pink-400 hover:underline">
            {t('cancel') || 'חזרה'}
          </button>
        </div>
      </div>
    );
  }

  const photos = profileUser.profilePhotos || [];

  return (
    <>
      <SEO title={`${profileUser.nickname} – ${t('profile.title') || 'פרופיל'}`} noindex />
      <div className="min-h-screen bg-black text-white pb-20" dir="rtl">
        <div className="max-w-2xl mx-auto px-4 pt-6">

          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-zinc-400 hover:text-white mb-4 text-sm">
            <ArrowRight size={16} /> {t('cancel') || 'חזרה'}
          </button>

          {savedMsg && (
            <div className="bg-green-900/40 border border-green-700 text-green-300 text-center text-sm py-2 rounded-lg mb-4">
              {savedMsg}
            </div>
          )}

          {/* Header */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 mb-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
              <div>
                <h1 className="text-2xl font-black text-pink-400">{profileUser.nickname}</h1>
                {!editing && profileUser.shortBio && (
                  <p className="text-zinc-400 text-sm mt-1">{profileUser.shortBio}</p>
                )}
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {forumUser && forumUser.id !== userId && (
                  <button
                    onClick={() => navigate(`/messages/${userId}`)}
                    className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
                  >
                    <Mail size={14} />
                    {t('pm.profileSendMessage') || 'שלח הודעה'}
                  </button>
                )}
                {canEdit && !editing && (
                  <button
                    onClick={startEditing}
                    className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
                  >
                    <Pencil size={14} />
                    {t('profile.editProfile') || 'ערוך פרופיל'}
                  </button>
                )}
              </div>
            </div>

            {editing ? (
              <div className="space-y-4 mt-3">
                {/* Short bio */}
                <div>
                  <label className="text-zinc-400 text-xs font-bold mb-1 block">
                    {t('profile.shortBio') || 'תיאור קצר'} ({editShortBio.length}/{MAX_SHORT_BIO})
                  </label>
                  <input
                    type="text"
                    value={editShortBio}
                    onChange={e => setEditShortBio(e.target.value.slice(0, MAX_SHORT_BIO))}
                    maxLength={MAX_SHORT_BIO}
                    placeholder={t('profile.shortBioPlaceholder') || 'תיאור קצר (עד 60 תווים)'}
                    className="w-full bg-black/40 border border-zinc-700 text-white text-sm px-3 py-2 rounded-lg focus:border-pink-600 outline-none"
                  />
                </div>

                {/* Bio */}
                <div>
                  <label className="text-zinc-400 text-xs font-bold mb-1 block">
                    {t('profile.bio') || 'תיאור מלא'} ({editBio.length}/{MAX_BIO})
                  </label>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <SpoilerWrapButton fieldRef={editBioRef} value={editBio} onValueChange={(v) => setEditBio(v.slice(0, MAX_BIO))} />
                  </div>
                  <textarea
                    ref={editBioRef}
                    value={editBio}
                    onChange={e => setEditBio(e.target.value.slice(0, MAX_BIO))}
                    maxLength={MAX_BIO}
                    rows={5}
                    placeholder={t('profile.bioPlaceholder') || 'ספר/י על עצמך (עד 1000 תווים)'}
                    className="w-full bg-black/40 border border-zinc-700 text-white text-sm px-3 py-2 rounded-lg focus:border-pink-600 outline-none resize-none"
                  />
                </div>

                {/* Photos */}
                <div>
                  <label className="text-zinc-400 text-xs font-bold mb-1 block">
                    {t('profile.photos') || 'תמונות'} ({editPhotos.length}/{MAX_PHOTOS})
                  </label>
                  <ForumImageUpload
                    images={editPhotos}
                    onChange={imgs => setEditPhotos(imgs.slice(0, MAX_PHOTOS))}
                    maxImages={MAX_PHOTOS}
                  />
                </div>

                {/* Save / Cancel */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-1.5 bg-pink-600 hover:bg-pink-500 disabled:bg-zinc-700 text-white px-5 py-2 rounded-lg font-bold text-sm transition-colors"
                  >
                    <Save size={14} />
                    {saving ? (t('saving') || 'שומר...') : (t('profile.saveProfile') || 'שמור פרופיל')}
                  </button>
                  <button
                    onClick={cancelEditing}
                    className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-white px-5 py-2 rounded-lg font-bold text-sm"
                  >
                    <X size={14} />
                    {t('cancel') || 'ביטול'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                {profileUser.bio && (
                  <div className="mt-2 text-zinc-300 text-sm">
                    <ForumPostContent content={profileUser.bio} rootClassName="space-y-0" />
                  </div>
                )}
              </>
            )}
          </div>

          {/* Photos (view mode) */}
          {!editing && photos.length > 0 && (
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 mb-5">
              <h2 className="text-sm font-bold text-zinc-400 mb-3">{t('profile.photos') || 'תמונות'}</h2>
              <div className="flex flex-wrap gap-3">
                {photos.map((p, i) => (
                  <a key={i} href={p.url} target="_blank" rel="noopener noreferrer"
                     className="w-32 h-32 rounded-lg overflow-hidden border border-zinc-700 hover:border-pink-500 transition-colors block">
                    <img
                      src={p.url}
                      alt={`${profileUser?.nickname || t('profile.user') || 'משתמש'} - ${t('profile.photo') || 'תמונה'} ${i + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Recent Forum Topics */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 mb-5">
            <h2 className="text-sm font-bold text-zinc-400 mb-3 flex items-center gap-2">
              <MessageSquare size={14} />
              {t('profile.recentTopics') || 'נושאים אחרונים בפורום'}
            </h2>
            {topics.length === 0 ? (
              <p className="text-zinc-400 text-sm">{t('profile.noTopics') || 'אין נושאים עדיין'}</p>
            ) : (
              <div className="space-y-2">
                {topics.map(topic => (
                  <Link
                    key={topic.id}
                    to={`/forum/${topic.sectionId}/${topic.id}`}
                    className="block bg-black/30 border border-zinc-800 rounded-lg px-4 py-2.5 hover:border-pink-600/50 transition-colors"
                  >
                    <p className="text-white text-sm font-bold truncate">{topic.title}</p>
                    <p className="text-zinc-500 text-xs mt-0.5">{formatDate(topic.createdAt)}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recent Blog Posts */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 mb-5">
            <h2 className="text-sm font-bold text-zinc-400 mb-3 flex items-center gap-2">
              <BookOpen size={14} />
              {t('profile.recentPosts') || 'פוסטים אחרונים בבלוג'}
            </h2>
            {blogPosts.length === 0 ? (
              <p className="text-zinc-400 text-sm">{t('profile.noPosts') || 'אין פוסטים עדיין'}</p>
            ) : (
              <div className="space-y-2">
                {blogPosts.map(post => (
                  <Link
                    key={post.id}
                    to={`/blog/${post.id}`}
                    className="block bg-black/30 border border-zinc-800 rounded-lg px-4 py-2.5 hover:border-pink-600/50 transition-colors"
                  >
                    <p className="text-white text-sm font-bold truncate">{post.title}</p>
                    <p className="text-zinc-500 text-xs mt-0.5">{formatDate(post.createdAt)}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
};

export default UserProfile;
