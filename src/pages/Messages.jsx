import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, ArrowRight, Mail } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useForumAuth } from '../context/ForumAuthContext';
import { getConversations, getMessagesWithUser, sendPrivateMessage, markConversationRead } from '../firebase/privateMessages';
import { getForumUserById } from '../firebase/forumUsers';
import { createNotification } from '../firebase/notifications';
import Loader from '../components/Loader';
import SEO from '../components/SEO';
import ForumPostContent from '../components/forum/ForumPostContent';
import SpoilerWrapButton from '../components/forum/SpoilerWrapButton';

const formatTime = (ts) => {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts.seconds ? ts.seconds * 1000 : ts);
  return d.toLocaleDateString('he-IL', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
};

const Messages = () => {
  const { userId: otherUserId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { forumUser } = useForumAuth();

  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [otherUser, setOtherUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const messageInputRef = useRef(null);

  const isSelf = forumUser?.id && otherUserId && forumUser.id === otherUserId;
  const inConversation = !!otherUserId && !isSelf;

  useEffect(() => {
    if (!forumUser?.id) { setLoading(false); return; }
    if (inConversation) {
      (async () => {
        const [msgs, user] = await Promise.all([
          getMessagesWithUser(forumUser.id, otherUserId),
          getForumUserById(otherUserId)
        ]);
        setMessages(msgs);
        setOtherUser(user);
        setLoading(false);
        markConversationRead(forumUser.id, otherUserId).catch(() => {});
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      })();
    } else {
      (async () => {
        const convs = await getConversations(forumUser.id);
        const needName = convs.filter(c => !c.otherUserName);
        if (needName.length > 0) {
          const resolved = await Promise.all(needName.map(c => getForumUserById(c.otherUserId)));
          resolved.forEach((u, i) => {
            if (u?.nickname) needName[i].otherUserName = u.nickname;
          });
        }
        setConversations(convs);
        setLoading(false);
      })();
    }
  }, [forumUser?.id, otherUserId, inConversation]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!content.trim() || !forumUser?.id || sending) return;
    setSending(true);
    try {
      await sendPrivateMessage(forumUser.id, otherUserId, forumUser.nickname, content);
      createNotification({ userId: otherUserId, type: 'pm', fromUserId: forumUser.id, fromUserName: forumUser.nickname, refId: forumUser.id, message: t('pm.newMessage') || 'הודעה חדשה' }).catch(() => {});
      setContent('');
      const msgs = await getMessagesWithUser(forumUser.id, otherUserId);
      setMessages(msgs);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch { /* ignore */ }
    setSending(false);
  };

  if (!forumUser) return <div className="text-center py-16 text-zinc-500">{t('forum.loginToPost') || 'יש להתחבר'}</div>;

  return (
    <div className="container mx-auto px-4 max-w-2xl py-8 md:py-12" dir="rtl">
      <SEO title={t('pm.title') || 'הודעות פרטיות'} noindex />

      {inConversation ? (
        <>
          <div className="flex items-center gap-3 mb-6">
            <button
              type="button"
              onClick={() => navigate('/messages')}
              className="text-zinc-400 hover:text-white p-2 -m-2"
              aria-label={t('a11y.back')}
            >
              <ArrowRight size={20} aria-hidden="true" />
            </button>
            <h1 className="text-xl font-black text-white">{otherUser?.nickname || '...'}</h1>
          </div>

          {loading ? <Loader /> : (
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 mb-4 max-h-[60vh] overflow-y-auto">
              {messages.length === 0 ? (
                <p className="text-zinc-500 text-sm text-center py-8">{t('pm.noMessages') || 'אין הודעות'}</p>
              ) : (
                <div className="space-y-3">
                  {messages.map(msg => {
                    const isMine = msg.senderId === forumUser.id;
                    return (
                      <div key={msg.id} className={`flex ${isMine ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-[75%] rounded-xl px-3.5 py-2 ${isMine ? 'bg-red-600/20 border border-red-800/30' : 'bg-zinc-800 border border-zinc-700'}`}>
                          <div className="text-white text-sm [&_.forum-html-content]:text-white [&_span]:text-inherit">
                            <ForumPostContent content={msg.content} rootClassName="space-y-0" />
                          </div>
                          <p className="text-zinc-500 text-[10px] mt-1">{formatTime(msg.createdAt)}</p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSend} className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <SpoilerWrapButton fieldRef={messageInputRef} value={content} onValueChange={setContent} />
            </div>
            <div className="flex items-start gap-2">
              <label htmlFor="messages-pm-textarea" className="sr-only">
                {t('pm.messagePlaceholder') || 'כתוב הודעה...'}
              </label>
              <textarea
                id="messages-pm-textarea"
                ref={messageInputRef}
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder={t('pm.messagePlaceholder') || 'כתוב הודעה...'}
                maxLength={2000}
                rows={2}
                className="flex-1 min-h-[44px] max-h-40 resize-y bg-black/40 border border-zinc-700 text-white text-sm px-4 py-2.5 rounded-xl focus:border-red-600 outline-none text-right"
              />
              <button
                type="submit"
                disabled={sending || !content.trim()}
                aria-disabled={sending || !content.trim()}
                aria-label={t('a11y.send')}
                className="bg-red-600 hover:bg-red-500 disabled:bg-zinc-700 text-white p-2.5 rounded-xl transition-colors shrink-0 mt-0.5"
              >
                <Send size={18} aria-hidden="true" />
              </button>
            </div>
          </form>
        </>
      ) : (
        <>
          <h1 className="text-3xl md:text-4xl font-black text-white mb-8 flex items-center gap-3">
            <Mail size={28} className="text-red-400" />
            {t('pm.conversations') || 'שיחות'}
          </h1>

          {loading ? <Loader /> : conversations.length === 0 ? (
            <p className="text-zinc-500 text-center py-16">{t('pm.noConversations') || 'אין שיחות'}</p>
          ) : (
            <div className="space-y-2">
              {conversations.map(conv => (
                <button
                  key={conv.otherUserId}
                  onClick={() => navigate(`/messages/${conv.otherUserId}`)}
                  className={`w-full text-right bg-zinc-900/60 border rounded-xl p-4 transition-colors hover:border-zinc-600 ${conv.unread ? 'border-red-600/40 bg-zinc-900/80' : 'border-zinc-800'}`}
                >
                  <div className="flex justify-between items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold text-sm">{conv.otherUserName || conv.otherUserId}</p>
                      <p className="text-zinc-500 text-xs truncate mt-0.5">{conv.lastMessage}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-zinc-600 text-[10px]">{formatTime(conv.lastAt)}</span>
                      {conv.unread && <span className="w-2 h-2 bg-red-500 rounded-full" />}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Messages;
