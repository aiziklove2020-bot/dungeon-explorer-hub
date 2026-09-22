import { useState, useEffect } from 'react';
import { RotateCcw, Plus, Trash2, Clock, AlertTriangle, X } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import AdminLoader from './AdminLoader';
import { getAllParties, createParty, updateParty, deleteParty, adminRemoveUserFromParty, recomputeAllPartiesExpiration } from '../../firebase/parties';
import { createUserFromRegistration, getAllUsers } from '../../firebase/users';
import { getPartySettings, updatePartySettings } from '../../firebase/partySettings';
import { DEFAULT_PARTY_RETENTION_HOURS, isPartyExpiredByDate } from '../../../shared/partyExpiry.js';
import PartyEditor from './PartyEditor';
import RegistrationItem from './RegistrationItem';
import CoupleRegistrationItem from './CoupleRegistrationItem';
import PartyImage from '../PartyImage';

/**
 * Retention-hours preset options shown in the admin select. Picked to cover the
 * common "1 day after / 2 days after / weekend / week" cases without exposing a
 * raw number input — keeps the value within the bounded range the shared
 * helper expects.
 */
const RETENTION_OPTIONS = [
  { value: 24, labelKey: 'admin.partyRetention.option24' },
  { value: 48, labelKey: 'admin.partyRetention.option48' },
  { value: 72, labelKey: 'admin.partyRetention.option72' },
  { value: 96, labelKey: 'admin.partyRetention.option96' },
  { value: 168, labelKey: 'admin.partyRetention.option168' },
];

