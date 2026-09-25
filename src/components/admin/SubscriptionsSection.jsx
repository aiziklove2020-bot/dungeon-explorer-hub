import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Search, Download, Upload, RotateCcw, Plus, Clock, Check, X, UserCog, Trash2, KeyRound } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import useAdminSection from '../../hooks/useAdminSection';
import AdminLoader from './AdminLoader';
import Loader from '../Loader';
import PhoneLink from '../PhoneLink';
import { todayLocalStr } from '../../utils/dateFormat';
import {
  createUser,
  getAllUsers,
  updateUserLevel,
  updateUserDetails,
  deleteUser,
  importUsers
} from '../../firebase/users';
import { getActiveParties, adminRemoveUserFromParty, getBalanceMatches, saveBalanceMatches } from '../../firebase/parties';
import { addPaymentRecord, PAYMENT_METHODS } from '../../firebase/crm';
import {
  SUBSCRIPTION_KINDS,
  getSubscription,
  addOrExtendSubscription,
  setSubscriptionExpiry,
  removeSubscription
} from '../../firebase/subscriptions';
import { getPendingSubscriptionRequests, resolveSubscriptionRequest, deleteSubscriptionRequest } from '../../firebase/subscriptionRequests';
import {
  getAllForumUsers,
  registerForumUser,
  approveForumUser,
  linkForumUserToSiteUser,
  setForumUserPasswordWithReset
} from '../../firebase/forumUsers';
import SubscriptionBadge from './SubscriptionBadge';
import SubscriptionEditor from './SubscriptionEditor';
import NewSubscriberModal from './NewSubscriberModal';
import RenewSubscriptionModal from './RenewSubscriptionModal';
import UserCrmModal from './UserCrmModal';

/** Most recent payment entry (by date, falling back to array order), or null. */
const lastPayment = (u) => {
  const payments = u.crm?.payments;
  if (!Array.isArray(payments) || payments.length === 0) return null;
  return [...payments].sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || ''))[0];
};

