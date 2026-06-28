import { useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import ChatLobby from '../components/chat/ChatLobby';
import ChatRoomView from '../components/chat/ChatRoomView';
import { useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';
import { useLanguage } from '../i18n/LanguageContext';
import { markChatSeen } from '../utils/chatClient';

const Chat = () => {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    markChatSeen();
  }, [location.pathname]);

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-x-hidden">
      <SEO
        title={`${t('chat.title')} | מדברים BDSM`}
        description={t('chat.subtitle')}
        canonicalPath={roomId ? `/chat/${roomId}` : '/chat'}
        noindex
      />
      {!roomId ? <ChatLobby navigate={navigate} /> : <ChatRoomView roomId={roomId} navigate={navigate} />}
    </div>
  );
};

export default Chat;
