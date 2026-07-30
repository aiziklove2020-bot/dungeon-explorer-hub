import { useState, useEffect, useCallback, useMemo } from 'react';
import { RotateCcw, Download, Users, Send } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useContent } from '../../context/ContentContext';
import AdminLoader from './AdminLoader';
import { getActiveParties, getPartyById, adminRemoveUserFromParty, unmatchBalance, saveBalanceMatches, getBalanceMatches, convertCoupleToSingles } from '../../firebase/parties';
import { createUserFromRegistration } from '../../firebase/users';
import { sendBalancePublishToChannels, genderFromRegistration, sendBalanceMatchNotification, sendCoupleRegistrationConfirmation } from '../../firebase/telegram';
import { createBalanceForParty } from '../../utils/balanceMatching';
import { adminAuthHeader } from '../../utils/adminApi';
// xlsx (~600 KB gzipped) is dynamically imported on first export click; see
// `loadXLSX()` below. Keeps the admin route bundle small for users who never
// export.
const loadXLSX = () => import('xlsx');
import RegistrationItem from './RegistrationItem';
import BalanceTables from './BalanceTables';
import Loader from '../Loader';

const MatchesSection = ({ showSaved }) => {
  const { t } = useLanguage();
  const { 
    getMatchingTable, 
    exportMatches, 
    getRegistrations, 
    clearRegistrations,
    refreshRegistrations 
  } = useContent();
  const [matches, setMatches] = useState([]);
  const [activeParties, setActiveParties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [partyBalances, setPartyBalances] = useState({}); 
  const [creatingBalance, setCreatingBalance] = useState(null); 
  const [registeringClient, setRegisteringClient] = useState(null);
  const [allUsersMap, setAllUsersMap] = useState(new Map()); // Map of phoneNumber -> user
  const [publishingToTelegramPartyId, setPublishingToTelegramPartyId] = useState(null);
  const [approvingMatchKey, setApprovingMatchKey] = useState(null);

  const handlePublishPartyToTelegram = async (party) => {
    if (publishingToTelegramPartyId) return;
    try {
      setPublishingToTelegramPartyId(party.id);
      const freshParty = await getPartyById(party.id);
      const partyBalance = partyBalances[party.id] || [];
      const partiesWithBalance = [{ party: freshParty || party, partyBalance }];
      const { sent, failed } = await sendBalancePublishToChannels(partiesWithBalance, '');
      if (sent > 0) showSaved();
      if (sent === 0 && failed === 0) {
        alert(t('admin.matches.telegramNotConfigured') || 'יש להגדיר בוט וערוצים בלשונית טלגרם.');
        return;
      }
      if (failed > 0) {
        alert(`${t('admin.matches.telegramPublishPartial') || 'נשלח חלקית'}: ${sent} ${t('admin.matches.sent') || 'נשלחו'}, ${failed} ${t('admin.matches.failed') || 'נכשלו'}`);
      } else if (sent > 0) {
        alert(`${t('admin.matches.telegramPublishSuccess') || 'פורסם לטלגרם'}: ${sent} ${t('admin.matches.messages') || 'הודעות'}`);
      }
    } catch (err) {
      alert((t('admin.matches.telegramPublishError') || 'שגיאה בפרסום לטלגרם') + ': ' + (err.message || err));
    } finally {
      setPublishingToTelegramPartyId(null);
    }
  };

  const handleUnmatch = async (partyId, match) => {
    try {
      const filterMatch = (arr) => arr.filter(m => {
        if (match.coupleId && m.coupleId) {
          return m.coupleId !== match.coupleId;
        }
        return !(m.malePhone === match.malePhone && m.femalePhone === match.femalePhone);
      });

      const updatedBalance = filterMatch(partyBalances[partyId] || []);

      // Manual matches: only in balanceMatches, no balancedWith on registrations - just save
      if (match.matchType === 'manual') {
        await saveBalanceMatches(partyId, updatedBalance);
      } else if (match.isCouple && match.coupleId) {
        // Couple: convert both to singles and remove from balance
        await convertCoupleToSingles(partyId, match.coupleId);
      } else if (match.malePhone && match.femalePhone) {
        // Algorithm match: remove balancedWith from registrations
        await unmatchBalance(partyId, match.malePhone, match.femalePhone);
        await saveBalanceMatches(partyId, updatedBalance);
      } else {
        await saveBalanceMatches(partyId, updatedBalance);
      }

      setPartyBalances(prev => ({
        ...prev,
        [partyId]: updatedBalance
      }));

      await loadActiveParties();
      showSaved();
    } catch (error) {
      alert(`${t('admin.balanceTables.errorUnmatching')}: ${error.message}`);
    }
  };

  const handleDeleteClient = async (partyId, client) => {
    try {
      const identifier = client.userId || client.phoneNumber;
      if (!identifier) {
        alert(t('admin.balanceTables.cannotDeleteNoIdentifier'));
        return;
      }
      
      await adminRemoveUserFromParty(partyId, identifier);
      await loadActiveParties();
      showSaved();
    } catch (error) {
      alert(`${t('admin.balanceTables.errorDeletingClient')}: ${error.message}`);
    }
  };

  const handleManualMatch = async (partyId, man, woman) => {
    try {
      const newMatch = {
        isMatched: true,
        isCouple: false,
        maleName: man.fullName || man.userName || '',
        malePhone: man.phoneNumber || '',
        maleTelegram: man.telegramUsername || '',
        femaleName: woman.fullName || woman.userName || '',
        femalePhone: woman.phoneNumber || '',
        femaleTelegram: woman.telegramUsername || '',
        femalePickupAddress: woman.pickupAddress || '',
        matchedAt: new Date().toISOString(),
        matchType: 'manual',
        entered: false
      };

      const currentBalance = partyBalances[partyId] || [];

      const updatedBalance = [...currentBalance, newMatch];

      await saveBalanceMatches(partyId, updatedBalance);

      setPartyBalances(prev => ({
        ...prev,
        [partyId]: updatedBalance
      }));
      
      showSaved();
    } catch (error) {
      alert(`${t('admin.balanceTables.errorCreatingBalance')}: ${error.message}`);
    }
  };

  const handleSwapPartner = async (partyId, oldMatch, newMan, newWoman) => {
    try {
      
      const newMatch = {
        isMatched: true,
        isCouple: false,
        maleName: newMan.fullName || newMan.userName || '',
        malePhone: newMan.phoneNumber || '',
        maleTelegram: newMan.telegramUsername || '',
        femaleName: newWoman.fullName || newWoman.userName || '',
        femalePhone: newWoman.phoneNumber || '',
        femaleTelegram: newWoman.telegramUsername || '',
        femalePickupAddress: newWoman.pickupAddress || '',
        matchedAt: new Date().toISOString(),
        matchType: 'manual',
        entered: oldMatch.entered || false
      };

      const currentBalance = partyBalances[partyId] || [];

      const updatedBalance = currentBalance.filter(m => 
        !(m.malePhone === oldMatch.malePhone && m.femalePhone === oldMatch.femalePhone)
      );
      updatedBalance.push(newMatch);

      await saveBalanceMatches(partyId, updatedBalance);

      setPartyBalances(prev => ({
        ...prev,
        [partyId]: updatedBalance
      }));
      
      showSaved();
    } catch (error) {
      alert(`${t('admin.balanceTables.errorCreatingBalance')}: ${error.message}`);
    }
  };

  const handleToggleEntered = async (partyId, match) => {
    try {
      
      const currentBalance = partyBalances[partyId] || [];

      const matchExists = currentBalance.some(m => 
        (m.malePhone === match.malePhone && m.femalePhone === match.femalePhone) ||
        (match.coupleId && m.coupleId === match.coupleId)
      );
      
      let updatedBalance;
      
      if (matchExists) {
        
        updatedBalance = currentBalance.map(m => {
          if ((m.malePhone === match.malePhone && m.femalePhone === match.femalePhone) ||
              (match.coupleId && m.coupleId === match.coupleId)) {
            return { ...m, entered: !m.entered };
          }
          return m;
        });
      } else {

        const newMatch = {
          ...match,
          entered: !match.entered
        };
        updatedBalance = [...currentBalance, newMatch];
      }

      await saveBalanceMatches(partyId, updatedBalance);

      setPartyBalances(prev => ({
        ...prev,
        [partyId]: updatedBalance
      }));
      
      showSaved();
    } catch (error) {
      alert(`${t('admin.balanceTables.errorCreatingBalance')}: ${error.message}`);
    }
  };

  const refreshMatches = () => {
    setMatches(getMatchingTable());
  };

  const loadActiveParties = useCallback(async () => {
    try {
      setLoading(true);
      // Parties are already loaded in ContentContext on app init, so this will use cache
      const parties = await getActiveParties();
      const filteredParties = parties.filter(party => ['internal', 'exchange'].includes(party.partyType || 'internal'));
      setActiveParties(filteredParties);

      // Load all users once to avoid multiple getUserByPhone calls in BalanceTables
      const { getAllUsers } = await import('../../firebase/users');
      const allUsers = await getAllUsers();
      const usersMap = new Map();
      allUsers.forEach(user => {
        if (user.phoneNumber) {
          usersMap.set(user.phoneNumber, user);
        }
      });
      setAllUsersMap(usersMap);

      // Don't load balance matches on mount - lazy load when party is viewed/expanded
      // This prevents unnecessary reads for parties admin doesn't view
      // Balance matches will be loaded on-demand when needed
      setPartyBalances({});
    } catch (error) {
    } finally {
      setLoading(false);
    }
  }, []); // Empty deps - function doesn't depend on any props/state

  useEffect(() => {
    refreshMatches();
    loadActiveParties();
    // Refresh registrations when component mounts (entering matches section)
    refreshRegistrations();
  }, []);

  const formatDate = (date, timeOverride) => {
    const d = date instanceof Date ? date : (date?.toDate ? date.toDate() : new Date(date));
    const dateStr = d.toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    if (timeOverride && String(timeOverride).trim()) return `${dateStr} ${t('admin.atTime') || 'בשעה'} ${timeOverride}`;
    return dateStr;
  };

  const getGenderCount = (party, gender) => {
    return party.registrations?.filter(reg => genderFromRegistration(reg) === gender).length || 0;
  };

  const handleConvertClientToUser = async (registration) => {
    try {
      setRegisteringClient(registration.phoneNumber);
      await createUserFromRegistration(registration, 'registered');
      loadActiveParties();
      showSaved();
    } catch (error) {
      alert(`${t('admin.errorConvertingClientToUser')}: ${error.message}`);
    } finally {
      setRegisteringClient(null);
    }
  };

  const handleCreateBalance = async (party) => {
    try {
      setCreatingBalance(party.id);
      
      if (!party.registrations || party.registrations.length === 0) {
        alert(t('admin.balanceTables.noRegistrationsForParty'));
        setCreatingBalance(null);
        return;
      }

      const registeredUsers = party.registrations.filter(reg => 
        reg.userId && reg.userId !== null && reg.userId !== ''
      );
      const clients = party.registrations.filter(reg => 
        !reg.userId || reg.userId === null || reg.userId === ''
      );

      if (registeredUsers.length === 0) {
        alert(t('admin.balanceTables.noRegisteredUsersInParty') + '. ' + t('admin.balanceTables.balanceOnlyForRegistered'));
        setCreatingBalance(null);
        return;
      }

      if (clients.length > 0) {
      }

      const existingBalance = partyBalances[party.id] || [];

      const matchedPhones = new Set();
      existingBalance.forEach(match => {
        if (match.isMatched) {
          if (match.malePhone) matchedPhones.add(match.malePhone);
          if (match.femalePhone) matchedPhones.add(match.femalePhone);
        }
      });

      const unmatchedRegistrations = party.registrations.filter(reg => 
        !matchedPhones.has(reg.phoneNumber)
      );

      if (unmatchedRegistrations.length === 0) {
        alert(t('admin.balanceTables.allUsersAlreadyMatched') || 'כל המשתמשים כבר מאוזנים');
        setCreatingBalance(null);
        return;
      }

      // Load all users once to avoid multiple getUserByPhone calls
      const { getAllUsers } = await import('../../firebase/users');
      const allUsers = await getAllUsers();
      const usersByPhone = new Map();
      allUsers.forEach(user => {
        if (user.phoneNumber) {
          usersByPhone.set(user.phoneNumber, user);
        }
      });

      const newBalanceMatches = await createBalanceForParty(unmatchedRegistrations.map(reg => ({
        ...reg,
        partyId: party.id,
        partyName: party.name || party.title
      })), usersByPhone);

      const existingMatchedPairs = existingBalance.filter(m => m.isMatched);
      const newMatchedPairs = newBalanceMatches.filter(m => m.isMatched);
      const newUnmatchedPairs = newBalanceMatches.filter(m => !m.isMatched);

      const mergedBalance = [...existingMatchedPairs, ...newMatchedPairs, ...newUnmatchedPairs];

      // Pairing is created immediately, but nobody's details are sent yet —
      // that requires an explicit per-pair approval (see handleApproveMatch)
      // so a stranger who just registered can't automatically receive a
      // real person's phone/Telegram without the admin reviewing the pair
      // first.
      await saveBalanceMatches(party.id, mergedBalance);

      setPartyBalances(prev => ({
        ...prev,
        [party.id]: mergedBalance
      }));

      showSaved();
    } catch (error) {
      alert(`${t('admin.balanceTables.errorCreatingBalance')}: ${error.message}`);
    } finally {
      setCreatingBalance(null);
    }
  };

  // Sends each side's Telegram DM for ONE specific pair, on explicit admin
  // approval — pairing (handleCreateBalance) no longer sends anything on
  // its own. A stranger who just registered shouldn't automatically get a
  // real person's phone/Telegram the moment the admin bulk-runs "צור
  // איזון"; the admin has to look at the specific pair and approve it.
  const handleApproveMatch = async (party, pair) => {
    const matchKey = `${party.id}:${pair.male.phoneNumber}:${pair.female.phoneNumber}`;
    try {
      setApprovingMatchKey(matchKey);
      const authHeaders = adminAuthHeader();
      const partyForNotification = { ...party, name: party.name || party.title || 'מסיבה' };
      const isCouple = !!pair.match?.isCouple;
      const maleTelegram = pair.male.telegramUsername;
      const femaleTelegram = pair.female.telegramUsername;

      if (isCouple) {
        if (maleTelegram) await sendCoupleRegistrationConfirmation(maleTelegram, null, authHeaders).catch(() => {});
        if (femaleTelegram) await sendCoupleRegistrationConfirmation(femaleTelegram, null, authHeaders).catch(() => {});
      } else {
        if (maleTelegram) {
          await sendBalanceMatchNotification(
            maleTelegram,
            { fullName: pair.female.fullName || pair.female.userName, phoneNumber: pair.female.phoneNumber, telegramUsername: femaleTelegram, registrationType: 'single-female-balance' },
            partyForNotification,
            null,
            'he',
            authHeaders
          ).catch(() => {});
        }
        if (femaleTelegram) {
          await sendBalanceMatchNotification(
            femaleTelegram,
            { fullName: pair.male.fullName || pair.male.userName, phoneNumber: pair.male.phoneNumber, telegramUsername: maleTelegram, registrationType: 'single-male-balance' },
            partyForNotification,
            null,
            'he',
            authHeaders
          ).catch(() => {});
        }
      }

      const existing = partyBalances[party.id] || [];
      let found = false;
      const updated = existing.map((m) => {
        const sameCouple = pair.match?.coupleId && m.coupleId === pair.match.coupleId;
        const samePhones = m.malePhone === pair.male.phoneNumber && m.femalePhone === pair.female.phoneNumber;
        if (sameCouple || samePhones) {
          found = true;
          return { ...m, notified: true, notifiedAt: new Date().toISOString() };
        }
        return m;
      });
      if (!found) {
        updated.push({
          isMatched: true,
          isCouple,
          coupleId: pair.match?.coupleId,
          maleName: pair.male.fullName || pair.male.userName || '',
          femaleName: pair.female.fullName || pair.female.userName || '',
          malePhone: pair.male.phoneNumber || '',
          femalePhone: pair.female.phoneNumber || '',
          maleTelegram: maleTelegram || '',
          femaleTelegram: femaleTelegram || '',
          notified: true,
          notifiedAt: new Date().toISOString(),
        });
      }

      await saveBalanceMatches(party.id, updated);
      setPartyBalances(prev => ({ ...prev, [party.id]: updated }));
      showSaved();
    } catch (error) {
      alert(`שגיאה באישור ההתאמה: ${error.message}`);
    } finally {
      setApprovingMatchKey(null);
    }
  };

  const exportBalanceToXLSX = async (partyId, partyName) => {
    const balance = partyBalances[partyId];
    if (!balance || balance.length === 0) {
      alert(t('admin.balanceTables.noBalanceForParty') + '. ' + t('admin.balanceTables.pleaseCreateBalanceFirst'));
      return;
    }

    const matchedBalances = balance.filter(match => match.isMatched === true);

    if (matchedBalances.length === 0) {
      alert(t('admin.balanceTables.noMatchedCouplesToExport'));
      return;
    }

    const data = matchedBalances.map((match) => ({
      'שם גבר': match.maleName || '',
      'טלפון גבר': match.malePhone || '',
      'טלגרם גבר': match.maleTelegram || '',
      'שם אישה': match.femaleName || '',
      'טלפון אישה': match.femalePhone || '',
      'טלגרם אישה': match.femaleTelegram || '',
      'כתובת איסוף': match.femalePickupAddress || '',
      'סוג התאמה': match.isCouple ? 'זוג' : 'איזון'
    }));

    const XLSX = await loadXLSX();
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'איזון');

    const partyNameSafe = (partyName || 'מסיבה').replace(/[^a-z0-9]/gi, '_');
    const filename = `איזון_${partyNameSafe}_${new Date().toISOString().split('T')[0]}.xlsx`;

    XLSX.writeFile(wb, filename);
    showSaved();
  };

  const exportAllBalancesToXLSX = async () => {
    const allBalances = Object.entries(partyBalances);
    if (allBalances.length === 0) {
      alert(t('admin.balanceTables.noBalancesToExport') + '. ' + t('admin.balanceTables.pleaseCreateBalancesFirst'));
      return;
    }

    const XLSX = await loadXLSX();
    const wb = XLSX.utils.book_new();

    allBalances.forEach(([partyId, balance]) => {
      const party = activeParties.find(p => p.id === partyId);
      const partyName = party ? (party.name || party.title || 'מסיבה') : 'מסיבה';

      const matchedBalances = balance.filter(match => match.isMatched === true);

      if (matchedBalances.length === 0) {
        return;
      }

      const data = matchedBalances.map((match, index) => ({
        'מספר': index + 1,
        'שם גבר': match.maleName || '',
        'טלפון גבר': match.malePhone || '',
        'טלגרם גבר': match.maleTelegram || '',
        'שם אישה': match.femaleName || '',
        'טלפון אישה': match.femalePhone || '',
        'טלגרם אישה': match.femaleTelegram || '',
        'כתובת איסוף': match.femalePickupAddress || ''
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const sheetName = partyName.length > 31 ? partyName.substring(0, 31) : partyName;
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    const filename = `איזונים_כל_המסיבות_${new Date().toISOString().split('T')[0]}.xlsx`;

    XLSX.writeFile(wb, filename);
    showSaved();
  };

  return (
    <div className="bg-zinc-900/50 backdrop-blur-2xl border border-white/5 p-6 rounded-2xl space-y-6">
      
      <div>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
          <h3 className="text-xl font-bold shrink-0">{t('registrationsByParty') || 'רישומים לפי מסיבה'}</h3>
          <div className="flex flex-wrap gap-2 min-w-0">
            <button
              onClick={loadActiveParties}
              className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl font-bold flex items-center gap-1.5 sm:gap-2 text-xs sm:text-base shrink-0"
            >
              <RotateCcw size={14} className="sm:w-4 sm:h-4 shrink-0" /> <span className="whitespace-nowrap">{t('admin.refresh')}</span>
            </button>
            {Object.keys(partyBalances).length > 0 && (
              <button
                onClick={exportAllBalancesToXLSX}
                className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl font-bold flex items-center gap-1.5 sm:gap-2 text-xs sm:text-base shrink-0"
              >
                <Download size={14} className="sm:w-4 sm:h-4 shrink-0" /> <span className="whitespace-nowrap">הורד XLSX</span>
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <AdminLoader />
        ) : activeParties.length === 0 ? (
          <div className="text-center py-12 text-zinc-500">
            <p>{t('admin.noActiveParties')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeParties.map(party => {
              const partyBalance = partyBalances[party.id] || [];
              const matchedCount = partyBalance.filter(m => m.isMatched).length;
              const unmatchedCount = partyBalance.filter(m => !m.isMatched).length;
              
              return (
              <div key={party.id} className="bg-black/40 border border-zinc-800 p-4 rounded-xl">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-lg font-bold">{party.name}</h4>
                      <span className="px-2 py-1 rounded text-xs font-bold bg-red-600">
                        {t('admin.internalParty')}
                      </span>
                      {partyBalance.length > 0 && (
                        <span className="px-2 py-1 rounded text-xs font-bold bg-green-600">
                          {matchedCount} {t('admin.balanceTables.matched')}
                        </span>
                      )}
                    </div>
                    <p className="text-zinc-400 text-sm">{formatDate(party.date, party.time)}</p>
                    <p className="text-zinc-400 text-sm">
                      {t('admin.males')}: {getGenderCount(party, 'male')}/{party.maleLimit} | 
                      {t('admin.females')}: {getGenderCount(party, 'female')}/{party.femaleLimit} | 
                      {t('admin.total')}: {party.registrations?.length || 0}
                    </p>
                    {partyBalance.length > 0 && (
                      <p className="text-zinc-400 text-sm mt-1">
                        {t('admin.balanceTables.partyBalance')}: {matchedCount} {t('admin.balanceTables.matched')}, {unmatchedCount} {t('admin.balanceTables.unmatched')}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 ml-4">
                    <button
                      onClick={() => handleCreateBalance(party)}
                      disabled={creatingBalance === party.id || !party.registrations || party.registrations.length === 0}
                      className="bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:opacity-50 text-white px-3 py-2 rounded-xl font-bold flex items-center gap-2 text-sm whitespace-nowrap"
                    >
                      {creatingBalance === party.id ? (
                        <Loader size="small" />
                      ) : (
                        <>
                          <Users size={16} /> צור איזון
                        </>
                      )}
                    </button>
                    {partyBalance.length > 0 && (
                      <button
                        onClick={() => exportBalanceToXLSX(party.id, party.name || party.title)}
                        className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-2 rounded-xl font-bold flex items-center gap-2 text-sm whitespace-nowrap"
                      >
                        <Download size={16} /> הורד XLSX
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handlePublishPartyToTelegram(party)}
                      disabled={publishingToTelegramPartyId === party.id || publishingToTelegramPartyId !== null}
                      className="bg-green-600 hover:bg-green-500 disabled:bg-zinc-700 disabled:opacity-50 text-white px-3 py-2 rounded-xl font-bold flex items-center gap-2 text-sm whitespace-nowrap"
                    >
                      {publishingToTelegramPartyId === party.id ? (
                        <Loader size="small" />
                      ) : (
                        <>
                          <Send size={16} /> {t('admin.matches.publishToTelegram') || 'פרסם לטלגרם'}
                        </>
                      )}
                    </button>
                  </div>
                </div>
                
                {party.registrations && party.registrations.length > 0 && (
                  <BalanceTables
                    party={party}
                    balance={partyBalance}
                    onUnmatch={(match) => handleUnmatch(party.id, match)}
                    onConvertToUser={handleConvertClientToUser}
                    onDeleteClient={handleDeleteClient}
                    onManualMatch={handleManualMatch}
                    onSwapPartner={handleSwapPartner}
                    onToggleEntered={handleToggleEntered}
                    onRefresh={loadActiveParties}
                    registeringClient={registeringClient}
                    allUsersMap={allUsersMap}
                    onApproveMatch={(pair) => handleApproveMatch(party, pair)}
                    approvingMatchKey={approvingMatchKey}
                    onLoadBalance={async () => {
                      // Lazy load balance matches only when BalanceTables is rendered
                      // CRITICAL: This function is stable - BalanceTables uses ref to prevent loops
                      if (!partyBalances[party.id]) {
                        try {
                          const balanceMatches = await getBalanceMatches(party.id);
                          setPartyBalances(prev => ({
                            ...prev,
                            [party.id]: balanceMatches || []
                          }));
                        } catch (error) {
                          setPartyBalances(prev => ({
                            ...prev,
                            [party.id]: []
                          }));
                        }
                      }
                    }}
                  />
                )}
              </div>
            );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MatchesSection;

