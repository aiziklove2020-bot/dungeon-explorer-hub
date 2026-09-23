import { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { RotateCcw, Download, Users, Send, MessageCircle, X } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useContent } from '../../context/ContentContext';
import AdminLoader from './AdminLoader';
import { getActiveParties, getPartyById, adminRemoveUserFromParty, unmatchBalance, saveBalanceMatches, getBalanceMatches, convertCoupleToSingles } from '../../firebase/parties';
import { createUserFromRegistration } from '../../firebase/users';
import { sendBalancePublishToChannels, genderFromRegistration } from '../../firebase/telegram';
import { getWhatsappRecipients, getWhatsappGroups, sendFileWhatsApp } from '../../firebase/whatsapp';
import { createBalanceForParty } from '../../utils/balanceMatching';
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
  const [whatsappPickerParty, setWhatsappPickerParty] = useState(null); // { id, name } | null
  const [whatsappRecipients, setWhatsappRecipients] = useState([]);
  const [whatsappGroups, setWhatsappGroups] = useState([]);
  const [whatsappLoadError, setWhatsappLoadError] = useState(null);
  const [whatsappManualPhone, setWhatsappManualPhone] = useState('');
  const [whatsappSelectedTarget, setWhatsappSelectedTarget] = useState(''); // 'phone:<num>' or 'group:<id>'
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);

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

  // saveBalanceMatches now reports whether the push notifications for
  // newly-matched pairs actually went out. Without this, a broken push
  // relay (e.g. a missing VAPID key on the server) fails silently every
  // single time — the admin sees "saved" and has no way to know the
  // matched people were never notified. Surface it loudly instead.
  const warnIfPushFailed = (result) => {
    if (result?.pushAttempted > 0 && result.pushFailed > 0) {
      alert(
        `ההתאמה נשמרה, אבל שליחת ההתראה נכשלה עבור ${result.pushFailed} מתוך ${result.pushAttempted} התראות.` +
        (result.pushError ? `\nשגיאה: ${result.pushError}` : '') +
        '\nיש לבדוק את הגדרות ה-Push בשרת (VAPID_PRIVATE_KEY) — עד שזה יתוקן, אף אחד לא יקבל התראה על התאמות חדשות.'
      );
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

      const result = await saveBalanceMatches(partyId, updatedBalance);

      setPartyBalances(prev => ({
        ...prev,
        [partyId]: updatedBalance
      }));

      showSaved();
      warnIfPushFailed(result);
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

      const result = await saveBalanceMatches(partyId, updatedBalance);

      setPartyBalances(prev => ({
        ...prev,
        [partyId]: updatedBalance
      }));

      showSaved();
      warnIfPushFailed(result);
    } catch (error) {
      alert(`${t('admin.balanceTables.errorCreatingBalance')}: ${error.message}`);
    }
  };

  // Swaps one side of an actual couple (registered via the couple form) with
  // an unmatched walk-in single — e.g. one partner didn't show up. Stored as
  // its own balance entry tagged `swapped: true` and anchored to the
  // couple's coupleId, so it overrides the registration-derived pairing in
  // BalanceTables without touching the underlying registration records.
  const handleSwapCouplePartner = async (partyId, coupleMatch, keptPerson, newPartner, newPartnerGender) => {
    try {
      const coupleId = coupleMatch?.coupleId;
      if (!coupleId) return;

      const currentBalance = partyBalances[partyId] || [];
      const previousOverride = currentBalance.find(m => m.isCouple && m.coupleId === coupleId && m.swapped);
      const withoutOverride = currentBalance.filter(m => !(m.isCouple && m.coupleId === coupleId && m.swapped));

      const male = newPartnerGender === 'male' ? newPartner : keptPerson;
      const female = newPartnerGender === 'female' ? newPartner : keptPerson;

      const newMatch = {
        isCouple: true,
        isMatched: true,
        swapped: true,
        coupleId,
        maleName: male.fullName || male.userName || '',
        malePhone: male.phoneNumber || '',
        maleTelegram: male.telegramUsername || '',
        femaleName: female.fullName || female.userName || '',
        femalePhone: female.phoneNumber || '',
        femaleTelegram: female.telegramUsername || '',
        matchedAt: new Date().toISOString(),
        matchType: 'manual',
        entered: previousOverride?.entered || coupleMatch.entered || false
      };

      const updatedBalance = [...withoutOverride, newMatch];

      const result = await saveBalanceMatches(partyId, updatedBalance);

      setPartyBalances(prev => ({
        ...prev,
        [partyId]: updatedBalance
      }));

      showSaved();
      warnIfPushFailed(result);
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
      setRegisteringClient(registration.phoneNumber);
      await createUserFromRegistration(registration, 'registered', tier);
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

      const result = await saveBalanceMatches(party.id, mergedBalance);

      setPartyBalances(prev => ({
        ...prev,
        [party.id]: mergedBalance
      }));

      showSaved();
      warnIfPushFailed(result);
    } catch (error) {
      alert(`${t('admin.balanceTables.errorCreatingBalance')}: ${error.message}`);
    } finally {
      setCreatingBalance(null);
    }
  };

  // Shared by the "הורד XLSX" download and the "שלח בוואטסאפ" send flow, so
  // both always produce the exact same file from the exact same data.
  // Returns null (after alerting) when there's nothing matched to export.
  const buildBalanceWorkbook = async (partyId) => {
    const balance = partyBalances[partyId];
    if (!balance || balance.length === 0) {
      alert(t('admin.balanceTables.noBalanceForParty') + '. ' + t('admin.balanceTables.pleaseCreateBalanceFirst'));
      return null;
    }

    const matchedBalances = balance.filter(match => match.isMatched === true);

    if (matchedBalances.length === 0) {
      alert(t('admin.balanceTables.noMatchedCouplesToExport'));
      return null;
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
    return { XLSX, wb };
  };

  const exportBalanceToXLSX = async (partyId, partyName) => {
    const built = await buildBalanceWorkbook(partyId);
    if (!built) return;
    const { XLSX, wb } = built;

    const partyNameSafe = (partyName || 'מסיבה').replace(/[^a-z0-9]/gi, '_');
    const filename = `איזון_${partyNameSafe}_${new Date().toISOString().split('T')[0]}.xlsx`;

    XLSX.writeFile(wb, filename);
    showSaved();
  };

  // Opens the recipient picker for a party's balance and eagerly loads the
  // bot's saved recipients + groups (best-effort — if the local bot isn't
  // running, the picker still opens with just the manual-phone-number option).
  const openWhatsappPicker = async (partyId, partyName) => {
    setWhatsappPickerParty({ id: partyId, name: partyName });
    setWhatsappSelectedTarget('');
    setWhatsappManualPhone('');
    setWhatsappLoadError(null);
    try {
      const [recipients, groups] = await Promise.all([getWhatsappRecipients(), getWhatsappGroups()]);
      setWhatsappRecipients(recipients);
      setWhatsappGroups(groups);
    } catch (err) {
      setWhatsappRecipients([]);
      setWhatsappGroups([]);
      setWhatsappLoadError('לא ניתן להתחבר לבוט הוואטסאפ המקומי (ודא/י שהוא רץ) — עדיין אפשר להזין מספר טלפון ידנית.');
    }
  };

  const closeWhatsappPicker = () => setWhatsappPickerParty(null);

  const handleSendWhatsApp = async () => {
    if (!whatsappPickerParty) return;
    const manualDigits = whatsappManualPhone.replace(/[^\d]/g, '');
    const target = whatsappSelectedTarget || (manualDigits ? `phone:${manualDigits}` : '');
    if (!target) {
      alert('בחר/י נמען, או הזן/י מספר טלפון.');
      return;
    }

    const built = await buildBalanceWorkbook(whatsappPickerParty.id);
    if (!built) return;
    const { XLSX, wb } = built;

    setSendingWhatsApp(true);
    try {
      const arrayBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
      const blob = new Blob([arrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const partyNameSafe = (whatsappPickerParty.name || 'מסיבה').replace(/[^a-z0-9]/gi, '_');
      const filename = `איזון_${partyNameSafe}_${new Date().toISOString().split('T')[0]}.xlsx`;

      const [kind, value] = target.split(':');
      await sendFileWhatsApp({
        ...(kind === 'group' ? { groupId: value } : { to: value }),
        blob,
        filename,
        caption: `איזון עבור ${whatsappPickerParty.name || 'מסיבה'}`,
      });

      showSaved();
      closeWhatsappPicker();
    } catch (err) {
      alert(`שליחה נכשלה: ${err.message}`);
    } finally {
      setSendingWhatsApp(false);
    }
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
    <div className="bg-[#121218] backdrop-blur-2xl border border-white/5 p-6 rounded-2xl space-y-6">
      
      <div>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
          <h3 className="text-xl font-bold shrink-0">{t('registrationsByParty') || 'רישומים לפי מסיבה'}</h3>
          <div className="flex flex-wrap gap-2 min-w-0">
            <button
              onClick={loadActiveParties}
              className="bg-[#2a292e] hover:bg-[#353439] text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl font-bold flex items-center gap-1.5 sm:gap-2 text-xs sm:text-base shrink-0"
            >
              <RotateCcw size={14} className="sm:w-4 sm:h-4 shrink-0" /> <span className="whitespace-nowrap">{t('admin.refresh')}</span>
            </button>
            {Object.keys(partyBalances).length > 0 && (
              <button
                onClick={exportAllBalancesToXLSX}
                className="bg-[#ff4994] hover:bg-[#e0397f] text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl font-bold flex items-center gap-1.5 sm:gap-2 text-xs sm:text-base shrink-0"
              >
                <Download size={14} className="sm:w-4 sm:h-4 shrink-0" /> <span className="whitespace-nowrap">הורד XLSX</span>
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <AdminLoader />
        ) : activeParties.length === 0 ? (
          <div className="text-center py-12 text-[#94A3B8]">
            <p>{t('admin.noActiveParties')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeParties.map(party => {
              const partyBalance = partyBalances[party.id] || [];
              const matchedCount = partyBalance.filter(m => m.isMatched).length;
              const unmatchedCount = partyBalance.filter(m => !m.isMatched).length;
              
              return (
              <div key={party.id} className="bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] p-4 rounded-xl">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-lg font-bold">{party.name}</h4>
                      <span className="px-2 py-1 rounded text-xs font-bold bg-[#ff5708]">
                        {t('admin.internalParty')}
                      </span>
                      {partyBalance.length > 0 && (
                        <span className="px-2 py-1 rounded text-xs font-bold bg-green-600">
                          {matchedCount} {t('admin.balanceTables.matched')}
                        </span>
                      )}
                    </div>
                    <p className="text-[#a9a9b2] text-sm">{formatDate(party.date, party.time)}</p>
                    <p className="text-[#a9a9b2] text-sm">
                      {t('admin.males')}: {getGenderCount(party, 'male')}/{party.maleLimit} | 
                      {t('admin.females')}: {getGenderCount(party, 'female')}/{party.femaleLimit} | 
                      {t('admin.total')}: {party.registrations?.length || 0}
                    </p>
                    {partyBalance.length > 0 && (
                      <p className="text-[#a9a9b2] text-sm mt-1">
                        {t('admin.balanceTables.partyBalance')}: {matchedCount} {t('admin.balanceTables.matched')}, {unmatchedCount} {t('admin.balanceTables.unmatched')}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 ml-4">
                    <button
                      onClick={() => handleCreateBalance(party)}
                      disabled={creatingBalance === party.id || !party.registrations || party.registrations.length === 0}
                      className="bg-[#353439] hover:bg-[#404049] disabled:bg-[#2a292e] disabled:opacity-50 text-white px-3 py-2 rounded-xl font-bold flex items-center gap-2 text-sm whitespace-nowrap"
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
                        className="bg-[#ff4994] hover:bg-[#e0397f] text-white px-3 py-2 rounded-xl font-bold flex items-center gap-2 text-sm whitespace-nowrap"
                      >
                        <Download size={16} /> הורד XLSX
                      </button>
                    )}
                    {partyBalance.length > 0 && (
                      <button
                        type="button"
                        onClick={() => openWhatsappPicker(party.id, party.name || party.title)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-xl font-bold flex items-center gap-2 text-sm whitespace-nowrap"
                      >
                        <MessageCircle size={16} /> שלח אקסל בוואטסאפ
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handlePublishPartyToTelegram(party)}
                      disabled={publishingToTelegramPartyId === party.id || publishingToTelegramPartyId !== null}
                      className="bg-gradient-to-l from-[#ff5708] to-[#ff7a29] hover:brightness-110 disabled:bg-[#2a292e] disabled:opacity-50 disabled:bg-none text-white px-3 py-2 rounded-xl font-bold flex items-center gap-2 text-sm whitespace-nowrap"
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
                    onSwapCouplePartner={handleSwapCouplePartner}
                    onToggleEntered={handleToggleEntered}
                    onRefresh={loadActiveParties}
                    registeringClient={registeringClient}
                    allUsersMap={allUsersMap}
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

      {whatsappPickerParty && createPortal(
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={closeWhatsappPicker}>
          <div
            className="bg-[#121218] border border-white/10 rounded-2xl p-6 w-full max-w-md space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold">שליחת אקסל בוואטסאפ — {whatsappPickerParty.name}</h3>
              <button onClick={closeWhatsappPicker} className="text-[#94A3B8] hover:text-white">
                <X size={20} />
              </button>
            </div>

            {whatsappLoadError && (
              <p className="text-amber-400 text-sm">{whatsappLoadError}</p>
            )}

            {whatsappRecipients.length > 0 && (
              <div className="space-y-1">
                <label className="text-xs uppercase font-bold text-[#94A3B8]">אנשי קשר שמורים</label>
                <div className="space-y-1">
                  {whatsappRecipients.map((r) => (
                    <label key={r.phone} className="flex items-center gap-2 text-sm bg-[#1f1f23]/80 p-2 rounded-lg cursor-pointer">
                      <input
                        type="radio"
                        name="whatsappTarget"
                        checked={whatsappSelectedTarget === `phone:${r.phone}`}
                        onChange={() => setWhatsappSelectedTarget(`phone:${r.phone}`)}
                      />
                      {r.name}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {whatsappGroups.length > 0 && (
              <div className="space-y-1">
                <label className="text-xs uppercase font-bold text-[#94A3B8]">קבוצות</label>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {whatsappGroups.map((g) => (
                    <label key={g.id} className="flex items-center gap-2 text-sm bg-[#1f1f23]/80 p-2 rounded-lg cursor-pointer">
                      <input
                        type="radio"
                        name="whatsappTarget"
                        checked={whatsappSelectedTarget === `group:${g.id}`}
                        onChange={() => setWhatsappSelectedTarget(`group:${g.id}`)}
                      />
                      {g.name}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs uppercase font-bold text-[#94A3B8]">או מספר טלפון (בינלאומי, למשל 972501234567)</label>
              <input
                type="text"
                value={whatsappManualPhone}
                onChange={(e) => {
                  setWhatsappManualPhone(e.target.value);
                  if (e.target.value) setWhatsappSelectedTarget('');
                }}
                placeholder="972501234567"
                className="w-full bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] p-3 rounded-xl focus:border-emerald-600 outline-none text-white"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={closeWhatsappPicker}
                className="bg-[#1f1f23] hover:bg-[#2a292e] text-white px-4 py-2 rounded-xl font-bold"
              >
                ביטול
              </button>
              <button
                type="button"
                onClick={handleSendWhatsApp}
                disabled={sendingWhatsApp}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2"
              >
                <MessageCircle size={16} /> {sendingWhatsApp ? 'שולח…' : 'שלח'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default MatchesSection;

