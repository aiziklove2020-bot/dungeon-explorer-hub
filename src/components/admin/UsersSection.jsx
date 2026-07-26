import { useState, useEffect, useRef } from 'react';
import { RotateCcw, Search, Download, Upload, Shield, ShieldOff, Ban, CheckCircle, Trash2, MessageSquare, MessageSquareOff, KeyRound, Mail, MailCheck, Database, UserCog } from 'lucide-react';
import UserCrmModal from './UserCrmModal';
import { useLanguage } from '../../i18n/LanguageContext';
import Loader from '../Loader';
import useAdminSection from '../../hooks/useAdminSection';
import AdminLoader from './AdminLoader';
import PhoneLink from '../PhoneLink';
import { 
  getAllUsers, 
  updateUserLevel, 
  updateUserDetails, 
  deleteUser, 
  importUsers
} from '../../firebase/users';
import { 
  getActiveParties, 
  adminRemoveUserFromParty, 
  getBalanceMatches, 
  saveBalanceMatches 
} from '../../firebase/parties';
import {
  getAllForumUsers,
  blockForumUser,
  unblockForumUser,
  setForumUserRole,
  deleteForumUser,
  linkForumUserToSiteUser,
  registerForumUser,
  setForumUserPasswordWithReset,
  setForumUserEmail,
  adminMarkForumEmailVerified,
  backfillForumNicknameLower
} from '../../firebase/forumUsers';
import { purgeForumUserFromChat } from '../../firebase/liveChat';
import SubscriptionBadge from './SubscriptionBadge';
import SubscriptionEditor from './SubscriptionEditor';
import { addOrExtendSubscription, setSubscriptionExpiry, removeSubscription, getSubscription } from '../../firebase/subscriptions';

