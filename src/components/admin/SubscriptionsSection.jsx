import React, { useState, useMemo } from 'react';
import { Search, Download, RotateCcw } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import useAdminSection from '../../hooks/useAdminSection';
import AdminLoader from './AdminLoader';
import PhoneLink from '../PhoneLink';
import { getAllUsers } from '../../firebase/users';
import { 
  SUBSCRIPTION_KINDS, 
  getSubscription, 
  addOrExtendSubscription, 
  setSubscriptionExpiry, 
  removeSubscription 
} from '../../firebase/subscriptions';
import SubscriptionBadge from './SubscriptionBadge';
import SubscriptionEditor from './SubscriptionEditor';

const SubscriptionsSection = ({ showSaved }) => {
  const { t } = useLanguage();
  const { data: users, loading, reload } = useAdminSection(getAllUsers);
  
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'parties', 'exchangeParties'
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'active', 'gold', 'expiringSoon', 'expired'

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
      // Base filter: must have at least one subscription history/record 
      // (even if expired) for the selected tab
      if (activeTab === 'parties' && !user.subs.parties.exists) return false;
      if (activeTab === 'exchangeParties' && !user.subs.exchangeParties.exists) return false;
      if (activeTab === 'all' && !user.subs.parties.exists && !user.subs.exchangeParties.exists) return false;
      
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
  }, [users, activeTab, filterStatus, searchQuery]);

  // Group + sort so it's obvious at a glance who holds which tier — the
  // admin's actual complaint was "I can't tell who has a year vs a month, and
  // I can't tell subscribers apart from plain registered site users" (this
  // list already only shows users with an actual parties/exchangeParties
  // subscription record, never plain registered accounts).
  const TIER_GROUPS = [
    { id: 'gold', label: '⭐ זהב' },
    { id: 'year', label: '📅 שנה' },
    { id: 'halfYear', label: '📅 חצי שנה' },
    { id: 'month', label: '📅 חודש' },
    { id: 'day', label: '🌓 יום אחד' },
    { id: 'expired', label: '⛔ פג תוקף' },
    { id: 'other', label: 'אחר' },
  ];

  const groupOf = (info) => {
    if (!info.exists) return null;
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
          <h2 className="text-xl md:text-2xl font-bold">{t('admin.subscriptions') || 'ניהול מנויים'}</h2>
          {!loading && (
            <p className="text-sm text-zinc-400 mt-1 flex flex-wrap gap-x-4 gap-y-0">
              <span>סה"כ רשומות: <span className="text-white font-medium">{stats.total}</span></span>
              <span>פעילים: <span className="text-green-400 font-medium">{stats.active}</span></span>
              <span>זהב: <span className="text-yellow-400 font-medium">{stats.gold}</span></span>
              <span>פגים: <span className="text-red-400 font-medium">{stats.expired}</span></span>
            </p>
          )}
          <p className="text-xs text-zinc-500 mt-1">
            כאן מוצגים רק משתמשים עם מנוי בתשלום (מסיבות / מסיבות חילופים), מקובצים לפי סוג המנוי. משתמש שרק רשום לאתר בלי מנוי — זה עניין נפרד, ומופיע ב"ניהול משתמשים" ולא כאן.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={reload} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-xl font-bold flex items-center gap-2 text-sm">
            <RotateCcw size={14} /> רענן
          </button>
          <button onClick={handleExport} disabled={processedUsers.length === 0} className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-xl font-bold flex items-center gap-2 text-sm">
            <Download size={14} /> ייצא CSV
          </button>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex gap-2 border-b border-[rgba(255,255,255,0.08)] pb-4">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'all' ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
        >
          כל המנויים
        </button>
        <button
          onClick={() => setActiveTab('parties')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'parties' ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
        >
          מנויי מסיבות
        </button>
        <button
          onClick={() => setActiveTab('exchangeParties')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'exchangeParties' ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
        >
          מנויי מסיבות חילופים
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <Search size={18} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="חיפוש לפי שם או טלפון..."
            className="w-full bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] p-3 pr-10 rounded-xl focus:border-[#e11d48] outline-none text-white text-right"
          />
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-zinc-500 text-sm font-bold">סטטוס:</span>
          {[{ id: 'all', label: 'הכל', color: 'bg-zinc-600' },
            { id: 'active', label: 'פעיל', color: 'bg-green-600' },
            { id: 'gold', label: 'זהב', color: 'bg-yellow-600' },
            { id: 'expiringSoon', label: 'עומד לפוג', color: 'bg-orange-600' },
            { id: 'expired', label: 'פג תוקף', color: 'bg-red-900' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterStatus(f.id)}
              className={`px-3 py-1.5 rounded-xl text-xs md:text-sm font-bold transition-colors ${filterStatus === f.id ? f.color + ' text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <AdminLoader />
      ) : processedUsers.length === 0 ? (
        <div className="text-center py-12 text-zinc-500">
          <p>לא נמצאו מנויים התואמים לסינון.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedUsers.map(group => (
            <div key={group.id}>
              <h3 className="text-sm font-bold text-zinc-400 mb-2 flex items-center gap-2">
                {group.label}
                <span className="text-xs font-normal text-zinc-600">({group.users.length})</span>
              </h3>
              <div className="space-y-3">
                {group.users.map(u => (
                  <div key={u.id} className="bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] p-3 md:p-4 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <strong className="text-lg text-white">{u.name}</strong>
                        {u.level === 'admin' && <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-600">Admin</span>}
                        {u.level === 'blocked' && <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-900">Blocked</span>}
                      </div>
                      <div className="text-sm text-zinc-400 flex gap-3">
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
                    </div>

                    <div className="w-full md:w-auto self-end md:self-center">
                      <SubscriptionEditor onAction={(kind, action, payload) => handleAction(u.id, kind, action, payload)} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SubscriptionsSection;
