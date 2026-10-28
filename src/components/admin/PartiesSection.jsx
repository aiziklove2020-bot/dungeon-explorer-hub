import { useState, useEffect } from 'react';
import { RotateCcw, Plus, Trash2, Clock, AlertTriangle, X } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import AdminLoader from './AdminLoader';
import { getAllParties, createParty, updateParty, deleteParty, recomputeAllPartiesExpiration } from '../../firebase/parties';
import { getPartySettings, updatePartySettings } from '../../firebase/partySettings';
import { DEFAULT_PARTY_RETENTION_HOURS, isPartyExpiredByDate } from '../../../shared/partyExpiry.js';
import { todayLocalStr } from '../../utils/dateFormat';
import PartyEditor from './PartyEditor';
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
      date: todayLocalStr(),
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
            return (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-[#20151e] border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
                  <p className="text-[#94A3B8] text-xs font-bold">מסיבות פעילות</p>
                  <p className="text-2xl font-bold mt-1">{notExpired.length}</p>
                </div>
              </div>
            );
          })()}
          <div className="bg-[#20151e] border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-start gap-3 text-right">
                <Clock size={20} className="text-[#c0aebb] mt-1 shrink-0" aria-hidden="true" />
                <div>
                  <h4 className="font-bold text-base">{t('admin.partyRetention.title')}</h4>
                  <p className="text-[#c0aebb] text-xs mt-1">{t('admin.partyRetention.description')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={retentionHours}
                  onChange={handleRetentionChange}
                  disabled={savingRetention}
                  className="bg-[#2a1a24] border border-[rgba(255,255,255,0.08)] px-3 py-2 rounded-xl text-white outline-none focus:border-[#ff438b] disabled:opacity-50"
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
            const statusOf = (p) => (isPartyExpiredByDate(p.date, retentionHours) ? 'expired' : 'active');
            const counts = { all: activeParties.length, active: 0, expired: 0 };
            activeParties.forEach(p => { counts[statusOf(p)] += 1; });
            const TABS = [
              { id: 'all', label: 'הכל' },
              { id: 'active', label: 'פעילים' },
              { id: 'expired', label: 'פג תוקף' },
            ];
            return (
              <div className="bg-[#20151e] border border-[rgba(255,255,255,0.08)] rounded-xl p-3 flex flex-col md:flex-row gap-3 items-stretch md:items-center">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="חיפוש מסיבה, DJ, תיאור..."
                    className="w-full bg-[#2a1a24] rounded-xl px-4 py-2 text-white placeholder:text-[#94A3B8] outline-none focus:ring-1 focus:ring-[#ff438b]"
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
                        ? { background: '#ff438b', color: '#fff' }
                        : { background: '#2a1a24', color: '#c0aebb' }}
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
            const statusOf = (p) => (isPartyExpiredByDate(p.date, retentionHours) ? 'expired' : 'active');
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
                    const selected = selectedParty?.id === party.id;
                    return (
                      <button
                        type="button"
                        key={party.id}
                        onClick={() => setSelectedPartyId(party.id)}
                        className="w-full text-right rounded-xl p-3 border transition-colors flex items-center gap-3"
                        style={selected
                          ? { background: '#2a1a24', borderColor: '#ff438b' }
                          : { background: '#20151e', borderColor: 'rgba(255,255,255,0.08)' }}
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
                            {status === 'expired' && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#2a292e] text-[#94A3B8]">פג תוקף</span>
                            )}
                          </div>
                          <p className="text-xs text-[#94A3B8] truncate mt-0.5">
                            {formatDate(party.date)}{party.dj ? ` · DJ ${party.dj}` : ''}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Detail + quick-control panel for the selected party — sticky
                    alongside the list on desktop, falls below it on mobile. */}
                {selectedParty && (
                  <div className="lg:sticky lg:top-4 bg-[#2a1a24] border border-[rgba(255,255,255,0.08)] p-3 md:p-4 rounded-xl">
                    <div className="flex flex-col gap-3 mb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg md:text-xl font-bold">{selectedParty.name || selectedParty.title}</h3>
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          selectedParty.partyType === 'exchange' ? 'bg-purple-600'
                            : selectedParty.partyType === 'external' ? 'bg-blue-600'
                            : 'bg-[#ff438b]'
                        }`}>
                          {selectedParty.partyType === 'exchange' ? t('admin.exchangeParty')
                            : selectedParty.partyType === 'external' ? t('admin.externalParty')
                            : t('admin.internalParty')}
                        </span>
                        {isPartyExpiredByDate(selectedParty.date, retentionHours) && (
                          <span className="px-2 py-1 rounded text-xs font-bold bg-[#2a292e] text-[#e4e1e7]">
                            פג תוקף
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
                          className="bg-[#ff438b] hover:bg-[#ff5596] text-white px-3 md:px-4 py-1.5 md:py-2 rounded-xl font-bold text-xs md:text-sm flex-1"
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
                    <div className="mb-3 rounded-xl bg-[#20151e] p-3 flex flex-col gap-3">
                        <div>
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
        className="flex-1 min-w-[120px] bg-[#20151e] rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-[#ff438b]"
      />
      <input
        type="text"
        value={role}
        onChange={(e) => setRole(e.target.value)}
        placeholder="תפקיד (לא חובה)"
        className="flex-1 min-w-[100px] bg-[#20151e] rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-[#ff438b]"
      />
      <button type="submit" className="px-3 py-1.5 rounded-lg bg-[#ff438b] hover:bg-[#ff5596] text-white text-sm font-bold">
        הוספה
      </button>
    </form>
  );
};

export default PartiesSection;

