import { useState, useEffect } from 'react';
import { RotateCcw, Search, Shield, ShieldOff, Ban, CheckCircle, Trash2, KeyRound, Mail, MailCheck, MessageSquareOff, Link2, Scale, XCircle } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import AdminLoader from './AdminLoader';
import PhoneLink from '../PhoneLink';
import { getAllUsers } from '../../firebase/users';
import {
  getAllForumUsers,
  approveForumUser,
  blockForumUser,
  unblockForumUser,
  setForumUserRole,
  deleteForumUser,
  linkForumUserToSiteUser,
  registerForumUser,
  setForumUserPasswordWithReset,
  setForumUserEmail,
  adminMarkForumEmailVerified,
  backfillForumNicknameLower,
  updateForumUser,
} from '../../firebase/forumUsers';
import { purgeForumUserFromChat } from '../../firebase/liveChat';

/**
 * Fully independent from the site/subscriptions user list (UsersSection):
 * forum accounts are a separate identity system, and mixing their
 * management inline into the site-user cards made it impossible to tell
 * which controls affected which system. This section owns forum accounts
 * end-to-end; the only cross-reference is a read-only "linked site user"
 * line, purely for context.
 */
const ForumUsersSection = ({ showSaved }) => {
  const { t } = useLanguage();
  const [forumUsers, setForumUsers] = useState([]);
  const [siteUsersMap, setSiteUsersMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState(''); // '', 'forumAdmin', 'unlinked'
  const [backfilling, setBackfilling] = useState(false);

  // Link-new-account tool
  const [linkSearch, setLinkSearch] = useState('');
  const [linkResults, setLinkResults] = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      const [fu, siteUsers] = await Promise.all([getAllForumUsers(), getAllUsers()]);
      setForumUsers(fu);
      const map = {};
      siteUsers.forEach((u) => { map[u.id] = u; });
      setSiteUsersMap(map);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleToggleBlock = async (fu) => {
    try {
      if (fu.isBlocked) { await unblockForumUser(fu.id); } else { await blockForumUser(fu.id); }
      await load();
      showSaved();
    } catch (err) { alert(err.message || 'שגיאה'); }
  };

  const handleApproveUser = async (fu) => {
    try {
      await approveForumUser(fu.id);
      await load();
      showSaved();
    } catch (err) { alert(err.message || 'שגיאה'); }
  };

  const handleToggleRole = async (fu) => {
    try {
      const newRole = fu.role === 'forumAdmin' ? 'user' : 'forumAdmin';
      await setForumUserRole(fu.id, newRole);
      await load();
      showSaved();
    } catch (err) { alert(err.message || 'שגיאה'); }
  };

  const handleDelete = async (fu) => {
    if (!window.confirm(`למחוק משתמש פורום "${fu.nickname}"?`)) return;
    try {
      try {
        await purgeForumUserFromChat(fu.id, { hardDeleteMessages: true });
      } catch (chatErr) {
        console.warn('purgeForumUserFromChat failed; continuing with deleteForumUser:', chatErr?.message);
      }
      await deleteForumUser(fu.id);
      await load();
      showSaved();
    } catch (err) { alert(err.message || 'שגיאה'); }
  };

  const handleKickFromChat = async (fu) => {
    if (!window.confirm(`להוציא את "${fu.nickname}" מהצ'אט? המשתמש יוסר מכל החדרים. אם ייכנס שוב — יתווסף אוטומטית לצ'אט הראשי.`)) return;
    try {
      await purgeForumUserFromChat(fu.id, { hardDeleteMessages: false });
      showSaved();
    } catch (err) { alert(err.message || 'שגיאה'); }
  };

  const handleResetPassword = async (fu) => {
    const newPassword = prompt('הזן סיסמה זמנית למשתמש הפורום (הוא יחויב לבחור סיסמה חדשה בהתחברות הבאה):');
    if (!newPassword) return;
    if (newPassword.length < 4) { alert('סיסמה חייבת להכיל לפחות 4 תווים'); return; }
    try {
      await setForumUserPasswordWithReset(fu.id, newPassword);
      alert('הסיסמה אופסה. המשתמש יחויב לבחור סיסמה חדשה בהתחברות הבאה.');
      await load();
      showSaved();
    } catch (err) { alert(err.message || 'שגיאה'); }
  };

  const handleSetEmail = async (fu) => {
    const next = window.prompt('הזן כתובת אימייל למשתמש הפורום (השאר ריק כדי להסיר):', fu.email || '');
    if (next == null) return;
    try {
      await setForumUserEmail(fu.id, next.trim());
      alert(next.trim() ? 'האימייל עודכן. המשתמש יצטרך לאמת אותו לפני שיוכל לבקש איפוס סיסמה.' : 'האימייל הוסר.');
      await load();
      showSaved();
    } catch (err) { alert(err.message || 'שגיאה'); }
  };

  const handleForceVerify = async (fu) => {
    if (!fu.email) { alert('למשתמש אין כתובת אימייל. הגדר אותה קודם.'); return; }
    if (!window.confirm('לסמן ידנית את האימייל כמאומת?')) return;
    try {
      await adminMarkForumEmailVerified(fu.id);
      await load();
      showSaved();
    } catch (err) { alert(err.message || 'שגיאה'); }
  };

  const handleApproveBalance = async (fu, days) => {
    const expiry = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    try {
      await updateForumUser(fu.id, { subscriptionExpiry: expiry });
      await load();
      showSaved();
    } catch (err) { alert(err.message || 'שגיאה'); }
  };

  const handleRevokeBalance = async (fu) => {
    if (!window.confirm(`לבטל את אישור האיזון המגדרי של "${fu.nickname}"?`)) return;
    try {
      await updateForumUser(fu.id, { subscriptionExpiry: null });
      await load();
      showSaved();
    } catch (err) { alert(err.message || 'שגיאה'); }
  };

  const handleBackfill = async () => {
    if (backfilling) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
    if (!window.confirm('להריץ Backfill על כל משתמשי הפורום (nicknameLower)?')) return;
    setBackfilling(true);
    try {
      const result = await backfillForumNicknameLower();
      await load();
      showSaved();
      alert(`הסתיים.\nUpdated: ${result.updated}\nSkipped: ${result.skipped}\nTotal: ${result.total}`);
    } catch (err) {
      alert(err.message || 'שגיאה');
    } finally {
      setBackfilling(false);
    }
  };

  // ---- Link a new forum account to an existing site user ----

  const runLinkSearch = () => {
    const q = linkSearch.trim().toLowerCase();
    if (!q) { setLinkResults([]); return; }
    const linkedIds = new Set(forumUsers.map((fu) => fu.linkedUserId).filter(Boolean));
    const matches = Object.values(siteUsersMap).filter((u) =>
      !linkedIds.has(u.id) &&
      ((u.name || '').toLowerCase().includes(q) || (u.phoneNumber || '').includes(q))
    ).slice(0, 10);
    setLinkResults(matches);
  };

  const handleCreateAndLink = async (siteUser) => {
    try {
      const defaultNick = (siteUser.name || siteUser.phoneNumber?.slice(-4) || 'user').slice(0, 30);
      const nickname = window.prompt('בחר כינוי לחשבון הפורום של המשתמש:', defaultNick);
      if (nickname == null) return;
      const cleanNick = nickname.trim();
      if (cleanNick.length < 2) { alert('כינוי חייב להכיל לפחות 2 תווים'); return; }
      if (!/^[\p{L}\p{N}_-]+$/u.test(cleanNick)) { alert('כינוי יכול להכיל אותיות, ספרות, מקף וקו תחתון בלבד'); return; }
      const makeAdmin = window.confirm('להפוך את המשתמש למנהל פורום?');
      const tempPassword = Math.random().toString(36).slice(-8);
      const newUser = await registerForumUser(cleanNick, tempPassword, siteUser.phoneNumber);
      // The admin is the one creating this account, so it doesn't need to
      // sit in the same pending-approval queue as a public self-registration.
      await approveForumUser(newUser.id);
      await linkForumUserToSiteUser(newUser.id, siteUser.id);
      await setForumUserPasswordWithReset(newUser.id, tempPassword);
      if (makeAdmin) await setForumUserRole(newUser.id, 'forumAdmin');
      alert(
        `חשבון פורום נוצר ויחובר לחשבון האתר\n` +
        `כינוי: ${cleanNick}\n` +
        `סיסמה זמנית: ${tempPassword}\n` +
        `המשתמש יחויב לבחור סיסמה חדשה בהתחברות הבאה.`
      );
      setLinkSearch('');
      setLinkResults([]);
      await load();
      showSaved();
    } catch (err) {
      alert(err.message || 'שגיאה');
    }
  };

  const filteredForumUsers = forumUsers.filter((fu) => {
    if (roleFilter === 'forumAdmin' && fu.role !== 'forumAdmin') return false;
    if (roleFilter === 'unlinked' && fu.linkedUserId) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (fu.nickname || '').toLowerCase().includes(q) || (fu.email || '').toLowerCase().includes(q);
  });

  return (
    <div className="bg-[#121218] backdrop-blur-2xl border border-white/5 p-4 md:p-6 rounded-xl md:rounded-2xl space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl md:text-2xl font-bold">משתמשי פורום</h2>
            <span className="px-2.5 py-1 rounded-full bg-[#1f1f23] text-[#94A3B8] text-xs font-bold">{forumUsers.length}</span>
          </div>
          <p className="text-xs text-[#94A3B8] mt-1">
            חשבונות פורום (כינוי + סיסמה) — מערכת נפרדת לגמרי ממשתמשי האתר/מנויים ב"ניהול משתמשים". קישור לחשבון אתר מוצג כאן רק לצורך התמצאות.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={load} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-xl font-bold flex items-center gap-2 text-sm">
            <RotateCcw size={14} /> רענן
          </button>
          <button onClick={handleBackfill} disabled={backfilling} className="bg-[#2a292e] hover:bg-[#353439] disabled:opacity-50 text-white px-3 py-1.5 rounded-xl font-bold text-sm">
            {backfilling ? 'מריץ...' : 'Backfill nicknameLower'}
          </button>
        </div>
      </div>

      {/* Link new account tool */}
      <div className="bg-[#1f1f23]/60 border border-[rgba(255,255,255,0.08)] rounded-xl p-3 space-y-2">
        <label className="text-xs uppercase font-bold text-[#94A3B8] flex items-center gap-1.5">
          <Link2 size={14} /> צור חשבון פורום חדש ושייך למשתמש אתר קיים
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={linkSearch}
            onChange={(e) => setLinkSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runLinkSearch()}
            placeholder="חפש לפי שם או טלפון..."
            className="flex-1 bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] p-2.5 rounded-xl focus:border-[#ff5708] outline-none text-white text-right text-sm"
          />
          <button onClick={runLinkSearch} className="bg-[#2a292e] hover:bg-[#353439] text-white px-4 rounded-xl font-bold text-sm">
            <Search size={16} />
          </button>
        </div>
        {linkResults.length > 0 && (
          <div className="space-y-1.5 mt-2">
            {linkResults.map((u) => (
              <div key={u.id} className="flex items-center justify-between bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] rounded-lg p-2 text-sm">
                <span>{u.name} — <PhoneLink phone={u.phoneNumber}>{u.phoneNumber}</PhoneLink></span>
                <button onClick={() => handleCreateAndLink(u)} className="bg-purple-700 hover:bg-purple-600 text-white px-3 py-1 rounded-lg font-bold text-xs">
                  צור וקשר
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <Search size={18} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#a9a9b2]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="חיפוש לפי כינוי או אימייל..."
            className="w-full bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] p-3 pr-10 rounded-xl focus:border-[#ff5708] outline-none text-white text-right"
          />
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[#94A3B8] text-sm font-bold">סינון:</span>
          {[{ id: '', label: 'הכל' }, { id: 'forumAdmin', label: 'מנהלי פורום' }, { id: 'unlinked', label: 'לא מקושר לאתר' }].map((f) => (
            <button
              key={f.id}
              onClick={() => setRoleFilter(f.id)}
              className={`px-3 py-1.5 rounded-xl text-xs md:text-sm font-bold transition-colors ${roleFilter === f.id ? 'bg-purple-600 text-white' : 'bg-[#1f1f23] text-[#a9a9b2] hover:bg-[#2a292e] hover:text-white'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <AdminLoader />
      ) : filteredForumUsers.length === 0 ? (
        <div className="text-center py-12 text-[#94A3B8]">
          <p>לא נמצאו משתמשי פורום.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredForumUsers.map((fu) => {
            const linkedUser = fu.linkedUserId ? siteUsersMap[fu.linkedUserId] : null;
            return (
              <div key={fu.id} className="bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] p-3 md:p-4 rounded-xl">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <strong className="text-lg text-white">{fu.nickname}</strong>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${fu.role === 'forumAdmin' ? 'bg-purple-600' : 'bg-[#2a292e]'}`}>
                    {fu.role === 'forumAdmin' ? 'מנהל פורום' : 'משתמש'}
                  </span>
                  {fu.isBlocked && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#93000a]">חסום</span>
                  )}
                  {fu.isApproved === false && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-600">ממתין לאישור</span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 mb-2 text-xs">
                  <Mail size={12} className="text-[#94A3B8]" />
                  {fu.email ? (
                    <>
                      <span className="text-[#e4e1e7] font-mono ltr:text-left rtl:text-right" dir="ltr">{fu.email}</span>
                      {fu.emailVerified ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-700 text-white">מאומת</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-700 text-white">לא מאומת</span>
                      )}
                    </>
                  ) : (
                    <span className="text-[#94A3B8] italic">אין אימייל</span>
                  )}
                </div>

                <p className="text-xs text-[#94A3B8] mb-3">
                  {linkedUser
                    ? <>מקושר למשתמש אתר: <span className="text-[#e4e1e7]">{linkedUser.name}</span> — <PhoneLink phone={linkedUser.phoneNumber}>{linkedUser.phoneNumber}</PhoneLink></>
                    : 'לא מקושר לחשבון אתר'}
                  {fu.gender && <span> · מגדר: {fu.gender === 'female' ? 'אישה' : 'גבר'}</span>}
                </p>

                {fu.gender === 'female' ? (
                  <div className="mb-3 px-3 py-2 rounded-lg bg-emerald-900/30 border border-emerald-800 text-emerald-300 text-xs font-bold">
                    ⚖️ מנוי זהב אוטומטי — נשים פטורות מאישור איזון
                  </div>
                ) : (
                  <div className="mb-3 px-3 py-2 rounded-lg bg-[#1f1f23]/80 border border-[rgba(255,255,255,0.08)] text-xs">
                    ⚖️ איזון מגדרי:{' '}
                    {fu.subscriptionExpiry && new Date(fu.subscriptionExpiry).getTime() > Date.now() ? (
                      <span className="text-emerald-400 font-bold">מאושר עד {new Date(fu.subscriptionExpiry).toLocaleDateString('he-IL')}</span>
                    ) : (
                      <span className="text-[#94A3B8]">לא מאושר</span>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap gap-2 mb-2">
                  {fu.gender !== 'female' && (
                    <>
                      <button onClick={() => handleApproveBalance(fu, 1)} className="flex items-center gap-1 bg-emerald-700 hover:bg-emerald-600 text-white px-2.5 py-1 rounded-lg font-bold text-[11px]">
                        <Scale size={11} /> אשר איזון ליום אחד
                      </button>
                      <button onClick={() => handleApproveBalance(fu, 365)} className="flex items-center gap-1 bg-emerald-800 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg font-bold text-[11px]">
                        <Scale size={11} /> אשר איזון לשנה
                      </button>
                      {fu.subscriptionExpiry && (
                        <button onClick={() => handleRevokeBalance(fu)} className="flex items-center gap-1 bg-[#93000a]/60 hover:bg-[#be0037] text-white px-2.5 py-1 rounded-lg font-bold text-[11px]">
                          <XCircle size={11} /> בטל אישור
                        </button>
                      )}
                    </>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {fu.isApproved === false && (
                    <button
                      onClick={() => handleApproveUser(fu)}
                      className="flex items-center gap-1 bg-gradient-to-l from-[#ff5708] to-[#ff7a29] hover:brightness-110 text-white px-2.5 py-1 rounded-lg font-bold text-[11px]"
                    >
                      <CheckCircle size={11} /> אשר משתמש
                    </button>
                  )}
                  <button
                    onClick={() => handleToggleRole(fu)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors ${fu.role === 'forumAdmin' ? 'bg-[#2a292e] hover:bg-[#353439] text-white' : 'bg-purple-600 hover:bg-purple-500 text-white'}`}
                  >
                    {fu.role === 'forumAdmin' ? <ShieldOff size={11} /> : <Shield size={11} />}
                    {fu.role === 'forumAdmin' ? 'הסר מנהל' : 'הפוך למנהל'}
                  </button>
                  <button
                    onClick={() => handleToggleBlock(fu)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors ${fu.isBlocked ? 'bg-green-700 hover:bg-green-600 text-white' : 'bg-[#93000a] hover:bg-[#be0037] text-white'}`}
                  >
                    {fu.isBlocked ? <CheckCircle size={11} /> : <Ban size={11} />}
                    {fu.isBlocked ? 'בטל חסימה בפורום' : 'חסום בפורום'}
                  </button>
                  <button onClick={() => handleResetPassword(fu)} className="flex items-center gap-1 bg-[#2a292e] hover:bg-[#353439] text-white px-2.5 py-1 rounded-lg font-bold text-[11px]">
                    <KeyRound size={11} /> אפס סיסמה
                  </button>
                  <button onClick={() => handleSetEmail(fu)} className="flex items-center gap-1 bg-[#2a292e] hover:bg-[#353439] text-white px-2.5 py-1 rounded-lg font-bold text-[11px]" title={fu.email || ''}>
                    <Mail size={11} /> {fu.email ? `ערוך אימייל${fu.emailVerified ? ' ✓' : ''}` : 'הוסף אימייל'}
                  </button>
                  {fu.email && !fu.emailVerified && (
                    <button onClick={() => handleForceVerify(fu)} className="flex items-center gap-1 bg-emerald-700 hover:bg-emerald-600 text-white px-2.5 py-1 rounded-lg font-bold text-[11px]">
                      <MailCheck size={11} /> סמן כמאומת
                    </button>
                  )}
                  <button
                    onClick={() => handleKickFromChat(fu)}
                    className="flex items-center gap-1 bg-amber-700 hover:bg-amber-600 text-white px-2.5 py-1 rounded-lg font-bold text-[11px]"
                    title="יוסר מכל חדרי הצ'אט; אם ייכנס שוב — יתווסף אוטומטית לצ'אט הראשי."
                  >
                    <MessageSquareOff size={11} /> הוצא מהצ'אט
                  </button>
                  <button onClick={() => handleDelete(fu)} className="flex items-center gap-1 bg-[#93000a]/60 hover:bg-[#be0037] text-white px-2.5 py-1 rounded-lg font-bold text-[11px]">
                    <Trash2 size={11} /> מחק חשבון פורום
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ForumUsersSection;