const UsersSection = ({ showSaved }) => {
  const { t } = useLanguage();
  const { data: usersData, loading: loadingUsers, reload: reloadUsers } = useAdminSection(getAllUsers);
  const [users, setUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [crmUser, setCrmUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [forumFilter, setForumFilter] = useState('');
  const [subFilter, setSubFilter] = useState('');
  const [importing, setImporting] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const fileInputRef = useRef(null);
  const [editUserForm, setEditUserForm] = useState({
    name: '',
    phoneNumber: '',
    gender: '',
    telegramUsername: '',
    subscriptionEndDate: ''
  });

  // Forum users mapped by linkedUserId for quick lookup
  const [forumUsersMap, setForumUsersMap] = useState({});

  const toDateInputValue = (value) => {
    if (!value) return '';
    if (value?.seconds) {
      return new Date(value.seconds * 1000).toISOString().split('T')[0];
    }
    if (value instanceof Date) {
      return value.toISOString().split('T')[0];
    }
    if (typeof value === 'string') {
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) return d.toISOString().split('T')[0];
    }
    return '';
  };

  useEffect(() => {
    if (usersData) setUsers(usersData);
  }, [usersData]);

  const loadUsers = reloadUsers;

  const loadForumUsers = async () => {
    try {
      const all = await getAllForumUsers();
      const map = {};
      all.forEach(fu => {
        if (fu.linkedUserId) {
          map[fu.linkedUserId] = fu;
        }
      });
      setForumUsersMap(map);
    } catch (err) {
      console.error('Error loading forum users:', err);
    }
  };

  useEffect(() => {
    loadForumUsers();
  }, []);

  const handleEditUser = (user) => {
    setEditingUser(user);
    const expiryDate = toDateInputValue(user.registrationExpiry);
    setEditUserForm({
      name: user.name || '',
      phoneNumber: user.phoneNumber || '',
      gender: user.gender || '',
      telegramUsername: user.telegramUsername || '',
      subscriptionEndDate: expiryDate
    });
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setEditUserForm({ name: '', phoneNumber: '', gender: '', telegramUsername: '', subscriptionEndDate: '' });
  };

  const handlePhoneChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 0 && !value.startsWith('0')) value = '0' + value;
    if (value.length > 10) value = value.substring(0, 10);
    setEditUserForm({ ...editUserForm, phoneNumber: value });
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (!editingUser?.id) return;
    try {
      const updateData = {
        name: editUserForm.name,
        phoneNumber: editUserForm.phoneNumber,
        gender: editUserForm.gender,
        telegramUsername: editUserForm.telegramUsername || null
      };
      if (editUserForm.subscriptionEndDate) {
        updateData.registrationExpiry = new Date(`${editUserForm.subscriptionEndDate}T00:00:00.000Z`).toISOString();
      }
      await updateUserDetails(editingUser.id, updateData);
      setEditingUser(null);
      loadUsers();
      showSaved();
    } catch (error) {
      alert(`${t('admin.errorSavingUser')}: ${error.message}`);
    }
  };

  const handleSubscriptionAction = async (userId, kind, action, payload) => {
    try {
      if (action === 'extend') {
        await addOrExtendSubscription(userId, kind, payload);
      } else if (action === 'customDate') {
        const expiryDate = new Date(`${payload}T00:00:00.000Z`);
        await setSubscriptionExpiry(userId, kind, expiryDate);
      } else if (action === 'cancel') {
        await removeSubscription(userId, kind);
      }
      loadUsers();
      showSaved();
    } catch (error) {
      console.error('Error updating subscription:', error);
      window.alert(`${t('admin.actionFailed') || 'הפעולה נכשלה'}: ${error.message || error}`);
    }
  };

  const handleUpdateUserLevel = async (userId, newLevel, expiryDate = null) => {
    try {
      if (newLevel === 'blocked') {
        const user = users.find(u => u.id === userId);
        if (user && user.phoneNumber) {
          const parties = await getActiveParties();
          const partiesWithUser = parties.filter(party =>
            party.registrations?.some(reg => reg.phoneNumber === user.phoneNumber || reg.userId === userId)
          );
          for (const party of partiesWithUser) {
            await adminRemoveUserFromParty(party.id, user.phoneNumber);
            if (party.balanceMatches && party.balanceMatches.length > 0) {
              const updatedBalance = party.balanceMatches.filter(
                match => match.malePhone !== user.phoneNumber && match.femalePhone !== user.phoneNumber
              );
              await saveBalanceMatches(party.id, updatedBalance);
            } else {
              const balanceMatches = await getBalanceMatches(party.id);
              if (balanceMatches && balanceMatches.length > 0) {
                const updatedBalance = balanceMatches.filter(
                  match => match.malePhone !== user.phoneNumber && match.femalePhone !== user.phoneNumber
                );
                await saveBalanceMatches(party.id, updatedBalance);
              }
            }
          }
        }
      }
      await updateUserLevel(userId, newLevel, expiryDate);
      loadUsers();
      showSaved();
    } catch (error) {
      console.error('Error updating user level:', error);
    }
  };


  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`${t('admin.confirmDeleteUser')} "${userName}"?`)) return;
    try {
      await deleteUser(userId);
      loadUsers();
      showSaved();
    } catch (error) {
      console.error('UsersSection.handleDeleteUser:', error);
      window.alert(`${t('admin.actionFailed') || 'הפעולה נכשלה'}: ${error.message || error}`);
    }
  };

  const handleExportUsers = () => {
    const exportData = users.map(u => ({
      name: u.name || '',
      phoneNumber: u.phoneNumber || '',
      gender: u.gender || '',
      telegramUsername: u.telegramUsername || '',
      level: u.level || 'regular',
      registrationExpiry: u.registrationExpiry?.seconds
        ? new Date(u.registrationExpiry.seconds * 1000).toISOString()
        : u.registrationExpiry instanceof Date
          ? u.registrationExpiry.toISOString()
          : u.registrationExpiry || null,
      createdAt: u.createdAt?.seconds
        ? new Date(u.createdAt.seconds * 1000).toISOString()
        : u.createdAt instanceof Date
          ? u.createdAt.toISOString()
          : u.createdAt || null
    }));
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users_export_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportUsers = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setImporting(true);
      const text = await file.text();
      const importData = JSON.parse(text);
      if (!Array.isArray(importData)) throw new Error('Invalid format: expected an array of users');
      const result = await importUsers(importData);
      alert(`${t('admin.importSuccess') || 'ייבוא הצליח'}: ${result.imported} ${t('admin.usersImported') || 'משתמשים יובאו'}, ${result.skipped} ${t('admin.usersSkipped') || 'דולגו (כבר קיימים)'}`);
      loadUsers(); showSaved();
    } catch (error) {
      alert(`${t('admin.errorImportingJson') || 'שגיאה בייבוא'}: ${error.message}`);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ========== Forum user actions (inline on site user card) ==========

  /** Promote a site user to also be a forum user. The admin chooses the nickname so the
   * new identity feels continuous with the existing site user (default = name). A short
   * temporary password is generated and the user is forced to set their own on next login.
   */
  const handleAddForumAccount = async (siteUser) => {
    try {
      if (forumUsersMap[siteUser.id]) {
        alert(t('admin.forumAccountAlreadyExists') || 'למשתמש האתר כבר קיים חשבון פורום מקושר.');
        return;
      }
      const defaultNick = (siteUser.name || siteUser.phoneNumber?.slice(-4) || 'user').slice(0, 30);
      const nickname = window.prompt(
        t('admin.transferForumNicknamePrompt') || 'בחר כינוי לחשבון הפורום של המשתמש:',
        defaultNick
      );
      if (nickname == null) return;
      const cleanNick = nickname.trim();
      if (cleanNick.length < 2) {
        alert(t('admin.forumNicknameTooShort') || 'כינוי חייב להכיל לפחות 2 תווים');
        return;
      }
      if (!/^[\p{L}\p{N}_-]+$/u.test(cleanNick)) {
        alert(t('admin.forumNicknameInvalidChars') || 'כינוי יכול להכיל אותיות, ספרות, מקף וקו תחתון בלבד');
        return;
      }
      const makeAdmin = window.confirm(t('admin.transferForumAsAdminConfirm') || 'להפוך את המשתמש למנהל פורום?');
      const tempPassword = Math.random().toString(36).slice(-8);
      const newUser = await registerForumUser(cleanNick, tempPassword);
      await linkForumUserToSiteUser(newUser.id, siteUser.id);
      await setForumUserPasswordWithReset(newUser.id, tempPassword);
      if (makeAdmin) await setForumUserRole(newUser.id, 'forumAdmin');
      alert(
        `${t('admin.forumAccountCreated') || 'חשבון פורום נוצר ויחובר לחשבון האתר'}\n` +
          `${t('admin.forumNickname') || 'כינוי'}: ${cleanNick}\n` +
          `${t('admin.forumTempPassword') || 'סיסמה זמנית'}: ${tempPassword}\n` +
          `${t('admin.forumMustResetNotice') || 'המשתמש יחויב לבחור סיסמה חדשה בהתחברות הבאה.'}`
      );
      await loadForumUsers();
      showSaved();
    } catch (err) {
      alert(err.message || 'שגיאה');
    }
  };

  const handleToggleForumBlock = async (fu) => {
    try {
      if (fu.isBlocked) { await unblockForumUser(fu.id); } else { await blockForumUser(fu.id); }
      await loadForumUsers();
      showSaved();
    } catch (err) { alert(err.message || 'שגיאה'); }
  };

  const handleToggleForumRole = async (fu) => {
    try {
      const newRole = fu.role === 'forumAdmin' ? 'user' : 'forumAdmin';
      await setForumUserRole(fu.id, newRole);
      await loadForumUsers();
      showSaved();
    } catch (err) { alert(err.message || 'שגיאה'); }
  };

  const handleDeleteForumUser = async (fu) => {
    if (!window.confirm(`${t('admin.confirmDeleteForumUser') || 'למחוק משתמש פורום'} "${fu.nickname}"?`)) return;
    try {
      // Scrub the chat first so the deleted user's messages, room
      // participations, and private rooms are gone before the forum-user
      // doc disappears. If the chat purge fails we still proceed with
      // the forum-user deletion (admin already confirmed) and surface a
      // warning — leaving an orphaned UID in main chat is worse than the
      // partial-cleanup edge case here.
      try {
        await purgeForumUserFromChat(fu.id, { hardDeleteMessages: true });
      } catch (chatErr) {
        console.warn('purgeForumUserFromChat failed; continuing with deleteForumUser:', chatErr?.message);
      }
      await deleteForumUser(fu.id);
      await loadForumUsers();
      showSaved();
    } catch (err) { alert(err.message || 'שגיאה'); }
  };

  // Kick from chat — softer than deleteForumUser. Wipes participant rows
  // and private-room memberships but leaves the forum account intact and
  // keeps the user's authored messages. Re-entering the site auto-rejoins
  // the main chat (lazy joinRoom on mount); private rooms still need a
  // fresh invite.
  const handleKickFromChat = async (fu) => {
    const confirmMsg = `${t('admin.confirmKickFromChat') || 'להוציא את המשתמש מהצ׳אט?'} "${fu.nickname}"\n\n${t('admin.kickFromChatHint') || 'המשתמש יוסר מכל החדרים. אם הוא ייכנס שוב — הוא יתווסף אוטומטית לצ׳אט הראשי.'}`;
    if (!window.confirm(confirmMsg)) return;
    try {
      await purgeForumUserFromChat(fu.id, { hardDeleteMessages: false });
      showSaved();
    } catch (err) { alert(err.message || 'שגיאה'); }
  };

  const handleResetForumPassword = async (fu) => {
    const newPassword = prompt(
      t('admin.enterNewForumPasswordResetHint') ||
        'הזן סיסמה זמנית למשתמש הפורום (הוא יחויב לבחור סיסמה חדשה בהתחברות הבאה):'
    );
    if (!newPassword) return;
    if (newPassword.length < 4) {
      alert(t('admin.forumPasswordTooShort') || 'סיסמה חייבת להכיל לפחות 4 תווים');
      return;
    }
    try {
      await setForumUserPasswordWithReset(fu.id, newPassword);
      alert(
        `${t('admin.forumPasswordResetDone') || 'הסיסמה אופסה.'} ` +
          (t('admin.forumMustResetNotice') ||
            'המשתמש יחויב לבחור סיסמה חדשה בהתחברות הבאה.')
      );
      await loadForumUsers();
      showSaved();
    } catch (err) {
      alert(err.message || 'שגיאה');
    }
  };

  const handleSetForumEmail = async (fu) => {
    const current = fu.email || '';
    const next = window.prompt(
      t('admin.setForumEmailPrompt') || 'הזן כתובת אימייל למשתמש הפורום (השאר ריק כדי להסיר):',
      current
    );
    if (next == null) return;
    try {
      await setForumUserEmail(fu.id, next.trim());
      alert(
        next.trim()
          ? (t('admin.forumEmailSet') || 'האימייל עודכן. המשתמש יצטרך לאמת אותו לפני שיוכל לבקש איפוס סיסמה.')
          : (t('admin.forumEmailCleared') || 'האימייל הוסר.')
      );
      await loadForumUsers();
      showSaved();
    } catch (err) {
      alert(err.message || 'שגיאה');
    }
  };

  const handleForceVerifyEmail = async (fu) => {
    if (!fu.email) {
      alert(t('admin.forumEmailMissing') || 'למשתמש אין כתובת אימייל. הגדר אותה קודם.');
      return;
    }
    if (!window.confirm(t('admin.forceVerifyConfirm') || 'לסמן ידנית את האימייל כמאומת?')) return;
    try {
      await adminMarkForumEmailVerified(fu.id);
      await loadForumUsers();
      showSaved();
    } catch (err) {
      alert(err.message || 'שגיאה');
    }
  };

  const handleBackfillNicknameLower = async () => {
    if (backfilling) return;
    // Yield to the next paint before opening the synchronous confirm() so the
    // click handler returns immediately. Without this, INP is measured against
    // the time the user spends reading the dialog (~2s) and the metric is bad
    // even though our own work is fast.
    await new Promise((resolve) => setTimeout(resolve, 0));
    if (!window.confirm(t('admin.backfillNicknameLowerConfirm') || 'להריץ Backfill על כל משתמשי הפורום (nicknameLower)?')) return;
    setBackfilling(true);
    try {
      const result = await backfillForumNicknameLower();
      await loadForumUsers();
      showSaved();
      alert(
        `${t('admin.backfillDone') || 'הסתיים.'}\n` +
        `Updated: ${result.updated}\nSkipped: ${result.skipped}\nTotal: ${result.total}`
      );
    } catch (err) {
      alert(err.message || 'שגיאה');
    } finally {
      setBackfilling(false);
    }
  };

  // ========== Filtering ==========

  const filteredUsers = users.filter(u => {
    if (typeFilter) {
      if (typeFilter === 'male' && u.gender !== 'male') return false;
      if (typeFilter === 'female' && u.gender !== 'female') return false;
      if (typeFilter === 'blocked' && u.level !== 'blocked') return false;
      if (typeFilter === 'admin' && u.level !== 'admin') return false;
    }
    if (subFilter) {
      const partiesSub = getSubscription(u, 'parties');
      const exchangeSub = getSubscription(u, 'exchangeParties');
      
      if (subFilter === 'parties' && !partiesSub.isActive) return false;
      if (subFilter === 'exchange' && !exchangeSub.isActive) return false;
      
      if (subFilter === 'expired') {
        if (!partiesSub.isExpired && !exchangeSub.isExpired) return false;
      }
      
      if (subFilter.startsWith('expiring')) {
        const months = parseInt(subFilter.replace('expiring', ''), 10);
        const daysThreshold = months * 30;
        
        const isPartiesExpiring = partiesSub.isActive && !partiesSub.isGold && partiesSub.daysRemaining <= daysThreshold;
        const isExchangeExpiring = exchangeSub.isActive && !exchangeSub.isGold && exchangeSub.daysRemaining <= daysThreshold;
        
        if (!isPartiesExpiring && !isExchangeExpiring) return false;
      }
    }
    const fu = forumUsersMap[u.id];
    if (forumFilter === 'hasForum' && !fu) return false;
    if (forumFilter === 'forumAdmin' && (!fu || fu.role !== 'forumAdmin')) return false;
    if (forumFilter === 'noForum' && fu) return false;
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      (u.name || '').toLowerCase().includes(query) ||
      (u.phoneNumber || '').toLowerCase().includes(query) ||
      (u.telegramUsername || '').toLowerCase().includes(query)
    );
  });

  return (
    <>
    <div className="bg-zinc-900/50 backdrop-blur-2xl border border-white/5 p-4 md:p-6 rounded-xl md:rounded-2xl space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold">{t('userManagement') || 'ניהול משתמשים'}</h2>
          {!loadingUsers && (
            <p className="text-sm text-zinc-400 mt-1 flex flex-wrap gap-x-4 gap-y-0">
              <span>{t('admin.totalCount') || 'כמות כוללת'}: <span className="text-white font-medium">{users.length}</span></span>
              <span>{t('admin.females') || 'נשים'}: <span className="text-white font-medium">{users.filter(u => u.gender === 'female').length}</span></span>
              <span>{t('admin.males') || 'גברים'}: <span className="text-white font-medium">{users.filter(u => u.gender === 'male').length}</span></span>
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button
            onClick={loadUsers}
            className="bg-blue-600 hover:bg-blue-500 text-white px-3 md:px-4 py-1.5 md:py-2 rounded-xl font-bold flex items-center gap-2 text-xs md:text-sm"
          >
            <RotateCcw size={14} className="md:w-4 md:h-4" /> {t('admin.refresh')}
          </button>
          <button
            onClick={handleExportUsers}
            disabled={users.length === 0}
            className="bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-700 disabled:opacity-50 text-white px-3 md:px-4 py-1.5 md:py-2 rounded-xl font-bold flex items-center gap-2 text-xs md:text-sm"
          >
            <Download size={14} className="md:w-4 md:h-4" /> {t('admin.exportJson') || 'ייצא JSON'}
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="bg-green-600 hover:bg-green-500 disabled:bg-zinc-700 disabled:opacity-50 text-white px-3 md:px-4 py-1.5 md:py-2 rounded-xl font-bold flex items-center gap-2 text-xs md:text-sm"
          >
            {importing ? <Loader size="small" /> : <Upload size={14} className="md:w-4 md:h-4" />}
            {t('admin.importJson') || 'ייבא JSON'}
          </button>
          <input ref={fileInputRef} type="file" accept=".json" onChange={handleImportUsers} className="hidden" />
          <button
            onClick={handleBackfillNicknameLower}
            disabled={backfilling}
            className="bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 md:px-4 py-1.5 md:py-2 rounded-xl font-bold flex items-center gap-2 text-xs md:text-sm"
            title={t('admin.backfillNicknameLowerHint') || 'מעדכן nicknameLower על כל משתמשי הפורום'}
          >
            {backfilling ? <Loader size="small" /> : <Database size={14} className="md:w-4 md:h-4" />}
            {backfilling
              ? (t('admin.backfillRunning') || 'מריץ Backfill...')
              : (t('admin.backfillNicknameLower') || 'תיקון Nickname Lower')}
          </button>
        </div>
      </div>

      <div className="relative">
        <Search size={18} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('admin.searchUsers') || 'חיפוש לפי שם, טלפון או טלגרם...'}
          className="w-full bg-black/40 border border-zinc-800 p-3 pr-10 rounded-xl focus:border-red-600 outline-none text-white text-right"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 hover:text-white">
            ✕
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-zinc-500 text-sm font-bold">{t('admin.filterByType') || 'סינון לפי סוג'}:</span>
        <button type="button" onClick={() => setTypeFilter('')} className={`px-3 py-1.5 rounded-xl text-sm font-bold transition-colors ${typeFilter === '' ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'}`}>
          {t('admin.filterAll') || 'הכל'}
        </button>
        <button type="button" onClick={() => setTypeFilter('male')} className={`px-3 py-1.5 rounded-xl text-sm font-bold transition-colors ${typeFilter === 'male' ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'}`}>
          {t('admin.males') || 'גברים'}
        </button>
        <button type="button" onClick={() => setTypeFilter('female')} className={`px-3 py-1.5 rounded-xl text-sm font-bold transition-colors ${typeFilter === 'female' ? 'bg-pink-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'}`}>
          {t('admin.females') || 'נשים'}
        </button>
        <button type="button" onClick={() => setTypeFilter('blocked')} className={`px-3 py-1.5 rounded-xl text-sm font-bold transition-colors ${typeFilter === 'blocked' ? 'bg-red-900 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'}`}>
          {t('admin.filterBlocked') || 'חסומים'}
        </button>
        <button type="button" onClick={() => setTypeFilter('admin')} className={`px-3 py-1.5 rounded-xl text-sm font-bold transition-colors ${typeFilter === 'admin' ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'}`}>
          {t('admin.filterAdmins') || 'מנהלים'}
        </button>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-zinc-500 text-sm font-bold">{t('admin.filterByForum') || 'סינון לפי פורום'}:</span>
        <button type="button" onClick={() => setForumFilter('')} className={`px-3 py-1.5 rounded-xl text-sm font-bold transition-colors ${forumFilter === '' ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'}`}>
          {t('admin.filterAll') || 'הכל'}
        </button>
        <button type="button" onClick={() => setForumFilter('hasForum')} className={`px-3 py-1.5 rounded-xl text-sm font-bold transition-colors ${forumFilter === 'hasForum' ? 'bg-purple-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'}`}>
          {t('admin.filterForumHas') || 'עם חשבון פורום'}
        </button>
        <button type="button" onClick={() => setForumFilter('forumAdmin')} className={`px-3 py-1.5 rounded-xl text-sm font-bold transition-colors ${forumFilter === 'forumAdmin' ? 'bg-purple-700 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'}`}>
          {t('admin.filterForumAdmin') || 'מנהל פורום'}
        </button>
        <button type="button" onClick={() => setForumFilter('noForum')} className={`px-3 py-1.5 rounded-xl text-sm font-bold transition-colors ${forumFilter === 'noForum' ? 'bg-zinc-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'}`}>
          {t('admin.filterForumNone') || 'ללא חשבון פורום'}
        </button>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-zinc-500 text-sm font-bold">{t('admin.filterBySub') || 'סינון לפי מנוי'}:</span>
        <button type="button" onClick={() => setSubFilter('')} className={`px-3 py-1.5 rounded-xl text-sm font-bold transition-colors ${subFilter === '' ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'}`}>
          {t('admin.filterAll') || 'הכל'}
        </button>
        <button type="button" onClick={() => setSubFilter('parties')} className={`px-3 py-1.5 rounded-xl text-sm font-bold transition-colors ${subFilter === 'parties' ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'}`}>
          {t('admin.subscriptionsParties') || 'מסיבות'}
        </button>
        <button type="button" onClick={() => setSubFilter('exchange')} className={`px-3 py-1.5 rounded-xl text-sm font-bold transition-colors ${subFilter === 'exchange' ? 'bg-purple-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'}`}>
          {t('admin.subscriptionsExchange') || 'חילופים'}
        </button>
        <button type="button" onClick={() => setSubFilter('expired')} className={`px-3 py-1.5 rounded-xl text-sm font-bold transition-colors ${subFilter === 'expired' ? 'bg-red-900 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'}`}>
          {t('admin.filterExpired') || 'פג תוקף'}
        </button>
        <button type="button" onClick={() => setSubFilter('expiring1')} className={`px-3 py-1.5 rounded-xl text-sm font-bold transition-colors ${subFilter === 'expiring1' ? 'bg-orange-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'}`}>
          {t('admin.filterExpiring1') || 'יפוג בחודש'}
        </button>
        <button type="button" onClick={() => setSubFilter('expiring2')} className={`px-3 py-1.5 rounded-xl text-sm font-bold transition-colors ${subFilter === 'expiring2' ? 'bg-orange-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'}`}>
          {t('admin.filterExpiring2') || 'יפוג בחודשיים'}
        </button>
        <button type="button" onClick={() => setSubFilter('expiring3')} className={`px-3 py-1.5 rounded-xl text-sm font-bold transition-colors ${subFilter === 'expiring3' ? 'bg-orange-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'}`}>
          {t('admin.filterExpiring3') || 'יפוג ב-3 חודשים'}
        </button>
      </div>

      {(searchQuery || typeFilter || forumFilter || subFilter) && (
        <p className="text-sm text-zinc-400">
          {t('admin.showingResults') || 'מציג'} {filteredUsers.length} {t('admin.outOf') || 'מתוך'} {users.length} {t('admin.users') || 'משתמשים'}
        </p>
      )}

      {loadingUsers ? (
        <AdminLoader />
      ) : users.length === 0 ? (
        <div className="text-center py-12 text-zinc-500">
          <p>{t('noUsersFound') || 'אין משתמשים'}</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-12 text-zinc-500">
          <p>{t('admin.noSearchResults') || 'לא נמצאו תוצאות לחיפוש'}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredUsers.map(u => {
            const fu = forumUsersMap[u.id] || null;
            return (
              <div key={u.id} className="bg-black/40 border border-zinc-800 p-3 md:p-4 rounded-xl">
                {editingUser?.id === u.id ? (
                  <form onSubmit={handleSaveUser} className="space-y-3 md:space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                      <div>
                        <label className="text-xs uppercase font-bold text-zinc-500">{t('fullName') || 'שם מלא'} *</label>
                        <input type="text" value={editUserForm.name} onChange={(e) => setEditUserForm({ ...editUserForm, name: e.target.value })} className="w-full bg-black/40 border border-zinc-800 p-3 rounded-xl focus:border-red-600 outline-none text-white text-right" required />
                      </div>
                      <div>
                        <label className="text-xs uppercase font-bold text-zinc-500">{t('phoneNumber') || 'מספר טלפון'} *</label>
                        <input type="tel" value={editUserForm.phoneNumber} onChange={handlePhoneChange} placeholder="05XXXXXXXX" maxLength="10" className="w-full bg-black/40 border border-zinc-800 p-3 rounded-xl focus:border-red-600 outline-none text-white text-right" required />
                      </div>
                      <div>
                        <label className="text-xs uppercase font-bold text-zinc-500">{t('gender') || 'מין'} *</label>
                        <select value={editUserForm.gender} onChange={(e) => setEditUserForm({ ...editUserForm, gender: e.target.value })} className="w-full bg-black/40 border border-zinc-800 p-3 rounded-xl focus:border-red-600 outline-none text-white text-right" required>
                          <option value="">{t('selectGender') || 'בחר מין'}</option>
                          <option value="male">{t('male') || 'זכר'}</option>
                          <option value="female">{t('female') || 'נקבה'}</option>
                          <option value="notDefined">{t('admin.balanceTables.notDefined') || 'לא מוגדר'}</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs uppercase font-bold text-zinc-500">{t('admin.telegramUsername')}</label>
                        <input type="text" value={editUserForm.telegramUsername || ''} onChange={(e) => { let value = e.target.value.replace(/^@+/g, ''); setEditUserForm({ ...editUserForm, telegramUsername: value }); }} placeholder="username (ללא @)" className="w-full bg-black/40 border border-zinc-800 p-3 rounded-xl focus:border-red-600 outline-none text-white text-right" />
                      </div>
                      <div>
                        <label className="text-xs uppercase font-bold text-zinc-500">{t('admin.subscriptionEndDate')}</label>
                        <input type="date" value={editUserForm.subscriptionEndDate || ''} onChange={(e) => setEditUserForm({ ...editUserForm, subscriptionEndDate: e.target.value })} className="w-full bg-black/40 border border-zinc-800 p-3 rounded-xl focus:border-red-600 outline-none text-white text-right" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" className="bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded-xl font-bold">{t('save') || 'שמור'}</button>
                      <button type="button" onClick={handleCancelEdit} className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-2 rounded-xl font-bold">{t('cancel') || 'ביטול'}</button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <strong className="text-lg">{u.name}</strong>
                          <span className={`px-2 py-1 rounded text-xs font-bold ${u.level === 'admin' ? 'bg-red-600' : u.level === 'gold' ? 'bg-yellow-600' : u.level === 'registered' ? 'bg-green-600' : u.level === 'blocked' ? 'bg-red-900' : 'bg-zinc-600'}`}>
                            {u.level}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-bold ${u.gender === 'male' ? 'bg-blue-600' : u.gender === 'female' ? 'bg-pink-600' : 'bg-zinc-600'}`}>
                            {u.gender === 'male' ? t('male') || 'זכר' : u.gender === 'female' ? t('female') || 'נקבה' : t('admin.balanceTables.notDefined') || 'לא מוגדר'}
                          </span>
                        </div>
                        <p className="text-zinc-400 text-sm">{t('phoneNumber') || 'מספר טלפון'}: <PhoneLink phone={u.phoneNumber}>{u.phoneNumber}</PhoneLink></p>
                        {u.telegramUsername && (
                          <p className="text-zinc-400 text-sm">Telegram: @{u.telegramUsername}</p>
                        )}
                        <p className="text-zinc-400 text-sm">
                          מקור: <span className="text-zinc-200">{u.crm?.source || 'לא צוין'}</span>
                          {u.crm?.sourceNote && <span className="text-zinc-500"> ({u.crm.sourceNote})</span>}
                        </p>
                        {(() => {
                          const payments = u.crm?.payments || [];
                          if (payments.length === 0) {
                            return <p className="text-zinc-500 text-sm">אין תשלומים רשומים</p>;
                          }
                          const last = [...payments].sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
                          return (
                            <p className="text-zinc-400 text-sm">
                              תשלום אחרון: <span className="text-green-400 font-bold">{last.date}</span>
                              {last.amount != null && <span className="text-green-400 font-bold"> · ₪{last.amount}</span>}
                              {last.method && <span className="text-zinc-500"> ({last.method})</span>}
                              {payments.length > 1 && <span className="text-zinc-600"> · {payments.length} תשלומים בסה"כ</span>}
                            </p>
                          );
                        })()}
                        <div className="flex flex-col gap-1.5 mt-2">
                          <SubscriptionBadge user={u} kind="parties" />
                          <SubscriptionBadge user={u} kind="exchangeParties" />
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 items-start justify-end">
                        <SubscriptionEditor onAction={(kind, action, payload) => handleSubscriptionAction(u.id, kind, action, payload)} />

                        <button onClick={() => setCrmUser(u)} className="flex items-center gap-1.5 bg-purple-700 hover:bg-purple-600 text-white px-3 md:px-4 py-1.5 md:py-2 rounded-xl font-bold text-xs md:text-sm">
                          <UserCog size={14} /> ערוך מקור/תשלומים
                        </button>

                        <button onClick={() => handleEditUser(u)} className="bg-red-600 hover:bg-red-500 text-white px-3 md:px-4 py-1.5 md:py-2 rounded-xl font-bold text-xs md:text-sm">
                          {t('edit') || 'ערוך'}
                        </button>
                        
                        {u.level === 'blocked' ? (
                          <button onClick={() => handleUpdateUserLevel(u.id, 'regular')} className="bg-green-600 hover:bg-green-500 text-white px-3 md:px-4 py-1.5 md:py-2 rounded-xl font-bold text-xs md:text-sm">
                            {t('unblock') || 'בטל חסימה'}
                          </button>
                        ) : (
                          <button onClick={() => handleUpdateUserLevel(u.id, 'blocked')} className="bg-red-900 hover:bg-red-800 text-white px-3 md:px-4 py-1.5 md:py-2 rounded-xl font-bold text-xs md:text-sm">
                            {t('block') || 'חסום'}
                          </button>
                        )}
                        <button onClick={() => handleDeleteUser(u.id, u.name)} className="bg-red-900 hover:bg-red-800 text-white px-3 md:px-4 py-1.5 md:py-2 rounded-xl font-bold text-xs md:text-sm">
                          🗑️ {t('admin.delete')}
                        </button>
                      </div>
                    </div>

                    {/* Forum/Blog account info - inline */}
                    {fu ? (
                      <div className="mt-3 pt-3 border-t border-zinc-700/50">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <MessageSquare size={14} className="text-purple-400" />
                          <span className="text-purple-300 text-xs font-bold">{t('admin.forumAccount') || 'חשבון פורום'}</span>
                          <span className="text-white text-sm font-bold">{fu.nickname}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${fu.role === 'forumAdmin' ? 'bg-purple-600' : 'bg-zinc-700'}`}>
                            {fu.role === 'forumAdmin' ? (t('admin.forumAdmin') || 'מנהל פורום') : (t('admin.forumUser') || 'משתמש')}
                          </span>
                          {fu.isBlocked && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-900">{t('admin.blocked') || 'חסום'}</span>
                          )}
                        </div>
                        {/* Inline email + verification status; gives admins
                         * an at-a-glance view without hovering the edit button. */}
                        <div className="flex flex-wrap items-center gap-2 mb-2 text-xs">
                          <Mail size={12} className="text-zinc-500" />
                          {fu.email ? (
                            <>
                              <span className="text-zinc-300 font-mono ltr:text-left rtl:text-right" dir="ltr">
                                {fu.email}
                              </span>
                              {fu.emailVerified ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-700 text-white">
                                  {t('admin.emailVerified') || 'מאומת'}
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-700 text-white">
                                  {t('admin.emailUnverified') || 'לא מאומת'}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-zinc-500 italic">
                              {t('admin.emailMissing') || 'אין אימייל'}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => handleToggleForumRole(fu)}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors ${fu.role === 'forumAdmin' ? 'bg-zinc-700 hover:bg-zinc-600 text-white' : 'bg-purple-600 hover:bg-purple-500 text-white'}`}
                          >
                            {fu.role === 'forumAdmin' ? <ShieldOff size={11} /> : <Shield size={11} />}
                            {fu.role === 'forumAdmin' ? (t('admin.removeForumAdmin') || 'הסר מנהל') : (t('admin.makeForumAdmin') || 'הפוך למנהל')}
                          </button>
                          <button
                            onClick={() => handleToggleForumBlock(fu)}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors ${fu.isBlocked ? 'bg-green-700 hover:bg-green-600 text-white' : 'bg-red-900 hover:bg-red-800 text-white'}`}
                          >
                            {fu.isBlocked ? <CheckCircle size={11} /> : <Ban size={11} />}
                            {fu.isBlocked ? (t('admin.forumUnblock') || 'בטל חסימה בפורום') : (t('admin.forumBlock') || 'חסום בפורום')}
                          </button>
                          <button
                            onClick={() => handleResetForumPassword(fu)}
                            className="flex items-center gap-1 bg-zinc-700 hover:bg-zinc-600 text-white px-2.5 py-1 rounded-lg font-bold text-[11px]"
                          >
                            <KeyRound size={11} />
                            {t('admin.resetForumPassword') || 'אפס סיסמה'}
                          </button>
                          <button
                            onClick={() => handleSetForumEmail(fu)}
                            className="flex items-center gap-1 bg-zinc-700 hover:bg-zinc-600 text-white px-2.5 py-1 rounded-lg font-bold text-[11px]"
                            title={fu.email || ''}
                          >
                            <Mail size={11} />
                            {fu.email
                              ? `${t('admin.editForumEmail') || 'ערוך אימייל'}${fu.emailVerified ? ' ✓' : ''}`
                              : (t('admin.addForumEmail') || 'הוסף אימייל')}
                          </button>
                          {fu.email && !fu.emailVerified && (
                            <button
                              onClick={() => handleForceVerifyEmail(fu)}
                              className="flex items-center gap-1 bg-emerald-700 hover:bg-emerald-600 text-white px-2.5 py-1 rounded-lg font-bold text-[11px]"
                            >
                              <MailCheck size={11} />
                              {t('admin.forceVerifyEmail') || 'סמן כמאומת'}
                            </button>
                          )}
                          <button
                            onClick={() => handleKickFromChat(fu)}
                            className="flex items-center gap-1 bg-amber-700 hover:bg-amber-600 text-white px-2.5 py-1 rounded-lg font-bold text-[11px]"
                            title={t('admin.kickFromChatHint') || 'יוסר מכל חדרי הצ׳אט; אם ייכנס שוב — יתווסף אוטומטית לצ׳אט הראשי.'}
                          >
                            <MessageSquareOff size={11} />
                            {t('admin.kickFromChat') || 'הוצא מהצ׳אט'}
                          </button>
                          <button
                            onClick={() => handleDeleteForumUser(fu)}
                            className="flex items-center gap-1 bg-red-900/60 hover:bg-red-800 text-white px-2.5 py-1 rounded-lg font-bold text-[11px]"
                          >
                            <Trash2 size={11} />
                            {t('admin.deleteForumAccount') || 'מחק חשבון פורום'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 pt-3 border-t border-zinc-700/50">
                        <button
                          onClick={() => handleAddForumAccount(u)}
                          className="flex items-center gap-1.5 text-zinc-500 hover:text-purple-300 text-xs transition-colors"
                        >
                          <Shield size={12} />
                          {t('admin.transferToForum') || 'הוסף חשבון פורום למשתמש זה'}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
    {crmUser && <UserCrmModal user={crmUser} onClose={() => setCrmUser(null)} />}
    </>
  );
};

export default UsersSection;
