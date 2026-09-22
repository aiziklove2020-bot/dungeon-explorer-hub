import { useState, useEffect, useRef } from 'react';
import { X, Link as LinkIcon, Trash2, UserPlus, RefreshCw, CalendarCheck, Star } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { getUserByPhone } from '../../firebase/users';
import { genderFromRegistration } from '../../firebase/telegram';
import { normalizeIsraeliPhone } from '../../utils/phone';
import Loader from '../Loader';
import PhoneLink from '../PhoneLink';
import './BalanceTables.css';

const BalanceTables = ({ 
  party, 
  balance, 
  onUnmatch,
  onConvertToUser,
  onDeleteClient,
  onRefresh,
  onManualMatch,
  onSwapPartner,
  onSwapCouplePartner,
  onToggleEntered,
  registeringClient,
  allUsersMap,
  onLoadBalance
}) => {
  const { t } = useLanguage();
  const [usersInTable, setUsersInTable] = useState(new Map());
  const [checkingUsers, setCheckingUsers] = useState(true);
  const [showManualMatchFor, setShowManualMatchFor] = useState(null);
  const [showSwapFor, setShowSwapFor] = useState(null);
  
  // Track if balance has been loaded to prevent multiple calls
  const balanceLoadedRef = useRef(false);

  // Lazy load balance matches when component mounts (only once)
  // CRITICAL FIX: Removed onLoadBalance from dependencies to prevent loop
  // We use balanceLoadedRef to ensure it only runs once, regardless of function reference changes
  useEffect(() => {
    if (!balanceLoadedRef.current && onLoadBalance && (!balance || balance.length === 0)) {
      balanceLoadedRef.current = true;
      onLoadBalance().catch(() => {
        balanceLoadedRef.current = false; // Reset on error to allow retry
      });
    }
    // If balance is loaded, mark as loaded
    if (balance && balance.length > 0) {
      balanceLoadedRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [balance?.length]); // Only depend on balance length, NOT onLoadBalance (prevents loop)

  useEffect(() => {
    const checkUsersInTable = () => {
      if (!party.registrations || party.registrations.length === 0) {
        setCheckingUsers(false);
        return;
      }
      
      const userMap = new Map();
      const phoneNumbers = party.registrations
        .filter(reg => reg.phoneNumber)
        .map(reg => reg.phoneNumber);
      
      const uniquePhoneNumbers = [...new Set(phoneNumbers)];
      
      // Use allUsersMap if provided (optimization to avoid DB calls)
      // allUsersMap is keyed by the user doc's normalized phone
      // (createUserFromRegistration always writes 05XXXXXXXX), but a
      // registration's raw phoneNumber can still carry an international
      // prefix (+972...) if it wasn't normalized at write time — normalize
      // here too so the lookup doesn't miss a user that genuinely exists.
      if (allUsersMap && allUsersMap.size > 0) {
        uniquePhoneNumbers.forEach(phoneNumber => {
          const normalized = normalizeIsraeliPhone(phoneNumber) || phoneNumber;
          const user = allUsersMap.get(phoneNumber) || allUsersMap.get(normalized);
          userMap.set(phoneNumber, user !== null && user !== undefined && user.level !== 'blocked');
        });
        setUsersInTable(userMap);
        setCheckingUsers(false);
        return;
      }

      // Fallback: if allUsersMap not provided, fetch users individually (should rarely happen)
      const fetchUsers = async () => {
        for (const phoneNumber of uniquePhoneNumbers) {
          try {
            const user = await getUserByPhone(normalizeIsraeliPhone(phoneNumber) || phoneNumber);
            userMap.set(phoneNumber, user !== null && user !== undefined);
          } catch (error) {
            userMap.set(phoneNumber, false);
          }
        }
        setUsersInTable(userMap);
        setCheckingUsers(false);
      };
      
      fetchUsers();
    };
    
    checkUsersInTable();
  }, [party.registrations, allUsersMap]);

  // Registrants can upload a profile photo from their personal area
  // (my-area.html); look it up the same way usersInTable does, by
  // normalized phone against the preloaded allUsersMap.
  const getPhotoUrl = (phoneNumber) => {
    if (!phoneNumber || !allUsersMap) return '';
    const normalized = normalizeIsraeliPhone(phoneNumber) || phoneNumber;
    const user = allUsersMap.get(phoneNumber) || allUsersMap.get(normalized);
    return user?.photoUrl || '';
  };

  const PersonAvatar = ({ phoneNumber, emoji, className }) => {
    const photoUrl = getPhotoUrl(phoneNumber);
    if (photoUrl) {
      return <img src={photoUrl} alt="" className={`person-avatar-img ${className || ''}`} />;
    }
    return <span className={className}>{emoji}</span>;
  };

  // The public registration form's "couple" option registers each partner
  // as their own single-type record (needed to get correct gender and
  // real database entries — see register-event.html), linked purely by
  // each pointing at the other's phone in partnerPhone — there's no
  // coupleId on that path. Synthesize one here (from the sorted phone
  // pair) so this component's existing coupleId-keyed grouping picks
  // them up as a couple instead of two unrelated singles.
  const phoneToReg = new Map();
  (party.registrations || []).forEach(reg => { if (reg.phoneNumber) phoneToReg.set(reg.phoneNumber, reg); });
  const registrations = (party.registrations || []).map(reg => {
    if (reg.coupleId || !reg.partnerPhone || !reg.phoneNumber) return reg;
    const partner = phoneToReg.get(reg.partnerPhone);
    if (!partner || partner.partnerPhone !== reg.phoneNumber) return reg;
    return { ...reg, coupleId: [reg.phoneNumber, reg.partnerPhone].sort().join('_') };
  });

  const couples = registrations?.filter(reg =>
    reg.registrationType === 'couple' || reg.gender === 'couple' || reg.coupleId
  ) || [];

  const couplesByCoupleId = {};
  couples.forEach(couple => {
    if (couple.coupleId) {
      if (!couplesByCoupleId[couple.coupleId]) {
        couplesByCoupleId[couple.coupleId] = [];
      }
      couplesByCoupleId[couple.coupleId].push(couple);
    }
  });

  const registeredMen = registrations?.filter(reg =>
    genderFromRegistration(reg) === 'male' &&
    reg.phoneNumber &&
    usersInTable.get(reg.phoneNumber) === true &&
    genderFromRegistration(reg) !== 'couple' &&
    !reg.coupleId
  ) || [];

  const registeredWomen = registrations?.filter(reg =>
    genderFromRegistration(reg) === 'female' &&
    reg.phoneNumber &&
    usersInTable.get(reg.phoneNumber) === true &&
    genderFromRegistration(reg) !== 'couple' &&
    !reg.coupleId
  ) || [];

  const clients = registrations?.filter(reg =>
    (!reg.phoneNumber || usersInTable.get(reg.phoneNumber) !== true) &&
    genderFromRegistration(reg) !== 'couple' &&
    !reg.coupleId
  ) || [];

  const coupleMen = couples.filter(c => (genderFromRegistration(c) === 'male' || !genderFromRegistration(c)));
  const coupleWomen = couples.filter(c => genderFromRegistration(c) === 'female');
  
  const clientMen = clients.filter(c => genderFromRegistration(c) === 'male');
  const clientWomen = clients.filter(c => genderFromRegistration(c) === 'female');
  
  const allMen = [...registeredMen, ...coupleMen, ...clientMen];
  const allWomen = [...registeredWomen, ...coupleWomen, ...clientWomen];
  
  const isClient = (reg) => {
    if (!reg) return true;
    
    if (reg.registrationType === 'couple' || reg.gender === 'couple' || reg.coupleId) {
      return false;
    }
    
    if (!reg.phoneNumber) {
      return true;
    }
    
    if (checkingUsers) {
      return false;
    }
    
    return usersInTable.get(reg.phoneNumber) !== true;
  };

  const matchMap = {};
  const coupleMatchMap = {};
  if (balance && balance.length > 0) {
    balance.forEach(match => {
      if (match.isMatched) {
        if (match.isCouple) {
          if (match.malePhone) {
            coupleMatchMap[match.malePhone] = match;
          }
        } else {
          if (match.malePhone) {
            matchMap[match.malePhone] = match;
          }
          if (match.femalePhone) {
            matchMap[match.femalePhone] = match;
          }
        }
      }
    });
  }
  
  Object.values(couplesByCoupleId).forEach(coupleGroup => {
    const maleCouple = coupleGroup.find(c => c.gender === 'male');
    const femaleCouple = coupleGroup.find(c => c.gender === 'female');

    if (maleCouple && femaleCouple) {
      // A manual swap (one partner didn't show up, replaced by an unmatched
      // walk-in) is stored as its own balance entry tagged `swapped: true`,
      // carrying whichever side got replaced — the other side stays as the
      // original registration. Prefer it over the registration-derived pair
      // when present.
      const override = balance?.find(m => m.isCouple && m.coupleId === maleCouple.coupleId && m.swapped);
      const existingMatch = override || balance?.find(m =>
        m.isCouple && m.coupleId === maleCouple.coupleId
      );

      const matchData = {
        isCouple: true,
        isMatched: true,
        maleName: override ? override.maleName : (maleCouple.fullName || maleCouple.userName || ''),
        femaleName: override ? override.femaleName : (femaleCouple.fullName || femaleCouple.userName || ''),
        malePhone: override ? override.malePhone : (maleCouple.phoneNumber || ''),
        femalePhone: override ? override.femalePhone : (femaleCouple.phoneNumber || ''),
        maleTelegram: override ? (override.maleTelegram || '') : (maleCouple.telegramUsername || ''),
        femaleTelegram: override ? (override.femaleTelegram || '') : (femaleCouple.telegramUsername || ''),
        coupleId: maleCouple.coupleId,
        swapped: !!override,
        entered: existingMatch?.entered || false
      };

      if (matchData.malePhone) {
        coupleMatchMap[matchData.malePhone] = matchData;
      }
      if (matchData.femalePhone) {
        coupleMatchMap[matchData.femalePhone] = matchData;
      }
    }
  });
  
  couples.forEach(couple => {
    if (couple.phoneNumber && !couple.coupleId && couple.partnerName) {
      const existingMatch = balance?.find(m => 
        m.isCouple && (m.malePhone === couple.phoneNumber || m.femalePhone === couple.phoneNumber)
      );
      
      coupleMatchMap[couple.phoneNumber] = {
        isCouple: true,
        isMatched: true,
        maleName: couple.gender === 'male' ? (couple.fullName || couple.userName || '') : couple.partnerName || '',
        femaleName: couple.gender === 'female' ? (couple.fullName || couple.userName || '') : couple.partnerName || '',
        malePhone: couple.gender === 'male' ? couple.phoneNumber : (couple.partnerPhone || ''),
        femalePhone: couple.gender === 'female' ? couple.phoneNumber : (couple.partnerPhone || ''),
        entered: existingMatch?.entered || false
      };
    }
  });

  const getMatch = (reg) => {
    if (!reg.phoneNumber) return null;
    
    if (isClient(reg)) {
      return null;
    }
    
    if (coupleMatchMap[reg.phoneNumber]) {
      return coupleMatchMap[reg.phoneNumber];
    }
    return matchMap[reg.phoneNumber] || null;
  };
  
  const isCouple = (reg) => {
    return (reg.registrationType === 'couple' || reg.gender === 'couple' || reg.coupleId) || 
           (coupleMatchMap[reg.phoneNumber]?.isCouple === true);
  };

  const isMatched = (reg) => {
    return getMatch(reg) !== null;
  };

  const getMatchedPartner = (reg) => {
    const match = getMatch(reg);
    if (!match) return null;
    
    if (match.isCouple) {
      if (match.coupleId) {
        if (reg.gender === 'male') {
          return allWomen.find(w => w.coupleId === match.coupleId && w.phoneNumber === match.femalePhone);
        } else {
          return allMen.find(m => m.coupleId === match.coupleId && m.phoneNumber === match.malePhone);
        }
      } else {
        const couple = couples.find(c => c.phoneNumber === reg.phoneNumber);
        if (couple && couple.partnerName) {
          return {
            fullName: couple.partnerName,
            phoneNumber: couple.partnerPhone || '',
            isCouplePartner: true
          };
        }
      }
      return null;
    }
    
    if (reg.gender === 'male') {
      return allWomen.find(w => w.phoneNumber === match.femalePhone);
    } else {
      return allMen.find(m => m.phoneNumber === match.malePhone);
    }
  };

  const handleUnmatch = (reg) => {
    const match = getMatch(reg);
    if (match && onUnmatch) {
      onUnmatch(match);
    }
  };

  const getMatchedPairs = () => {
    const pairs = [];
    const processedPhones = new Set();
    const processedCoupleIds = new Set();
    
    Object.values(couplesByCoupleId).forEach(coupleGroup => {
      const maleCouple = coupleGroup.find(c => c.gender === 'male');
      const femaleCouple = coupleGroup.find(c => c.gender === 'female');

      if (maleCouple && femaleCouple && maleCouple.coupleId && !processedCoupleIds.has(maleCouple.coupleId)) {
        // A swap replaces whichever side didn't show up, so the match's
        // malePhone/femalePhone may point at a different person than the
        // couple's original registration — resolve the actual person to
        // render on each side instead of assuming it's always maleCouple/femaleCouple.
        const match = coupleMatchMap[maleCouple.phoneNumber] || coupleMatchMap[femaleCouple.phoneNumber];
        if (match && match.isCouple && match.coupleId === maleCouple.coupleId) {
          const effectiveMale = match.malePhone === maleCouple.phoneNumber
            ? maleCouple
            : (allMen.find(m => m.phoneNumber === match.malePhone) || { fullName: match.maleName, phoneNumber: match.malePhone, telegramUsername: match.maleTelegram || '' });
          const effectiveFemale = match.femalePhone === femaleCouple.phoneNumber
            ? femaleCouple
            : (allWomen.find(w => w.phoneNumber === match.femalePhone) || { fullName: match.femaleName, phoneNumber: match.femalePhone, telegramUsername: match.femaleTelegram || '' });
          pairs.push({
            male: effectiveMale,
            female: effectiveFemale,
            match: match
          });
          processedCoupleIds.add(maleCouple.coupleId);
          processedPhones.add(effectiveMale.phoneNumber);
          processedPhones.add(effectiveFemale.phoneNumber);
        }
      }
    });

    // Legacy single-record couples: one registration (registrationType
    // 'couple') carries the partner's name/phone in partnerName/partnerPhone
    // instead of having a real second record + coupleId. These never land in
    // couplesByCoupleId (no coupleId) and are deliberately excluded from the
    // allMen loop below (isCouple(man) is true for them), so without this
    // branch they'd never show up as a matched pair at all.
    couples.forEach(couple => {
      if (
        couple.coupleId ||
        !couple.phoneNumber ||
        !couple.partnerName ||
        processedPhones.has(couple.phoneNumber) ||
        genderFromRegistration(couple) === 'female'
      ) {
        return;
      }
      const match = getMatch(couple);
      if (!match || !match.isCouple) return;
      const female = {
        fullName: couple.partnerName,
        phoneNumber: couple.partnerPhone || '',
        isCouplePartner: true
      };
      pairs.push({ male: couple, female, match });
      processedPhones.add(couple.phoneNumber);
      if (female.phoneNumber) processedPhones.add(female.phoneNumber);
    });

    allMen.forEach(man => {
      if (isMatched(man) && !isCouple(man) && !isClient(man) && !processedPhones.has(man.phoneNumber)) {
        const match = getMatch(man);
        const matchedWoman = getMatchedPartner(man);
        
        if (match && matchedWoman && !processedPhones.has(matchedWoman.phoneNumber)) {
          pairs.push({
            male: man,
            female: matchedWoman,
            match: match
          });
          processedPhones.add(man.phoneNumber);
          processedPhones.add(matchedWoman.phoneNumber);
        }
      }
    });
    
    return { pairs, processedPhones };
  };

  const { pairs: matchedPairs, processedPhones } = getMatchedPairs();

  const unmatchedMen = allMen.filter(man => !processedPhones.has(man.phoneNumber));
  const unmatchedWomen = allWomen.filter(woman => !processedPhones.has(woman.phoneNumber));

  return (
    <div className="balance-tables">
      <h5 className="balance-tables__title">{t('admin.registrationsList')}</h5>
      
      {matchedPairs.length > 0 && (
        <div className="matched-pairs">
          <h6 className="matched-pairs__header">
            <span>✅</span> {t('admin.balanceTables.matchedPairs')}
            <span className="matched-pairs__header-count">({matchedPairs.length})</span>
          </h6>
          <div className="matched-pairs__container">
            <div className="matched-pairs__list">
              {matchedPairs.map((pair, index) => {
                const isEntered = pair.match?.entered === true;
                const showingSwapMale = showSwapFor?.phone === pair.male.phoneNumber && showSwapFor?.gender === 'male';
                const showingSwapFemale = showSwapFor?.phone === pair.female.phoneNumber && showSwapFor?.gender === 'female';
                
                return (
                <div key={pair.match?.coupleId || `${pair.male.phoneNumber}_${pair.female.phoneNumber}`} className={`matched-pair ${isEntered ? 'matched-pair--entered' : ''}`}>
                  <div className="matched-pair__header">
                    <label className="matched-pair__checkbox-label">
                      <input
                        type="checkbox"
                        checked={isEntered}
                        onChange={() => onToggleEntered && onToggleEntered(party.id, pair.match)}
                        className="matched-pair__checkbox"
                      />
                      <span className={`matched-pair__checkbox-text ${isEntered ? 'matched-pair__checkbox-text--entered' : ''}`}>
                        {t('admin.balanceTables.entered') || 'נכנסו'}
                      </span>
                    </label>
                    <div className="matched-pair__header-actions">
                      {pair.match?.isCouple && (
                        <span className="matched-pair__couple-badge">
                          💑 {t('admin.balanceTables.couples')}
                        </span>
                      )}
                      <button
                        onClick={() => handleUnmatch(pair.male)}
                        className="matched-pair__unmatch-btn"
                        title={t('admin.balanceTables.unmatchTitle')}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="matched-pair__content">
                    <div className="person-card person-card--male">
                      <div className="person-card__header">
                        <PersonAvatar phoneNumber={pair.male.phoneNumber} emoji="👨" className="person-card__icon person-card__icon--male" />
                        <strong className={`person-card__name ${isEntered ? 'person-card__name--entered' : ''}`}>
                          {pair.male.fullName || pair.male.userName || '-'}
                        </strong>
                        {pair.male.phoneNumber && usersInTable.get(pair.male.phoneNumber) === true ? (
                          <span className="person-card__registered-badge">✓</span>
                        ) : pair.male.phoneNumber && onConvertToUser && (
                          <span style={{ display: 'inline-flex', gap: 4 }}>
                            <button
                              onClick={() => onConvertToUser({ ...pair.male, gender: 'male', fullName: pair.male.fullName || pair.male.userName }, 'day')}
                              disabled={registeringClient === pair.male.phoneNumber}
                              className="person-card__make-user-btn"
                              title="אישור חד פעמי למסיבה זו בלבד"
                            >
                              {registeringClient === pair.male.phoneNumber ? '...' : <CalendarCheck size={12} />}
                            </button>
                            <button
                              onClick={() => onConvertToUser({ ...pair.male, gender: 'male', fullName: pair.male.fullName || pair.male.userName }, 'year')}
                              disabled={registeringClient === pair.male.phoneNumber}
                              className="person-card__make-user-btn"
                              title="מנוי מלא לשנה"
                            >
                              {registeringClient === pair.male.phoneNumber ? '...' : <Star size={12} />}
                            </button>
                          </span>
                        )}
                        {unmatchedWomen.length > 0 && (pair.match?.isCouple ? onSwapCouplePartner : onSwapPartner) && (
                          <button
                            onClick={() => setShowSwapFor(showingSwapMale ? null : { phone: pair.male.phoneNumber, gender: 'male' })}
                            className="person-card__swap-btn"
                            title={pair.match?.isCouple ? 'החלף בת זוג (למשל אם לא הגיעה)' : (t('admin.balanceTables.swapPartner') || 'החלף')}
                          >
                            <RefreshCw size={14} />
                          </button>
                        )}
                      </div>
                      <div className={`person-card__details ${isEntered ? 'person-card__details--entered' : ''}`}>
                        <PhoneLink phone={pair.male.phoneNumber}>{pair.male.phoneNumber || '-'}</PhoneLink>
                        {pair.male.telegramUsername && ` • @${pair.male.telegramUsername}`}
                      </div>
                      {showingSwapMale && (
                        <div className="swap-dropdown">
                          <p className="swap-dropdown__title">{t('admin.balanceTables.selectWoman') || 'בחר אישה:'}</p>
                          <div className="swap-dropdown__list">
                            {unmatchedWomen.map((woman, wIndex) => (
                              <button
                                key={wIndex}
                                onClick={() => {
                                  if (pair.match?.isCouple && onSwapCouplePartner) {
                                    onSwapCouplePartner(party.id, pair.match, pair.male, woman, 'female');
                                    setShowSwapFor(null);
                                  } else if (onSwapPartner) {
                                    onSwapPartner(party.id, pair.match, pair.male, woman);
                                    setShowSwapFor(null);
                                  }
                                }}
                                className="swap-dropdown__item swap-dropdown__item--female"
                              >
                                {woman.fullName || woman.userName || '-'}
                              </button>
                            ))}
                          </div>
                          <button onClick={() => setShowSwapFor(null)} className="swap-dropdown__cancel">
                            {t('admin.cancel') || 'ביטול'}
                          </button>
                        </div>
                      )}
                    </div>
                    
                    <div className={`connection-icon ${isEntered ? 'connection-icon--entered' : ''}`}>
                      <LinkIcon size={18} />
                    </div>
                    
                    <div className="person-card person-card--female">
                      <div className="person-card__header">
                        <PersonAvatar phoneNumber={pair.female.phoneNumber} emoji="👩" className="person-card__icon person-card__icon--female" />
                        <strong className={`person-card__name ${isEntered ? 'person-card__name--entered' : ''}`}>
                          {pair.female.fullName || pair.female.userName || '-'}
                        </strong>
                        {pair.female.phoneNumber && usersInTable.get(pair.female.phoneNumber) === true ? (
                          <span className="person-card__registered-badge">✓</span>
                        ) : pair.female.phoneNumber && onConvertToUser && (
                          // Women get free full access automatically (see
                          // getSubscription's gender bypass) — day/year is
                          // meaningless here, this just creates the account.
                          <button
                            onClick={() => onConvertToUser({ ...pair.female, gender: 'female', fullName: pair.female.fullName || pair.female.userName }, 'year')}
                            disabled={registeringClient === pair.female.phoneNumber}
                            className="person-card__make-user-btn"
                            title="צור משתמש (גישה חינם לנשים)"
                          >
                            {registeringClient === pair.female.phoneNumber ? '...' : <UserPlus size={12} />}
                          </button>
                        )}
                        {unmatchedMen.length > 0 && (pair.match?.isCouple ? onSwapCouplePartner : onSwapPartner) && (
                          <button
                            onClick={() => setShowSwapFor(showingSwapFemale ? null : { phone: pair.female.phoneNumber, gender: 'female' })}
                            className="person-card__swap-btn"
                            title={pair.match?.isCouple ? 'החלף בן זוג (למשל אם לא הגיע)' : (t('admin.balanceTables.swapPartner') || 'החלף')}
                          >
                            <RefreshCw size={14} />
                          </button>
                        )}
                      </div>
                      <div className={`person-card__details ${isEntered ? 'person-card__details--entered' : ''}`}>
                        <PhoneLink phone={pair.female.phoneNumber}>{pair.female.phoneNumber || '-'}</PhoneLink>
                        {pair.female.telegramUsername && ` • @${pair.female.telegramUsername}`}
                      </div>
                      {showingSwapFemale && (
                        <div className="swap-dropdown">
                          <p className="swap-dropdown__title">{t('admin.balanceTables.selectMan') || 'בחר גבר:'}</p>
                          <div className="swap-dropdown__list">
                            {unmatchedMen.map((man, mIndex) => (
                              <button
                                key={mIndex}
                                onClick={() => {
                                  if (pair.match?.isCouple && onSwapCouplePartner) {
                                    onSwapCouplePartner(party.id, pair.match, pair.female, man, 'male');
                                    setShowSwapFor(null);
                                  } else if (onSwapPartner) {
                                    onSwapPartner(party.id, pair.match, man, pair.female);
                                    setShowSwapFor(null);
                                  }
                                }}
                                className="swap-dropdown__item"
                              >
                                {man.fullName || man.userName || '-'}
                              </button>
                            ))}
                          </div>
                          <button onClick={() => setShowSwapFor(null)} className="swap-dropdown__cancel">
                            {t('admin.cancel') || 'ביטול'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
              })}
            </div>
          </div>
        </div>
      )}

      {(unmatchedMen.length > 0 || unmatchedWomen.length > 0) && (
        <div className="unmatched-section">
          <h6 className="unmatched-section__header">
            <span>⏳</span> {t('admin.balanceTables.unmatchedRegistrations')}
          </h6>
      <div className="unmatched-section__grid">
        <div className="gender-column">
          <h6 className="gender-column__header gender-column__header--male">
            <span>👨</span> {t('admin.males')}
                <span className="gender-column__count">({unmatchedMen.length})</span>
          </h6>
          <div className="gender-column__list">
                {unmatchedMen.length === 0 ? (
              <p className="gender-column__empty">{t('admin.balanceTables.noRegisteredMen')}</p>
            ) : (
                  unmatchedMen.map((man, index) => {
                const isManCouple = isCouple(man);
                const isManClient = isClient(man);
                
                return (
                  <div key={index}>
                    <div className={`unmatched-card ${
                      isManClient ? 'unmatched-card--client' :
                      isManCouple ? 'unmatched-card--couple' :
                          'unmatched-card--default'
                    }`}>
                      <div className="unmatched-card__content">
                        <div className="unmatched-card__info">
                          <div className="unmatched-card__header">
                            <PersonAvatar phoneNumber={man.phoneNumber} emoji="👨" className="unmatched-card__icon" />
                            <strong className={`unmatched-card__name ${
                              isManClient ? 'unmatched-card__name--client' : ''
                            }`}>{man.fullName || man.userName || '-'}</strong>
                                {isManClient && (
                                  <span className="unmatched-card__badge unmatched-card__badge--male">
                                    {t('admin.balanceTables.male')}
                                  </span>
                                )}
                            {isManClient ? (
                              <span className="unmatched-card__badge unmatched-card__badge--client">
                                {t('admin.balanceTables.client')}
                              </span>
                                ) : isManCouple && (
                              <span className="unmatched-card__badge unmatched-card__badge--couple">
                                💑
                              </span>
                            )}
                          </div>
                          <p className={`unmatched-card__details ${
                            isManClient ? 'unmatched-card__details--client' : ''
                          }`}><PhoneLink phone={man.phoneNumber}>{man.phoneNumber || '-'}</PhoneLink>{man.telegramUsername && ` • @${man.telegramUsername}`}</p>
                          {isManCouple && (man.partnerName || man.partnerPhone) && (
                            <p className="unmatched-card__details text-[#94A3B8] text-xs mt-1">
                              {t('admin.balanceTables.partner') || 'בן/בת זוג'}: {man.partnerName || '-'}
                              {man.partnerPhone && (
                                <><br /><PhoneLink phone={man.partnerPhone}>{man.partnerPhone}</PhoneLink></>
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }).filter(item => item !== null)
            )}
          </div>
        </div>

        <div className="gender-column">
          <h6 className="gender-column__header gender-column__header--female">
            <span>👩</span> {t('admin.females')}
                <span className="gender-column__count">({unmatchedWomen.length})</span>
          </h6>
          <div className="gender-column__list">
                {unmatchedWomen.length === 0 ? (
              <p className="gender-column__empty">{t('admin.balanceTables.noRegisteredWomen')}</p>
            ) : (
                  unmatchedWomen.map((woman, index) => {
                const isWomanCouple = isCouple(woman);
                const isWomanClient = isClient(woman);
                    const isWomanDiscount = woman.registrationType === 'single-female-discount' || woman.registrationType === 'female_discount';
                const showingMatchList = showManualMatchFor === woman.phoneNumber;
                
                return (
                  <div key={index}>
                    <div className={`unmatched-card ${
                      isWomanClient ? 'unmatched-card--client' :
                      isWomanCouple ? 'unmatched-card--couple' :
                          'unmatched-card--default'
                    }`}>
                      <div className="unmatched-card__content">
                        <div className="unmatched-card__info">
                          <div className="unmatched-card__header">
                            <PersonAvatar phoneNumber={woman.phoneNumber} emoji="👩" className="unmatched-card__icon" />
                            <strong className={`unmatched-card__name ${
                              isWomanClient ? 'unmatched-card__name--client' : ''
                            }`}>{woman.fullName || woman.userName || '-'}</strong>
                                {isWomanClient && (
                                  <span className="unmatched-card__badge unmatched-card__badge--female">
                                    {t('admin.balanceTables.female')}
                                  </span>
                                )}
                                {isWomanDiscount && (
                                  <span className="unmatched-card__badge unmatched-card__badge--discount">
                                    💝
                                  </span>
                                )}
                            {isWomanClient ? (
                              <span className="unmatched-card__badge unmatched-card__badge--client">
                                {t('admin.balanceTables.client')}
                              </span>
                                ) : isWomanCouple && (
                              <span className="unmatched-card__badge unmatched-card__badge--couple">
                                💑
                              </span>
                            )}
                          </div>
                          <p className={`unmatched-card__details ${
                            isWomanClient ? 'unmatched-card__details--client' : ''
                          }`}><PhoneLink phone={woman.phoneNumber}>{woman.phoneNumber || '-'}</PhoneLink>{woman.telegramUsername && ` • @${woman.telegramUsername}`}</p>
                          {isWomanCouple && (woman.partnerName || woman.partnerPhone) && (
                            <p className="unmatched-card__details text-[#94A3B8] text-xs mt-1">
                              {t('admin.balanceTables.partner') || 'בן/בת זוג'}: {woman.partnerName || '-'}
                              {woman.partnerPhone && (
                                <><br /><PhoneLink phone={woman.partnerPhone}>{woman.partnerPhone}</PhoneLink></>
                              )}
                            </p>
                          )}
                        </div>
                        {!isWomanClient && !isWomanCouple && unmatchedMen.length > 0 && onManualMatch && (
                          <button
                            onClick={() => setShowManualMatchFor(showingMatchList ? null : woman.phoneNumber)}
                            className="manual-match-btn"
                            title={t('admin.balanceTables.addBalance') || 'הוסף איזון'}
                          >
                            <UserPlus size={14} />
                          </button>
                        )}
                      </div>
                      {showingMatchList && unmatchedMen.length > 0 && (
                        <div className="manual-match-dropdown">
                          <p className="manual-match-dropdown__title">{t('admin.balanceTables.selectMan') || 'בחר גבר להתאמה:'}</p>
                          <div className="manual-match-dropdown__list">
                            {unmatchedMen.map((man, manIndex) => (
                              <button
                                key={manIndex}
                                onClick={() => {
                                  if (onManualMatch) {
                                    onManualMatch(party.id, man, woman);
                                    setShowManualMatchFor(null);
                                  }
                                }}
                                className="manual-match-dropdown__item"
                              >
                                <span className="manual-match-dropdown__item-name">{man.fullName || man.userName || '-'}</span>
                                <span className="manual-match-dropdown__item-phone"><PhoneLink phone={man.phoneNumber}>{man.phoneNumber || ''}</PhoneLink></span>
                              </button>
                            ))}
                          </div>
                          <button
                            onClick={() => setShowManualMatchFor(null)}
                            className="manual-match-dropdown__cancel"
                          >
                            {t('admin.cancel') || 'ביטול'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }).filter(item => item !== null)
            )}
          </div>
        </div>
      </div>
        </div>
      )}

      {clients.length > 0 && (
        <div className="not-registered-section">
          <h6 className="not-registered-section__title">{t('admin.balanceTables.notRegisteredUsers')}</h6>
          <div className="not-registered-section__list">
            {clients.map((client, index) => (
              <div key={index} className="not-registered-card">
                <div className="not-registered-card__info">
                  <div className="not-registered-card__header">
                    <strong className="not-registered-card__name">{client.fullName || client.userName || '-'}</strong>
                    <span className={`not-registered-card__badge ${
                      client.gender === 'male' ? 'not-registered-card__badge--male' : 
                      client.gender === 'female' ? 'not-registered-card__badge--female' : 
                      'not-registered-card__badge--unknown'
                    }`}>
                      {client.gender === 'male' ? t('admin.balanceTables.male') : client.gender === 'female' ? t('admin.balanceTables.female') : t('admin.balanceTables.notDefined')}
                    </span>
                  </div>
                  <p className="not-registered-card__details">
                    <PhoneLink phone={client.phoneNumber}>{client.phoneNumber || '-'}</PhoneLink>
                    {client.telegramUsername && ` • @${client.telegramUsername}`}
                  </p>
                </div>
                <div className="not-registered-card__actions">
                  {onConvertToUser && registeringClient === client.phoneNumber && (
                    <button disabled className="not-registered-card__register-btn">
                      <Loader size="small" />
                      <span>{t('admin.balanceTables.registering')}</span>
                    </button>
                  )}
                  {onConvertToUser && registeringClient !== client.phoneNumber && (
                    client.gender === 'female' ? (
                      // Women get free full access automatically — day/year
                      // is meaningless here, this just creates the account.
                      <button
                        onClick={() => onConvertToUser(client, 'year')}
                        className="not-registered-card__register-btn"
                        title="צור משתמש (גישה חינם לנשים)"
                      >
                        <UserPlus size={14} /> צור משתמש
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => onConvertToUser(client, 'day')}
                          className="not-registered-card__register-btn"
                          title="אישור חד פעמי למסיבה זו בלבד"
                        >
                          <CalendarCheck size={14} /> יום
                        </button>
                        <button
                          onClick={() => onConvertToUser(client, 'year')}
                          className="not-registered-card__register-btn"
                          title="מנוי מלא לשנה"
                        >
                          <Star size={14} /> שנה
                        </button>
                      </>
                    )
                  )}
                  {onDeleteClient && (
                    <button
                      onClick={async () => {
                        if (confirm(`${t('admin.balanceTables.confirmDeleteClient')} ${client.fullName || client.userName || t('admin.balanceTables.theClient')}?`)) {
                          await onDeleteClient(party.id, client);
                          if (onRefresh) onRefresh();
                        }
                      }}
                      className="not-registered-card__delete-btn"
                      title={t('admin.balanceTables.deleteClientTitle')}
                    >
                      <Trash2 size={14} /> {t('admin.balanceTables.delete')}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BalanceTables;