const SubscriptionsSection = ({ showSaved }) => {
  const { t } = useLanguage();
  const { data: users, loading, reload } = useAdminSection(getAllUsers);

  const [activeTab, setActiveTab] = useState('all'); // 'all', 'parties', 'exchangeParties'
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'active', 'gold', 'expiringSoon', 'expired'
  const [typeFilter, setTypeFilter] = useState(''); // '', 'male', 'female', 'blocked', 'admin'
  const [showNewSubscriber, setShowNewSubscriber] = useState(false);
  const [newSubscriberPrefill, setNewSubscriberPrefill] = useState(null);
  const [renewingUser, setRenewingUser] = useState(null);
  const [crmUserId, setCrmUserId] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [editUserForm, setEditUserForm] = useState({ name: '', phoneNumber: '', gender: '', telegramUsername: '' });
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);

  // Login accounts (the "forumUsers" collection — nickname + password used to
  // sign in to the site) keyed by the subscriber (`users/{id}`) they're
  // linked to, so the subscriber card can offer a password reset without
  // sending the admin to a separate tab.
  const [loginAccountsByUserId, setLoginAccountsByUserId] = useState({});

  const loadLoginAccounts = useCallback(async () => {
    try {
      const all = await getAllForumUsers();
      const map = {};
      all.forEach((fu) => { if (fu.linkedUserId) map[fu.linkedUserId] = fu; });
      setLoginAccountsByUserId(map);
    } catch {
      /* best-effort; the reset button just won't show a linked account yet */
    }
  }, []);

  const loadPendingRequests = useCallback(async () => {
    setLoadingRequests(true);
    try {
      const requests = await getPendingSubscriptionRequests();
      setPendingRequests(requests);
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  useEffect(() => { loadPendingRequests(); }, [loadPendingRequests]);
  useEffect(() => { loadLoginAccounts(); }, [loadLoginAccounts]);

  const handleApproveRequest = (request) => {
    const parts = String(request.fullName || '').trim().split(/\s+/);
    setNewSubscriberPrefill({
      requestId: request.id,
      firstName: parts[0] || '',
      lastName: parts.slice(1).join(' '),
      phoneNumber: request.phoneNumber || '',
    });
    setShowNewSubscriber(true);
  };

  const handleDismissRequest = async (request) => {
    if (!window.confirm(`להתעלם מהבקשה של "${request.fullName}"?`)) return;
    await resolveSubscriptionRequest(request.id, 'dismissed');
    await loadPendingRequests();
    showSaved();
  };

  const handleDeleteRequest = async (request) => {
    if (!window.confirm(`למחוק לצמיתות את הבקשה של "${request.fullName}"? לא ניתן לשחזר.`)) return;
    await deleteSubscriptionRequest(request.id);
    await loadPendingRequests();
    showSaved();
  };

  const handleCreateSubscriber = async ({ firstName, lastName, phoneNumber, paymentMethod, expiryDate, tier, login }) => {
    const fullName = `${firstName} ${lastName}`.trim();
    const user = await createUser(phoneNumber, fullName, 'male');
    // Gold has no expiry date — pass null so setSubscriptionExpiry treats it
    // as the unlimited/lifetime tier instead of parsing an empty date string.
    await setSubscriptionExpiry(user.id, 'parties', tier === 'gold' ? null : new Date(`${expiryDate}T00:00:00.000Z`), tier);
    await addPaymentRecord(user.id, {
      date: todayLocalStr(),
      method: paymentMethod,
      note: 'הפעלת מנוי חדש',
    });
    if (login?.mode === 'link-existing') {
      // The visitor self-registered with their own password through the
      // public form — approve and link that account rather than creating a
      // second one that would overwrite the password they chose.
      await approveForumUser(login.forumUserId);
      await linkForumUserToSiteUser(login.forumUserId, user.id);
      await loadLoginAccounts();
    } else if (login?.mode === 'create' && login?.nickname && login?.password) {
      const created = await registerForumUser(login.nickname, login.password, phoneNumber);
      await approveForumUser(created.id);
      await linkForumUserToSiteUser(created.id, user.id);
      await setForumUserPasswordWithReset(created.id, login.password);
      await loadLoginAccounts();
    }
    if (newSubscriberPrefill?.requestId) {
      await resolveSubscriptionRequest(newSubscriberPrefill.requestId, 'approved');
      await loadPendingRequests();
    }
    setShowNewSubscriber(false);
    setNewSubscriberPrefill(null);
    reload();
    showSaved();
  };

  const handleRenewSubscription = async ({ expiryDate, paymentMethod }) => {
    if (!renewingUser) return;
    await setSubscriptionExpiry(renewingUser.id, 'parties', new Date(`${expiryDate}T00:00:00.000Z`));
    await addPaymentRecord(renewingUser.id, {
      date: todayLocalStr(),
      method: paymentMethod,
      note: 'חידוש מנוי',
    });
    setRenewingUser(null);
    reload();
    showSaved();
  };

  const toDateInputValue = (value) => {
    if (!value) return '';
    if (value?.seconds) return new Date(value.seconds * 1000).toISOString().split('T')[0];
    if (value instanceof Date) return value.toISOString().split('T')[0];
    if (typeof value === 'string') {
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) return d.toISOString().split('T')[0];
    }
    return '';
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setEditUserForm({
      name: user.name || '',
      phoneNumber: user.phoneNumber || '',
      gender: user.gender || '',
      telegramUsername: user.telegramUsername || '',
    });
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setEditUserForm({ name: '', phoneNumber: '', gender: '', telegramUsername: '' });
  };

  const handlePhoneChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 0 && !value.startsWith('0')) value = '0' + value;
    if (value.length > 10) value = value.substring(0, 10);
    setEditUserForm((f) => ({ ...f, phoneNumber: value }));
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (!editingUser?.id) return;
    try {
      await updateUserDetails(editingUser.id, {
        name: editUserForm.name,
        phoneNumber: editUserForm.phoneNumber,
        gender: editUserForm.gender,
        telegramUsername: editUserForm.telegramUsername || null,
      });
      setEditingUser(null);
      reload();
      showSaved();
    } catch (error) {
      window.alert(`שגיאה בשמירת המשתמש: ${error.message}`);
    }
  };

  // Blocking removes the user from every party they're currently registered
  // to (and any balance match they're part of) — mirrors what used to live
  // in the separate "ניהול משתמשים" tab before it merged into this one.
  const handleUpdateUserLevel = async (userId, newLevel) => {
    try {
      if (newLevel === 'blocked') {
        const user = users.find((u) => u.id === userId);
        if (user?.phoneNumber) {
          const parties = await getActiveParties();
          const partiesWithUser = parties.filter((party) =>
            party.registrations?.some((reg) => reg.phoneNumber === user.phoneNumber || reg.userId === userId)
          );
          for (const party of partiesWithUser) {
            await adminRemoveUserFromParty(party.id, user.phoneNumber);
            const balanceMatches = party.balanceMatches?.length ? party.balanceMatches : await getBalanceMatches(party.id);
            if (balanceMatches?.length) {
              const updatedBalance = balanceMatches.filter(
                (match) => match.malePhone !== user.phoneNumber && match.femalePhone !== user.phoneNumber
              );
              await saveBalanceMatches(party.id, updatedBalance);
            }
          }
        }
      }
      await updateUserLevel(userId, newLevel);
      reload();
      showSaved();
    } catch (error) {
      window.alert(`הפעולה נכשלה: ${error.message || error}`);
    }
  };

  /** Reset the subscriber's site-login password. Creates a login account for
   *  them (linked to this subscriber) first if they don't have one yet, so
   *  this is the one action an admin needs regardless of whether the person
   *  ever registered a nickname themselves. */
  const handleResetLoginPassword = async (u) => {
    const existing = loginAccountsByUserId[u.id];
    const newPassword = prompt(
      existing
        ? `הזן סיסמה זמנית חדשה עבור "${u.name}" (הוא יחויב לבחור סיסמה משלו בהתחברות הבאה):`
        : `ל"${u.name}" אין עדיין חשבון כניסה לאתר. הזן סיסמה זמנית ליצירת החשבון (הוא יחויב לבחור סיסמה משלו בהתחברות הבאה):`
    );
    if (!newPassword) return;
    if (newPassword.length < 4) { alert('סיסמה חייבת להכיל לפחות 4 תווים'); return; }
    try {
      if (existing) {
        await setForumUserPasswordWithReset(existing.id, newPassword);
      } else {
        const defaultNick = (u.name || u.phoneNumber?.slice(-4) || 'user').replace(/\s+/g, '_').slice(0, 30);
        const nickname = prompt('בחר כינוי לחשבון הכניסה של המנוי:', defaultNick);
        if (!nickname) return;
        const created = await registerForumUser(nickname.trim(), newPassword, u.phoneNumber);
        await approveForumUser(created.id);
        await linkForumUserToSiteUser(created.id, u.id);
        await setForumUserPasswordWithReset(created.id, newPassword);
      }
      alert('הסיסמה נשמרה. המנוי יחויב לבחור סיסמה חדשה בהתחברות הבאה.');
      await loadLoginAccounts();
      showSaved();
    } catch (err) {
      alert(err.message || 'שגיאה באיפוס הסיסמה');
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`למחוק את "${userName}" לצמיתות?`)) return;
    try {
      await deleteUser(userId);
      reload();
      showSaved();
    } catch (error) {
      window.alert(`הפעולה נכשלה: ${error.message || error}`);
    }
  };

  const handleImportUsers = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setImporting(true);
      const importData = JSON.parse(await file.text());
      if (!Array.isArray(importData)) throw new Error('פורמט לא תקין: מצופה מערך משתמשים');
      const result = await importUsers(importData);
      window.alert(`ייבוא הצליח: ${result.imported} משתמשים יובאו, ${result.skipped} דולגו (כבר קיימים)`);
      reload();
      showSaved();
    } catch (error) {
      window.alert(`שגיאה בייבוא: ${error.message}`);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAction = async (userId, kind, action, payload) => {
    try {
      if (action === 'extend') {
        await addOrExtendSubscription(userId, kind, payload);
      } else if (action === 'customDate') {
        const expiryDate = new Date(`${payload}T00:00:00.000Z`);
        await setSubscriptionExpiry(userId, kind, expiryDate);
      } else if (action === 'cancel') {
        await removeSubscription(userId, kind);
      }
      reload();
      showSaved();
    } catch (error) {
      console.error('Error updating subscription:', error);
      window.alert(`הפעולה נכשלה: ${error.message || error}`);
    }
  };

  const processedUsers = useMemo(() => {
    if (!users) return [];
    
    return users.map(user => {
      const partiesInfo = getSubscription(user, 'parties');
      const exchangeInfo = getSubscription(user, 'exchangeParties');
      
      return {
        ...user,
        subs: {
          parties: partiesInfo,
          exchangeParties: exchangeInfo
        }
      };
    }).filter(user => {
      // "all" now means literally every user on the site (subscriber or
      // not) — the two specific-kind tabs still narrow to people who hold
      // that particular subscription, since "show me only מסיבות subscribers"
      // is a real, distinct question from "show me everyone".
      if (activeTab === 'parties' && !user.subs.parties.exists) return false;
      if (activeTab === 'exchangeParties' && !user.subs.exchangeParties.exists) return false;

      if (typeFilter === 'male' && user.gender !== 'male') return false;
      if (typeFilter === 'female' && user.gender !== 'female') return false;
      if (typeFilter === 'blocked' && user.level !== 'blocked') return false;
      if (typeFilter === 'admin' && user.level !== 'admin') return false;

      // Status filter
      if (filterStatus !== 'all') {
        const checkStatus = (info) => {
          if (!info.exists) return false;
          if (filterStatus === 'active') return info.isActive;
          if (filterStatus === 'gold') return info.isGold;
          if (filterStatus === 'expiringSoon') return info.isExpiringSoon;
          if (filterStatus === 'expired') return info.isExpired;
          return true;
        };

        if (activeTab === 'all') {
          if (!checkStatus(user.subs.parties) && !checkStatus(user.subs.exchangeParties)) return false;
        } else {
          if (!checkStatus(user.subs[activeTab])) return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!user.name?.toLowerCase().includes(q) && 
            !user.phoneNumber?.includes(q) && 
            !user.telegramUsername?.toLowerCase().includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [users, activeTab, filterStatus, typeFilter, searchQuery]);

  // Group + sort so it's obvious at a glance who holds which tier — the
  // admin's actual complaint was "I can't tell who has a year vs a month, and
  // I can't tell subscribers apart from plain registered site users". This
  // is now the single list of everyone on the site, so a "ללא מנוי" group
  // holds plain registrants (registered for a party, never became a
  // subscriber) right alongside real subscribers, instead of them being
  // invisible here and scattered across a separate tab.
  const TIER_GROUPS = [
    { id: 'gold', label: '⭐ זהב' },
    { id: 'year', label: '📅 שנה' },
    { id: 'halfYear', label: '📅 חצי שנה' },
    { id: 'month', label: '📅 חודש' },
    { id: 'day', label: '🌓 יום אחד' },
    { id: 'expired', label: '⛔ פג תוקף' },
    { id: 'other', label: 'אחר' },
    { id: 'none', label: '👤 ללא מנוי (רשום בלבד)' },
  ];

  const groupOf = (info) => {
    if (!info.exists) return 'none';
    if (info.isGold) return 'gold';
    if (info.isExpired) return 'expired';
    if (info.tier && TIER_GROUPS.some(g => g.id === info.tier)) return info.tier;
    return 'other';
  };

  const groupedUsers = useMemo(() => {
    const singleKind = activeTab === 'parties' || activeTab === 'exchangeParties';
    const groups = new Map(TIER_GROUPS.map(g => [g.id, []]));

    processedUsers.forEach(u => {
      let key;
      if (singleKind) {
        key = groupOf(u.subs[activeTab]);
      } else {
        // "all" tab: a user can hold two different tiers (one per kind) —
        // show them under whichever is "best", active status wins over expired.
        const p = groupOf(u.subs.parties);
        const e = groupOf(u.subs.exchangeParties);
        const priority = TIER_GROUPS.map(g => g.id);
        const candidates = [p, e].filter(Boolean);
        key = candidates.sort((a, b) => priority.indexOf(a) - priority.indexOf(b))[0];
      }
      if (key && groups.has(key)) groups.get(key).push(u);
    });

    const expirySort = (kind) => (a, b) => {
      const ea = a.subs[kind]?.expiryDate?.getTime?.() ?? Infinity;
      const eb = b.subs[kind]?.expiryDate?.getTime?.() ?? Infinity;
      return ea - eb;
    };
    const byName = (a, b) => (a.name || '').localeCompare(b.name || '', 'he');

    groups.forEach((list, key) => {
      if (singleKind && key !== 'gold') {
        list.sort(expirySort(activeTab));
      } else {
        list.sort(byName);
      }
    });

    return TIER_GROUPS
      .map(g => ({ ...g, users: groups.get(g.id) }))
      .filter(g => g.users.length > 0);
  }, [processedUsers, activeTab]);

  const stats = useMemo(() => {
    if (!users) return { total: 0, active: 0, gold: 0, expiringSoon: 0, expired: 0 };
    
    let total = 0, active = 0, gold = 0, expiringSoon = 0, expired = 0;
    
    users.forEach(user => {
      const p = getSubscription(user, 'parties');
      const e = getSubscription(user, 'exchangeParties');
      
      const checkInfo = (info) => {
        if (!info.exists) return;
        total++;
        if (info.isActive) active++;
        if (info.isGold) gold++;
        if (info.isExpiringSoon) expiringSoon++;
        if (info.isExpired) expired++;
      };

      if (activeTab === 'parties') checkInfo(p);
      else if (activeTab === 'exchangeParties') checkInfo(e);
      else {
        // "all" tab - don't double count the user if they have both
        if (p.exists || e.exists) total++;
        if (p.isActive || e.isActive) active++;
        if (p.isGold || e.isGold) gold++;
        if (p.isExpiringSoon || e.isExpiringSoon) expiringSoon++;
        if (p.isExpired || e.isExpired) expired++;
      }
    });

    return { total, active, gold, expiringSoon, expired };
  }, [users, activeTab]);

  const handleExport = () => {
    const exportData = processedUsers.map(u => {
      const row = {
        name: u.name || '',
        phone: u.phoneNumber || '',
        telegram: u.telegramUsername || '',
      };
      
      if (activeTab === 'parties' || activeTab === 'all') {
        row['parties_status'] = u.subs.parties.exists 
          ? (u.subs.parties.isGold ? 'Gold' : u.subs.parties.isExpired ? 'Expired' : 'Active') 
          : 'None';
        row['parties_expiry'] = u.subs.parties.expiry || '';
      }
      
      if (activeTab === 'exchangeParties' || activeTab === 'all') {
        row['exchange_status'] = u.subs.exchangeParties.exists 
          ? (u.subs.exchangeParties.isGold ? 'Gold' : u.subs.exchangeParties.isExpired ? 'Expired' : 'Active') 
          : 'None';
        row['exchange_expiry'] = u.subs.exchangeParties.expiry || '';
      }
      
      return row;
    });

    const headers = Object.keys(exportData[0] || {}).join(',');
    const csv = [
      headers,
      ...exportData.map(row => Object.values(row).map(v => `"${v}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subscriptions_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-[#121218] backdrop-blur-2xl border border-white/5 p-4 md:p-6 rounded-xl md:rounded-2xl space-y-4 md:space-y-6">
      
      {/* Header & Main Tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold">{t('admin.subscriptions') || 'ניהול משתמשים ומנויים'}</h2>
          <p className="text-xs text-[#94A3B8] mt-1">
            מקום אחד לכולם: מנויים בתשלום (מקובצים לפי סוג/תוקף) וגם מי שרק נרשם לאתר בלי מנוי (בקבוצת "ללא מנוי" למטה). כרטיס אחד לכל משתמש — מנוי, תמונה, תשלום אחרון, חסימה, עריכה.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setShowNewSubscriber(true)} className="bg-[#ff5708] hover:bg-[#ff7a29] text-white px-3 py-1.5 rounded-xl font-bold flex items-center gap-2 text-sm">
            <Plus size={14} /> מנוי חדש
          </button>
          <button onClick={reload} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-xl font-bold flex items-center gap-2 text-sm">
            <RotateCcw size={14} /> רענן
          </button>
          <button onClick={handleExport} disabled={processedUsers.length === 0} className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-xl font-bold flex items-center gap-2 text-sm">
            <Download size={14} /> ייצא CSV
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-xl font-bold flex items-center gap-2 text-sm"
          >
            {importing ? <Loader size="small" /> : <Upload size={14} />}
            ייבא JSON
          </button>
          <input ref={fileInputRef} type="file" accept=".json" onChange={handleImportUsers} className="hidden" />
        </div>
      </div>

      {!loadingRequests && pendingRequests.length > 0 && (
        <div className="bg-amber-900/20 border border-amber-700/40 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-amber-400" />
            <h3 className="font-bold text-amber-300">ממתינים למנוי ({pendingRequests.length})</h3>
          </div>
          <div className="space-y-2">
            {pendingRequests.map((req) => (
              <div key={req.id} className="flex flex-wrap items-center justify-between gap-2 bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] rounded-lg p-3">
                <div>
                  <p className="font-bold text-white">{req.fullName}</p>
                  <PhoneLink phone={req.phoneNumber}>{req.phoneNumber}</PhoneLink>
                  {req.note && <p className="text-[#94A3B8] text-xs mt-1">{req.note}</p>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleApproveRequest(req)} className="flex items-center gap-1 bg-[#ff5708] hover:bg-[#ff7a29] text-white px-3 py-1.5 rounded-lg font-bold text-xs">
                    <Check size={12} /> אשר מנוי
                  </button>
                  <button onClick={() => handleDismissRequest(req)} className="flex items-center gap-1 bg-[#2a292e] hover:bg-[#353439] text-white px-3 py-1.5 rounded-lg font-bold text-xs">
                    <X size={12} /> התעלם
                  </button>
                  <button onClick={() => handleDeleteRequest(req)} className="flex items-center gap-1 bg-red-900/40 hover:bg-red-900/60 text-red-300 px-3 py-1.5 rounded-lg font-bold text-xs">
                    <Trash2 size={12} /> מחק
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && (
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
            <p className="text-[#94A3B8] text-xs font-bold">כלל המשתמשים באתר</p>
            <p className="text-2xl font-bold mt-1">{users?.length || 0}</p>
          </div>
          <div className="bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
            <p className="text-[#94A3B8] text-xs font-bold">מנויים (סה״כ)</p>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </div>
          <div className="bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
            <p className="text-[#94A3B8] text-xs font-bold">מנויים פעילים</p>
            <p className="text-2xl font-bold mt-1" style={{ color: '#10B981' }}>{stats.active}</p>
          </div>
          <div className="bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
            <p className="text-[#94A3B8] text-xs font-bold">זהב</p>
            <p className="text-2xl font-bold mt-1" style={{ color: '#f59e0b' }}>{stats.gold}</p>
          </div>
          <div className="bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
            <p className="text-[#94A3B8] text-xs font-bold">מנויים שפגו</p>
            <p className="text-2xl font-bold mt-1" style={{ color: '#ffb4ab' }}>{stats.expired}</p>
          </div>
          <div className="bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
            <p className="text-[#94A3B8] text-xs font-bold">חסומים</p>
            <p className="text-2xl font-bold mt-1" style={{ color: '#ff5a72' }}>{users?.filter(u => u.level === 'blocked').length || 0}</p>
          </div>
        </div>
      )}

      {/* Sub Tabs */}
      <div className="flex gap-2 border-b border-[rgba(255,255,255,0.08)] pb-4">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'all' ? 'bg-[#ff5708] text-white' : 'bg-[#1f1f23] text-[#a9a9b2] hover:text-white'}`}
        >
          כולם
        </button>
        <button
          onClick={() => setActiveTab('parties')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'parties' ? 'bg-[#ff5708] text-white' : 'bg-[#1f1f23] text-[#a9a9b2] hover:text-white'}`}
        >
          מנויי מסיבות
        </button>
        <button
          onClick={() => setActiveTab('exchangeParties')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'exchangeParties' ? 'bg-[#ff5708] text-white' : 'bg-[#1f1f23] text-[#a9a9b2] hover:text-white'}`}
        >
          מנויי מסיבות חילופים
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <Search size={18} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#a9a9b2]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="חיפוש לפי שם או טלפון..."
            className="w-full bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] p-3 pr-10 rounded-xl focus:border-[#ff5708] outline-none text-white text-right"
          />
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[#94A3B8] text-sm font-bold">סטטוס:</span>
          {[{ id: 'all', label: 'הכל', color: 'bg-[#353439]' },
            { id: 'active', label: 'פעיל', color: 'bg-green-600' },
            { id: 'gold', label: 'זהב', color: 'bg-yellow-600' },
            { id: 'expiringSoon', label: 'עומד לפוג', color: 'bg-orange-600' },
            { id: 'expired', label: 'פג תוקף', color: 'bg-[#93000a]' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterStatus(f.id)}
              className={`px-3 py-1.5 rounded-xl text-xs md:text-sm font-bold transition-colors ${filterStatus === f.id ? f.color + ' text-white' : 'bg-[#1f1f23] text-[#a9a9b2] hover:bg-[#2a292e] hover:text-white'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-[#94A3B8] text-sm font-bold">סוג:</span>
        {[{ id: '', label: 'הכל', color: 'bg-[#ff5708]' },
          { id: 'male', label: 'גברים', color: 'bg-blue-600' },
          { id: 'female', label: 'נשים', color: 'bg-pink-600' },
          { id: 'blocked', label: 'חסומים', color: 'bg-[#93000a]' },
          { id: 'admin', label: 'מנהלים', color: 'bg-[#ff5708]' },
        ].map(f => (
          <button
            key={f.id || 'none'}
            onClick={() => setTypeFilter(f.id)}
            className={`px-3 py-1.5 rounded-xl text-xs md:text-sm font-bold transition-colors ${typeFilter === f.id ? f.color + ' text-white' : 'bg-[#1f1f23] text-[#a9a9b2] hover:bg-[#2a292e] hover:text-white'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <AdminLoader />
      ) : processedUsers.length === 0 ? (
        <div className="text-center py-12 text-[#94A3B8]">
          <p>לא נמצאו מנויים התואמים לסינון.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedUsers.map(group => (
            <div key={group.id}>
              <h3 className="text-sm font-bold text-[#a9a9b2] mb-2 flex items-center gap-2">
                {group.label}
                <span className="text-xs font-normal text-[#64748B]">({group.users.length})</span>
              </h3>
              <div className="space-y-3">
                {group.users.map(u => {
                  const payment = lastPayment(u);
                  if (editingUser?.id === u.id) {
                    return (
                      <form key={u.id} onSubmit={handleSaveUser} className="bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] p-3 md:p-4 rounded-xl space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs uppercase font-bold text-[#94A3B8]">שם מלא *</label>
                            <input type="text" value={editUserForm.name} onChange={(e) => setEditUserForm((f) => ({ ...f, name: e.target.value }))} className="w-full bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] p-3 rounded-xl focus:border-[#ff5708] outline-none text-white text-right" required />
                          </div>
                          <div>
                            <label className="text-xs uppercase font-bold text-[#94A3B8]">מספר טלפון *</label>
                            <input type="tel" value={editUserForm.phoneNumber} onChange={handlePhoneChange} placeholder="05XXXXXXXX" maxLength="10" className="w-full bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] p-3 rounded-xl focus:border-[#ff5708] outline-none text-white text-right" required />
                          </div>
                          <div>
                            <label className="text-xs uppercase font-bold text-[#94A3B8]">מין</label>
                            <select value={editUserForm.gender} onChange={(e) => setEditUserForm((f) => ({ ...f, gender: e.target.value }))} className="w-full bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] p-3 rounded-xl focus:border-[#ff5708] outline-none text-white text-right">
                              <option value="">בחר מין</option>
                              <option value="male">זכר</option>
                              <option value="female">נקבה</option>
                              <option value="notDefined">לא מוגדר</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs uppercase font-bold text-[#94A3B8]">טלגרם</label>
                            <input type="text" value={editUserForm.telegramUsername || ''} onChange={(e) => setEditUserForm((f) => ({ ...f, telegramUsername: e.target.value.replace(/^@+/g, '') }))} placeholder="username (ללא @)" className="w-full bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] p-3 rounded-xl focus:border-[#ff5708] outline-none text-white text-right" />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button type="submit" className="bg-[#ff5708] hover:bg-[#ff7a29] text-white px-6 py-2 rounded-xl font-bold">שמור</button>
                          <button type="button" onClick={handleCancelEdit} className="bg-[#2a292e] hover:bg-[#353439] text-white px-6 py-2 rounded-xl font-bold">ביטול</button>
                        </div>
                      </form>
                    );
                  }
                  return (
                  <div key={u.id} className="bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] p-3 md:p-4 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      {u.photoUrl ? (
                        <img src={u.photoUrl} alt="" className="w-11 h-11 rounded-full object-cover shrink-0 border border-[rgba(255,255,255,0.08)]" />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-[#2a292e] flex items-center justify-center shrink-0 text-[#a9a9b2] font-bold text-lg">
                          {(u.name || '?').trim().charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <strong className="text-lg text-white">{u.name}</strong>
                          {u.level === 'admin' && <span className="px-2 py-0.5 rounded text-xs font-bold bg-[#ff5708]">Admin</span>}
                          {u.level === 'blocked' && <span className="px-2 py-0.5 rounded text-xs font-bold bg-[#93000a]">Blocked</span>}
                        </div>
                        <div className="text-sm text-[#a9a9b2] flex gap-3">
                          <span><PhoneLink phone={u.phoneNumber}>{u.phoneNumber}</PhoneLink></span>
                          {u.telegramUsername && <span>@{u.telegramUsername}</span>}
                        </div>

                        <div className="mt-3 flex flex-col gap-1.5">
                          {(activeTab === 'all' || activeTab === 'parties') && u.subs.parties.exists && (
                            <SubscriptionBadge user={u} kind="parties" />
                          )}
                          {(activeTab === 'all' || activeTab === 'exchangeParties') && u.subs.exchangeParties.exists && (
                            <SubscriptionBadge user={u} kind="exchangeParties" />
                          )}
                        </div>

                        <div className="mt-1.5 text-xs text-[#94A3B8]">
                          {payment
                            ? <>💳 שולם: <span className="text-[#e5e1e4]">{payment.method}</span>{payment.date ? ` · ${new Date(payment.date).toLocaleDateString('he-IL')}` : ''}</>
                            : <span className="opacity-70">אין תשלום רשום</span>}
                        </div>
                      </div>
                    </div>

                    <div className="w-full md:w-auto self-end md:self-center flex flex-wrap gap-2 justify-end">
                      {u.subs.parties.isExpired && (
                        <button
                          onClick={() => setRenewingUser(u)}
                          className="bg-green-600 hover:bg-green-500 text-white px-3 py-2 rounded-xl font-bold text-xs md:text-sm"
                        >
                          🔄 חידוש מנוי
                        </button>
                      )}
                      <button
                        onClick={() => setCrmUserId(u.id)}
                        className="bg-purple-700 hover:bg-purple-600 text-white px-3 py-2 rounded-xl font-bold text-xs md:text-sm"
                      >
                        💼 CRM ותשלומים
                      </button>
                      <button
                        onClick={() => handleEditUser(u)}
                        className="bg-[#2a292e] hover:bg-[#353439] text-white px-3 py-2 rounded-xl font-bold text-xs md:text-sm"
                      >
                        ✏️ ערוך
                      </button>
                      <button
                        onClick={() => handleResetLoginPassword(u)}
                        title={loginAccountsByUserId[u.id] ? `כינוי כניסה: ${loginAccountsByUserId[u.id].nickname}` : 'אין עדיין חשבון כניסה — הכפתור ייצור אחד'}
                        className="flex items-center gap-1 bg-[#2a292e] hover:bg-[#353439] text-white px-3 py-2 rounded-xl font-bold text-xs md:text-sm"
                      >
                        <KeyRound size={13} /> {loginAccountsByUserId[u.id] ? 'איפוס סיסמה' : 'צור כניסה + סיסמה'}
                      </button>
                      {u.level === 'blocked' ? (
                        <button onClick={() => handleUpdateUserLevel(u.id, 'regular')} className="bg-green-600 hover:bg-green-500 text-white px-3 py-2 rounded-xl font-bold text-xs md:text-sm">
                          בטל חסימה
                        </button>
                      ) : (
                        <button onClick={() => handleUpdateUserLevel(u.id, 'blocked')} className="bg-[#93000a] hover:bg-[#be0037] text-white px-3 py-2 rounded-xl font-bold text-xs md:text-sm">
                          🚫 חסום
                        </button>
                      )}
                      <button onClick={() => handleDeleteUser(u.id, u.name)} className="bg-[#93000a] hover:bg-[#be0037] text-white px-3 py-2 rounded-xl font-bold text-xs md:text-sm">
                        🗑️ מחק
                      </button>
                      <SubscriptionEditor onAction={(kind, action, payload) => handleAction(u.id, kind, action, payload)} />
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {showNewSubscriber && (
        <NewSubscriberModal
          initialValues={newSubscriberPrefill}
          onClose={() => { setShowNewSubscriber(false); setNewSubscriberPrefill(null); }}
          onSubmit={handleCreateSubscriber}
        />
      )}

      {renewingUser && (
        <RenewSubscriptionModal
          user={renewingUser}
          onClose={() => setRenewingUser(null)}
          onSubmit={handleRenewSubscription}
        />
      )}

      {crmUserId && (() => {
        const crmUser = users.find((u) => u.id === crmUserId);
        if (!crmUser) return null;
        return (
          <UserCrmModal
            user={crmUser}
            onClose={() => setCrmUserId(null)}
            onSubscriptionAction={(kind, action, payload) => handleAction(crmUser.id, kind, action, payload)}
          />
        );
      })()}
    </div>
  );
};

export default SubscriptionsSection;