const PartiesSection = ({ showSaved, refreshKey }) => {
  const { t } = useLanguage();
  const [activeParties, setActiveParties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingParty, setEditingParty] = useState(null);
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [allUsersMap, setAllUsersMap] = useState(new Map()); // Map of phoneNumber -> user
  const [retentionHours, setRetentionHours] = useState(DEFAULT_PARTY_RETENTION_HOURS);
  const [savingRetention, setSavingRetention] = useState(false);
  // After a successful retention change we recompute every party's
  // `expiration` field. Public visibility lives in `content.json`, so the admin
  // must publish to Git for the new rule to actually take effect — we surface
  // a one-shot notice with the count of parties that were rewritten.
  const [retentionPublishNotice, setRetentionPublishNotice] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusTab, setStatusTab] = useState('all');
  // Which party's full detail/quick-control panel is showing on the right
  // (desktop) or below the list (mobile) — list rows stay compact, matching
  // the reference mockup's list+detail split instead of one long stacked card
  // per party.
  const [selectedPartyId, setSelectedPartyId] = useState(null);

  const loadActiveParties = async () => {
    try {
      setLoading(true);
      // Full visibility for the admin: every party, expired or not — no
      // auto-cleanup here (that used to silently delete "expired" docs on
      // every load, before the admin ever saw them).
      const parties = await getAllParties();
      const toMs = (d) => {
        const dt = d instanceof Date ? d : d?.toDate ? d.toDate() : new Date(d);
        const t = dt?.getTime?.();
        return Number.isFinite(t) ? t : Number.MAX_SAFE_INTEGER;
      };
      parties.sort((a, b) => toMs(a.date) - toMs(b.date));
      setActiveParties(parties);
      
      // Load all users once to avoid multiple calls in RegistrationItem
      const allUsers = await getAllUsers();
      const usersMap = new Map();
      allUsers.forEach(user => {
        if (user.phoneNumber) {
          usersMap.set(user.phoneNumber, user);
        }
      });
      setAllUsersMap(usersMap);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActiveParties();
  }, []);

  // Load the persisted retention-hours setting once. Errors fall back silently
  // to the default so the rest of the page still works if Firestore is down.
  useEffect(() => {
    let cancelled = false;
    getPartySettings()
      .then((settings) => {
        if (!cancelled && settings?.retentionHours) {
          setRetentionHours(settings.retentionHours);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (refreshKey > 0) {
      loadActiveParties(true);
    }
  }, [refreshKey]);

  const handleRetentionChange = async (event) => {
    const next = parseInt(event.target.value, 10);
    if (!Number.isFinite(next)) return;
    setSavingRetention(true);
    try {
      const saved = await updatePartySettings({ retentionHours: next });
      setRetentionHours(saved.retentionHours);
      // Cascade the new rule onto every party doc so each one carries an
      // up-to-date `expiration`. The DB write flips `needsPublish`; the count
      // tells the admin how many lines will move on the next publish.
      const changed = await recomputeAllPartiesExpiration(saved.retentionHours);
      // Refresh the list so the badge / counts reflect the new state without
      // forcing the admin to navigate away.
      if (changed > 0) await loadActiveParties(true);
      setRetentionPublishNotice({ changed, hours: saved.retentionHours });
      showSaved();
    } catch (error) {
      alert(`${t('admin.errorSavingParty') || 'Error'}: ${error.message}`);
    } finally {
      setSavingRetention(false);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getGenderCount = (party, gender) => {
    const regs = party.registrations || [];
    if (gender === 'male') {
      return regs.filter(reg => reg.gender === 'male').length || 0;
    }
    if (gender === 'female') {
      return regs.filter(reg => reg.gender === 'female').length || 0;
    }
    return regs.length;
  };

  const getRegistrationDisplayItems = (registrations) => {
    const regs = registrations || [];
    const couplesByCoupleId = {};
    regs.forEach(reg => {
      if (reg.coupleId) {
        if (!couplesByCoupleId[reg.coupleId]) couplesByCoupleId[reg.coupleId] = [];
        couplesByCoupleId[reg.coupleId].push(reg);
      }
    });
    const processedCoupleIds = new Set();
    const items = [];
    regs.forEach(reg => {
      if (reg.coupleId && couplesByCoupleId[reg.coupleId]) {
        if (processedCoupleIds.has(reg.coupleId)) return;
        processedCoupleIds.add(reg.coupleId);
        const group = couplesByCoupleId[reg.coupleId];
        const maleReg = group.find(r => r.gender === 'male');
        const femaleReg = group.find(r => r.gender === 'female');
        if (maleReg && femaleReg) {
          items.push({ type: 'couple', maleReg, femaleReg });
        } else {
          group.forEach(r => items.push({ type: 'single', registration: r }));
        }
      } else if (!reg.coupleId) {
        items.push({ type: 'single', registration: reg });
      }
    });
    return items;
  };

  const exportRegistrationsByType = (party) => {
    const typeLabels = {
      'single-female-balance': t('admin.singleFemaleBalance'),
      'single-male-balance': t('admin.singleMaleBalance'),
      'single-female-discount': t('admin.singleFemaleDiscount'),
      'couple': t('admin.couple'),
      'other': t('admin.unassigned')
    };

    const grouped = {};
    (party.registrations || []).forEach(reg => {
      const type = reg.registrationType || 'other';
      if (!grouped[type]) grouped[type] = [];
      grouped[type].push(reg);
    });

    let csvContent = '\ufeff';
    csvContent += `${t('party.defaultName')}: ${party.name}\n`;
    csvContent += `${t('admin.date')}: ${formatDate(party.date)}\n\n`;

    Object.keys(typeLabels).forEach(type => {
      const registrations = grouped[type] || [];
      if (registrations.length === 0) return;

      csvContent += `${typeLabels[type]} (${registrations.length})\n`;
      csvContent += `${t('admin.csvHeaders')}\n`;

      registrations.forEach(reg => {
        const name = (reg.fullName || reg.userName || '').replace(/"/g, '""');
        const phone = (reg.phoneNumber || '').replace(/"/g, '""');
        const telegram = (reg.telegramUsername || '').replace(/"/g, '""');
        const regType = (reg.registrationType || type).replace(/"/g, '""');
        const gender = (reg.gender || '').replace(/"/g, '""');
        const regDate = reg.registeredAt 
          ? new Date(reg.registeredAt.seconds * 1000).toLocaleString('he-IL')
          : '';
        
        csvContent += `"${name}","${phone}","${telegram}","${regType}","${gender}","${regDate}"\n`;
      });
      csvContent += '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${party.name.replace(/[^a-z0-9]/gi, '_')}_registrations_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Handle edit party
  const handleEditParty = (party) => {
    setEditingParty(party);
  };

  // Handle delete party
  const handleDeleteParty = async (partyId, partyName) => {
    if (!window.confirm(`${t('admin.confirmDeleteParty')} "${partyName}"?`)) {
      return;
    }
    try {
      await deleteParty(partyId);
      loadActiveParties();
      showSaved();
    } catch (error) {
      alert(`${t('admin.errorDeletingParty')}: ${error.message}`);
    }
  };

  // Handle save party edit
  const handleSavePartyEdit = async (partyId, partyData) => {
    try {
      // Convert date string to Date object if needed
      let dateValue = partyData.date;
      if (typeof dateValue === 'string') {
        dateValue = new Date(dateValue);
      }
      const updatedData = {
        ...partyData,
        date: dateValue
      };
      
      if (partyId) {
        // Update existing party
        await updateParty(partyId, updatedData);
      } else {
        // Create new party
        await createParty(updatedData);
      }
      
      setEditingParty(null);
      loadActiveParties();
      showSaved();
    } catch (error) {
      alert(`${t('admin.errorSavingParty')}: ${error.message}`);
    }
  };

  // Convert client to user. `day` only approves gender balance for this
  // specific party; `year` grants a real full-site subscription — the
  // confirm() spells out exactly what's about to happen and until when,
  // so a misclick doesn't silently hand out a free year of access.
  const handleConvertClientToUser = async (registration, tier = 'year') => {
    const name = registration.fullName || registration.userName || registration.phoneNumber || t('admin.user');
    // Women get free full access automatically (see getSubscription's
    // gender bypass) — the tier/expiry stored here doesn't actually gate
    // anything for them, so the confirmation should say so, not quote a
    // paid-subscription expiry date that's misleading for this case.
    const message = registration.gender === 'female'
      ? `ליצור למשתמשת ${name} חשבון באתר? היא תקבל גישה מלאה וחינמית אוטומטית (איזון מגדרי).`
      : tier === 'year'
        ? (() => {
            const expiry = new Date();
            expiry.setFullYear(expiry.getFullYear() + 1);
            const expiryStr = expiry.toLocaleDateString('he-IL');
            return `לתת ל${name} מנוי מלא לכל האתר עד ${expiryStr} (שנה מהיום)?\n\nלאישור חד פעמי למסיבה הזו בלבד, השתמש בכפתור הנפרד.`;
          })()
        : `לאשר איזון מגדרי ל${name} — למסיבה הזו בלבד? זה לא הופך אותו למנוי קבוע.`;
    if (!window.confirm(message)) return;

    try {
      await createUserFromRegistration(registration, 'registered', tier);
      loadActiveParties();
      showSaved();
    } catch (error) {
      alert(`${t('admin.errorConvertingClientToUser')}: ${error.message}`);
    }
  };

  // Handle remove user from party
  const handleRemoveFromParty = async (partyId, registration) => {
    const userName = registration.fullName || registration.userName || registration.phoneNumber || t('admin.user');
    if (!window.confirm(`${t('confirmRemoveUser')} ${userName}?`)) {
      return;
    }
    
    try {
      const identifier = registration.userId || registration.phoneNumber;
      if (!identifier) {
        alert(t('admin.balanceTables.cannotDeleteNoIdentifier'));
        return;
      }
      
      await adminRemoveUserFromParty(partyId, identifier);
      
      // Clear cache for this party
      const { clearCache } = await import('../../utils/cache');
      clearCache(`balanceMatches_${partyId}`);
      clearCache('activeParties');
      
      loadActiveParties();
      showSaved();
      alert(t('userRemovedFromParty'));
    } catch (error) {
      alert(`${t('failedToRemoveUser')}: ${error.message}`);
    }
  };

  // Quick-control toggles (lock solo-men sales / auto-approve verified
  // couples) — optimistic local update + real Firestore write, no full
  // party-editor round trip.
  const handleToggleQuickControl = async (partyId, field, nextValue) => {
    setActiveParties(prev => prev.map(p => (p.id === partyId ? { ...p, [field]: nextValue } : p)));
    try {
      await updateParty(partyId, { [field]: nextValue });
      showSaved();
    } catch (error) {
      // Roll back on failure so the toggle doesn't lie about saved state.
      setActiveParties(prev => prev.map(p => (p.id === partyId ? { ...p, [field]: !nextValue } : p)));
      alert(`שגיאה בשמירת ההגדרה: ${error.message}`);
    }
  };

  // Assigned safety-team roster (real per-party field, admin-managed).
  const handleAddGuardian = async (party, name, role) => {
    if (!name.trim()) return;
    const guardians = [...(party.guardians || []), { name: name.trim(), role: (role || '').trim() }];
    setActiveParties(prev => prev.map(p => (p.id === party.id ? { ...p, guardians } : p)));
    try {
      await updateParty(party.id, { guardians });
      showSaved();
    } catch (error) {
      alert(`שגיאה בהוספת נאמן: ${error.message}`);
      loadActiveParties();
    }
  };

  const handleRemoveGuardian = async (party, index) => {
    const guardians = (party.guardians || []).filter((_, i) => i !== index);
    setActiveParties(prev => prev.map(p => (p.id === party.id ? { ...p, guardians } : p)));
    try {
      await updateParty(party.id, { guardians });
      showSaved();
    } catch (error) {
      alert(`שגיאה בהסרת נאמן: ${error.message}`);
      loadActiveParties();
    }
  };

  // Handle add new party
  const handleAddNewParty = () => {
    const newParty = {
      name: '',
      title: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      day: '',
      time: '',
      dj: '',
      imageURL: '',
      maleLimit: 100,
      femaleLimit: 100,
      registrationLink: '',
      partyType: 'internal'
    };
    setEditingParty(newParty);
    setIsAddingEvent(false);
  };

  // If adding new event, show editor
  useEffect(() => {
    if (isAddingEvent) {
      handleAddNewParty();
    }
  }, [isAddingEvent]);

  return (
    <div className="space-y-6">
      {editingParty ? (
        <PartyEditor
          party={editingParty}
          onSave={(partyData) => handleSavePartyEdit(editingParty.id, partyData)}
          onCancel={() => {
            setEditingParty(null);
            setIsAddingEvent(false);
          }}
        />
      ) : (
        <div className="space-y-6">
          {!loading && activeParties.length > 0 && (() => {
            const notExpired = activeParties.filter(p => !isPartyExpiredByDate(p.date, retentionHours));
            const totalRegs = activeParties.reduce((sum, p) => sum + (p.registrations?.length || 0), 0);
            const totalCapacity = activeParties.reduce((sum, p) => sum + (Number(p.maleLimit) || 0) + (Number(p.femaleLimit) || 0), 0);
            const avgOccupancy = totalCapacity > 0 ? Math.round((totalRegs / totalCapacity) * 100) : 0;
            const soldOut = activeParties.filter(p => {
              const cap = (Number(p.maleLimit) || 0) + (Number(p.femaleLimit) || 0);
              return cap > 0 && (p.registrations?.length || 0) >= cap;
            }).length;
            return (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-[#121218] border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
                  <p className="text-[#94A3B8] text-xs font-bold">מסיבות פעילות</p>
                  <p className="text-2xl font-bold mt-1">{notExpired.length}</p>
                </div>
                <div className="bg-[#121218] border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
                  <p className="text-[#94A3B8] text-xs font-bold">סה״כ נרשמים</p>
                  <p className="text-2xl font-bold mt-1">{totalRegs}</p>
                </div>
                <div className="bg-[#121218] border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
                  <p className="text-[#94A3B8] text-xs font-bold">תפוסה ממוצעת</p>
                  <p className="text-2xl font-bold mt-1" style={{ color: '#10B981' }}>{avgOccupancy}%</p>
                </div>
                <div className="bg-[#121218] border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
                  <p className="text-[#94A3B8] text-xs font-bold">מכסה מלאה</p>
                  <p className="text-2xl font-bold mt-1" style={{ color: soldOut > 0 ? '#ffb4ab' : undefined }}>{soldOut}</p>
                </div>
              </div>
            );
          })()}
          <div className="bg-[#121218] border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-start gap-3 text-right">
                <Clock size={20} className="text-[#a9a9b2] mt-1 shrink-0" aria-hidden="true" />
                <div>
                  <h4 className="font-bold text-base">{t('admin.partyRetention.title')}</h4>
                  <p className="text-[#a9a9b2] text-xs mt-1">{t('admin.partyRetention.description')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={retentionHours}
                  onChange={handleRetentionChange}
                  disabled={savingRetention}
                  className="bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] px-3 py-2 rounded-xl text-white outline-none focus:border-[#ff5708] disabled:opacity-50"
                  aria-label={t('admin.partyRetention.title')}
                >
                  {RETENTION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-[#94A3B8] text-xs mt-3 text-right">{t('admin.partyRetention.publishHint')}</p>
          </div>
          {retentionPublishNotice && (
            <div
              role="status"
              className="bg-amber-500/10 border border-amber-500/40 rounded-xl p-4 flex items-start gap-3 text-right"
            >
              <AlertTriangle size={20} className="text-amber-400 mt-0.5 shrink-0" aria-hidden="true" />
              <div className="flex-1">
                <p className="text-amber-200 font-bold text-sm">
                  {t('admin.partyRetention.publishNeededTitle')}
                </p>
                <p className="text-amber-200/80 text-xs mt-1">
                  {(t('admin.partyRetention.publishNeededBody') || '')
                    .replace('{count}', String(retentionPublishNotice.changed))
                    .replace('{hours}', String(retentionPublishNotice.hours))}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRetentionPublishNotice(null)}
                className="text-amber-200/80 hover:text-amber-100 text-xs underline"
              >
                {t('admin.partyRetention.publishNeededDismiss') || 'OK'}
              </button>
            </div>
          )}
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">{t('admin.activeParties')}</h3>
            <div className="flex gap-2">
              <button
                onClick={loadActiveParties}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2"
              >
                <RotateCcw size={16} /> {t('admin.refresh')}
              </button>
              <button
                onClick={() => setIsAddingEvent(true)}
                className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2"
              >
                <Plus size={18} /> {t('admin.addNewParty')}
              </button>
            </div>
          </div>
          {!loading && activeParties.length > 0 && (() => {
            const statusOf = (p) => {
              const maleFull = Number(p.maleLimit) > 0 && getGenderCount(p, 'male') >= Number(p.maleLimit);
              const femaleFull = Number(p.femaleLimit) > 0 && getGenderCount(p, 'female') >= Number(p.femaleLimit);
              if (isPartyExpiredByDate(p.date, retentionHours)) return 'expired';
              if (maleFull || femaleFull) return 'locked';
              return 'active';
            };
            const counts = { all: activeParties.length, active: 0, locked: 0, expired: 0 };
            activeParties.forEach(p => { counts[statusOf(p)] += 1; });
            const TABS = [
              { id: 'all', label: 'הכל' },
              { id: 'active', label: 'פעילים' },
              { id: 'locked', label: 'נעול לאיזון' },
              { id: 'expired', label: 'פג תוקף' },
            ];
            return (
              <div className="bg-[#121218] border border-[rgba(255,255,255,0.08)] rounded-xl p-3 flex flex-col md:flex-row gap-3 items-stretch md:items-center">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="חיפוש מסיבה, DJ, תיאור..."
                    className="w-full bg-[#1f1f23] rounded-xl px-4 py-2 text-white placeholder:text-[#94A3B8] outline-none focus:ring-1 focus:ring-[#ff5708]"
                  />
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  {TABS.map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setStatusTab(tab.id)}
                      className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors"
                      style={statusTab === tab.id
                        ? { background: '#ff5708', color: '#fff' }
                        : { background: '#1f1f23', color: '#a9a9b2' }}
                    >
                      {tab.label} ({counts[tab.id]})
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}
          {(() => {
            const q = searchQuery.trim().toLowerCase();
            const statusOf = (p) => {
              const maleFull = Number(p.maleLimit) > 0 && getGenderCount(p, 'male') >= Number(p.maleLimit);
              const femaleFull = Number(p.femaleLimit) > 0 && getGenderCount(p, 'female') >= Number(p.femaleLimit);
              if (isPartyExpiredByDate(p.date, retentionHours)) return 'expired';
              if (maleFull || femaleFull) return 'locked';
              return 'active';
            };
            const filteredParties = activeParties.filter(p => {
              const matchesTab = statusTab === 'all' || statusOf(p) === statusTab;
              const matchesQuery = !q || [p.name, p.title, p.dj, p.description].some(v => (v || '').toLowerCase().includes(q));
              return matchesTab && matchesQuery;
            });
            const selectedParty = filteredParties.find(p => p.id === selectedPartyId) || filteredParties[0] || null;

            if (loading) return <AdminLoader />;
            if (filteredParties.length === 0) {
              return (
                <div className="text-center py-12 text-[#94A3B8]">
                  <p>{activeParties.length === 0 ? t('admin.noActiveParties') : 'לא נמצאו מסיבות התואמות לסינון'}</p>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-4 items-start">
                {/* Compact clickable list — one row per party. */}
                <div className="space-y-2">
                  {filteredParties.map(party => {
                    const status = statusOf(party);
                    const maleCount = getGenderCount(party, 'male');
                    const femaleCount = getGenderCount(party, 'female');
                    const maleLimit = Number(party.maleLimit) || 0;
                    const femaleLimit = Number(party.femaleLimit) || 0;
                    const totalLimit = maleLimit + femaleLimit || 1;
                    const malePct = Math.min(100, Math.round((maleCount / totalLimit) * 100));
                    const femalePct = Math.min(100 - malePct, Math.round((femaleCount / totalLimit) * 100));
                    const selected = selectedParty?.id === party.id;
                    return (
                      <button
                        type="button"
                        key={party.id}
                        onClick={() => setSelectedPartyId(party.id)}
                        className="w-full text-right rounded-xl p-3 border transition-colors flex items-center gap-3"
                        style={selected
                          ? { background: '#1f1f23', borderColor: '#ff5708' }
                          : { background: '#121218', borderColor: 'rgba(255,255,255,0.08)' }}
                      >
                        {party.imageURL ? (
                          <img
                            src={party.imageURL}
                            alt=""
                            className="w-12 h-12 rounded-lg object-cover shrink-0 bg-black"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg shrink-0 bg-[#2a292e]" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-sm truncate">{party.name || party.title}</h4>
                            {status === 'locked' && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#ff5708]/20 text-[#ffb3b6]">נעול לאיזון</span>
                            )}
                            {status === 'expired' && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#2a292e] text-[#94A3B8]">פג תוקף</span>
                            )}
                          </div>
                          <p className="text-xs text-[#94A3B8] truncate mt-0.5">
                            {formatDate(party.date)}{party.dj ? ` · DJ ${party.dj}` : ''}
                          </p>
                          {!party.whatsappNumber && ['internal', 'exchange'].includes(party.partyType || 'internal') && (
                            <div className="w-full h-1.5 rounded-full bg-[#2a292e] overflow-hidden flex mt-2">
                              <div className="h-full" style={{ width: `${malePct}%`, background: '#ff5708' }} />
                              <div className="h-full" style={{ width: `${femalePct}%`, background: '#ffb3b6' }} />
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-[#94A3B8] shrink-0">{party.registrations?.length || 0}/{totalLimit}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Detail + quick-control panel for the selected party — sticky
                    alongside the list on desktop, falls below it on mobile. */}
                {selectedParty && (
                  <div className="lg:sticky lg:top-4 bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] p-3 md:p-4 rounded-xl">
                    <div className="flex flex-col gap-3 mb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg md:text-xl font-bold">{selectedParty.name || selectedParty.title}</h3>
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          selectedParty.partyType === 'exchange' ? 'bg-purple-600'
                            : selectedParty.partyType === 'external' ? 'bg-blue-600'
                            : 'bg-[#ff5708]'
                        }`}>
                          {selectedParty.partyType === 'exchange' ? t('admin.exchangeParty')
                            : selectedParty.partyType === 'external' ? t('admin.externalParty')
                            : t('admin.internalParty')}
                        </span>
                        {selectedParty.createdByType === 'advertiser' && (
                          <span className="px-2 py-1 rounded text-xs font-bold bg-indigo-600">
                            פורסם ע"י מפרסם
                          </span>
                        )}
                        {isPartyExpiredByDate(selectedParty.date, retentionHours) && (
                          <span className="px-2 py-1 rounded text-xs font-bold bg-[#2a292e] text-[#e4e1e7]">
                            פג תוקף
                          </span>
                        )}
                        {selectedParty.publishToInstagram === true && (
                          <span className="px-2 py-1 rounded text-xs font-bold bg-gradient-to-tr from-yellow-500 via-pink-600 to-purple-600 text-white">
                            כלול באינסטגרם
                          </span>
                        )}
                      </div>
                      {selectedParty.imageURL && (
                        <PartyImage
                          src={selectedParty.imageURL}
                          alt={selectedParty.name || selectedParty.title}
                          onClick={() => window.open(selectedParty.imageURL, '_blank')}
                        />
                      )}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditParty(selectedParty)}
                          className="bg-[#ff5708] hover:bg-[#ff7a29] text-white px-3 md:px-4 py-1.5 md:py-2 rounded-xl font-bold text-xs md:text-sm flex-1"
                        >
                          {t('admin.edit')}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteParty(selectedParty.id, selectedParty.name || selectedParty.title)}
                          className="bg-[#93000a]/60 hover:bg-[#93000a] text-white px-3 md:px-4 py-1.5 md:py-2 rounded-xl font-bold text-xs md:text-sm flex items-center gap-2 justify-center"
                          aria-label={`${t('a11y.delete')}: ${selectedParty.name || selectedParty.title || ''}`}
                        >
                          <Trash2 size={14} className="md:w-4 md:h-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
                      <p><strong>{t('date') || 'תאריך'}:</strong> {formatDate(selectedParty.date)}</p>
                      {selectedParty.day && <p><strong>{t('admin.day')}:</strong> {selectedParty.day}</p>}
                      {selectedParty.time && <p><strong>{t('admin.time')}:</strong> {selectedParty.time}</p>}
                      {selectedParty.dj && <p><strong>DJ:</strong> {selectedParty.dj}</p>}
                    </div>
                    {selectedParty.description && <p className="mb-3"><strong>{t('description') || 'תיאור'}:</strong> {selectedParty.description}</p>}
                    {!selectedParty.whatsappNumber && ['internal', 'exchange'].includes(selectedParty.partyType || 'internal') && (() => {
                      const maleCount = getGenderCount(selectedParty, 'male');
                      const femaleCount = getGenderCount(selectedParty, 'female');
                      const maleLimit = Number(selectedParty.maleLimit) || 0;
                      const femaleLimit = Number(selectedParty.femaleLimit) || 0;
                      const totalLimit = maleLimit + femaleLimit || 1;
                      const malePct = Math.min(100, Math.round((maleCount / totalLimit) * 100));
                      const femalePct = Math.min(100 - malePct, Math.round((femaleCount / totalLimit) * 100));
                      const maleFull = maleLimit > 0 && maleCount >= maleLimit;
                      const femaleFull = femaleLimit > 0 && femaleCount >= femaleLimit;
                      return (
                        <div className="mb-3">
                          <div className="w-full h-2.5 rounded-full bg-[#2a292e] overflow-hidden flex">
                            <div className="h-full" style={{ width: `${malePct}%`, background: '#ff5708' }} title={`גברים: ${maleCount}/${maleLimit}`} />
                            <div className="h-full" style={{ width: `${femalePct}%`, background: '#ffb3b6' }} title={`נשים: ${femaleCount}/${femaleLimit}`} />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-4 mt-2 text-sm md:text-base">
                            <p><strong>{t('maleRegistered') || 'גברים רשומים'}:</strong> <span style={maleFull ? { color: '#ffb4ab' } : undefined}>{maleCount}/{maleLimit}{maleFull ? ' (מלא)' : ''}</span></p>
                            <p><strong>{t('femaleRegistered') || 'נשים רשומות'}:</strong> <span style={femaleFull ? { color: '#ffb4ab' } : undefined}>{femaleCount}/{femaleLimit}{femaleFull ? ' (מלא)' : ''}</span></p>
                            <p><strong>{t('totalRegistered') || 'סה"כ רשומים'}:</strong> {selectedParty.registrations?.length || 0}</p>
                          </div>
                        </div>
                      );
                    })()}
                    {!selectedParty.whatsappNumber && ['internal', 'exchange'].includes(selectedParty.partyType || 'internal') && (
                      <div className="mb-3 rounded-xl bg-[#121218] p-3 flex flex-col gap-3">
                        <span className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">שליטה מהירה</span>
                        <label className="flex items-center justify-between gap-2 cursor-pointer">
                          <span className="text-sm">נעילת מכירה לגברים סולו</span>
                          <input
                            type="checkbox"
                            checked={!!selectedParty.soloMenSalesLocked}
                            onChange={(e) => handleToggleQuickControl(selectedParty.id, 'soloMenSalesLocked', e.target.checked)}
                            className="w-5 h-5 accent-[#ff5708] cursor-pointer"
                          />
                        </label>
                        <label className="flex items-center justify-between gap-2 cursor-pointer">
                          <span className="text-sm">אישור אוטומטי לזוגות מאומתים</span>
                          <input
                            type="checkbox"
                            checked={!!selectedParty.autoApproveVerifiedCouples}
                            onChange={(e) => handleToggleQuickControl(selectedParty.id, 'autoApproveVerifiedCouples', e.target.checked)}
                            className="w-5 h-5 accent-[#10B981] cursor-pointer"
                          />
                        </label>
                        <div className="pt-2 border-t border-[rgba(255,255,255,0.08)]">
                          <span className="text-xs font-bold text-[#94A3B8]">נאמני מרחב משובצים ({(selectedParty.guardians || []).length})</span>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {(selectedParty.guardians || []).map((g, i) => (
                              <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#2a292e] text-sm">
                                {g.name}{g.role ? ` · ${g.role}` : ''}
                                <button type="button" onClick={() => handleRemoveGuardian(selectedParty, i)} className="text-[#94A3B8] hover:text-[#ffb4ab]" aria-label={`הסר ${g.name}`}>
                                  <X size={12} />
                                </button>
                              </span>
                            ))}
                          </div>
                          <GuardianAddForm onAdd={(name, role) => handleAddGuardian(selectedParty, name, role)} />
                        </div>
                      </div>
                    )}
                    {selectedParty.registrationLink && (selectedParty.partyType || 'internal') === 'external' && (
                      <p className="mb-3">
                        <strong>{t('admin.externalRegistrationLink')}:</strong>{' '}
                        <a href={selectedParty.registrationLink} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                          {selectedParty.registrationLink}
                        </a>
                      </p>
                    )}
                    {selectedParty.whatsappNumber && (
                      <p className="mb-3">
                        <strong>{t('admin.whatsappNumber') || 'מספר וואטסאפ'}:</strong>{' '}
                        <span dir="ltr">{selectedParty.whatsappNumber}</span>
                      </p>
                    )}
                    {!selectedParty.whatsappNumber && selectedParty.registrations && selectedParty.registrations.length > 0 && ['internal', 'exchange'].includes(selectedParty.partyType || 'internal') && (
                      <div className="mt-4 space-y-4">
                        <button
                          onClick={() => exportRegistrationsByType(selectedParty)}
                          className="bg-blue-600 hover:bg-blue-500 text-white px-3 md:px-4 py-1.5 md:py-2 rounded-xl font-bold text-xs md:text-sm mr-2"
                        >
                          📊 {t('admin.exportRegistrations')}
                        </button>
                        <div className="mt-4 border-t border-[rgba(255,255,255,0.08)] pt-4">
                          <h4 className="text-lg font-bold mb-3">{t('admin.registrationsList')}</h4>
                          <div className="space-y-2 max-h-96 overflow-y-auto">
                            {getRegistrationDisplayItems(selectedParty.registrations).map((item, idx) =>
                              item.type === 'couple' ? (
                                <CoupleRegistrationItem
                                  key={`couple-${item.maleReg?.coupleId || idx}`}
                                  maleReg={item.maleReg}
                                  femaleReg={item.femaleReg}
                                  partyId={selectedParty.id}
                                  onConvertToUser={handleConvertClientToUser}
                                  onRemoveFromParty={handleRemoveFromParty}
                                  allUsersMap={allUsersMap}
                                />
                              ) : (
                                <RegistrationItem
                                  key={`single-${item.registration?.phoneNumber || idx}`}
                                  registration={item.registration}
                                  partyId={selectedParty.id}
                                  onConvertToUser={handleConvertClientToUser}
                                  onRemoveFromParty={handleRemoveFromParty}
                                  userFromMap={item.registration?.phoneNumber ? allUsersMap.get(item.registration.phoneNumber) : null}
                                />
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

/** Small inline "add guardian" form used inside each party card's quick-control panel. */
const GuardianAddForm = ({ onAdd }) => {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd(name, role);
    setName('');
    setRole('');
  };
  return (
    <form onSubmit={submit} className="flex flex-wrap gap-2 mt-2">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="שם הנאמן/ה"
        className="flex-1 min-w-[120px] bg-[#121218] rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-[#ff5708]"
      />
      <input
        type="text"
        value={role}
        onChange={(e) => setRole(e.target.value)}
        placeholder="תפקיד (לא חובה)"
        className="flex-1 min-w-[100px] bg-[#121218] rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-[#ff5708]"
      />
      <button type="submit" className="px-3 py-1.5 rounded-lg bg-[#ff5708] hover:bg-[#ff7a29] text-white text-sm font-bold">
        הוספה
      </button>
    </form>
  );
};

export default PartiesSection;

