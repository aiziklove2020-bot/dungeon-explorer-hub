

export const createBalanceForParty = async (registrations, usersByPhone) => {
  if (!registrations || registrations.length === 0) {
    return [];
  }

  const couples = registrations.filter(reg => 
    reg.registrationType === 'couple' || reg.gender === 'couple' || reg.coupleId
  );

  const couplesByCoupleId = {};
  couples.forEach(couple => {
    if (couple.coupleId) {
      if (!couplesByCoupleId[couple.coupleId]) {
        couplesByCoupleId[couple.coupleId] = [];
      }
      couplesByCoupleId[couple.coupleId].push(couple);
    }
  });

  // usersByPhone is a Map of phoneNumber -> user
  // If not provided, load all users once
  let usersMap = usersByPhone;
  if (!usersMap || !(usersMap instanceof Map)) {
    const { getAllUsers } = await import('../firebase/users');
    const allUsers = await getAllUsers();
    usersMap = new Map();
    allUsers.forEach(user => {
      if (user.phoneNumber) {
        usersMap.set(user.phoneNumber, user);
      }
    });
  }

  const userExistsInUsersTable = (phoneNumber) => {
    if (!phoneNumber) return false;
    const user = usersMap.get(phoneNumber);
    return user !== null && user !== undefined;
  };

  const isClient = (reg) => {
    if (!reg) return true; 

    const isNotCouple = reg.registrationType !== 'couple' && 
                        reg.gender !== 'couple';
    
    if (!isNotCouple) return false;

    const existsInUsersTable = userExistsInUsersTable(reg.phoneNumber);

    return !existsInUsersTable;
  };

  const isRegisteredUser = (reg) => {
    if (!reg) return false; 

    const isNotCouple = reg.registrationType !== 'couple' && 
                        reg.gender !== 'couple';
    
    if (!isNotCouple) return false;

    const existsInUsersTable = userExistsInUsersTable(reg.phoneNumber);

    return existsInUsersTable;
  };

  const singleMen = registrations.filter(reg => {
    if (!reg) return false;

    const isMale = reg.registrationType === 'single-male-balance' || reg.gender === 'male';
    if (!isMale) return false;

    const isNotCouple = reg.registrationType !== 'couple' && reg.gender !== 'couple';
    if (!isNotCouple) return false;

    const isRegistered = isRegisteredUser(reg);
    if (!isRegistered) {
      return false;
    }

    const isNotClient = !isClient(reg);
    if (!isNotClient) {
      return false;
    }
    
    return true;
  });

  const singleWomen = registrations.filter(reg => {
    if (!reg) return false;

    const isFemale = reg.registrationType === 'single-female-balance' || 
                     reg.registrationType === 'single-female-discount' ||
                     reg.gender === 'female';
    if (!isFemale) return false;

    const isNotCouple = reg.registrationType !== 'couple' && reg.gender !== 'couple';
    if (!isNotCouple) return false;

    const isRegistered = isRegisteredUser(reg);
    if (!isRegistered) {
      return false;
    }

    const isNotClient = !isClient(reg);
    if (!isNotClient) {
      return false;
    }
    
    return true;
  });

  const matches = [];

  Object.values(couplesByCoupleId).forEach(coupleGroup => {
    const maleCouple = coupleGroup.find(c => c.gender === 'male');
    const femaleCouple = coupleGroup.find(c => c.gender === 'female');
    
    if (maleCouple && femaleCouple) {
      matches.push({
        partyId: maleCouple.partyId || null,
        partyName: maleCouple.partyName || null,
        maleName: maleCouple.fullName || maleCouple.userName || '',
        malePhone: maleCouple.phoneNumber || '',
        maleTelegram: maleCouple.telegramUsername || '',
        femaleName: femaleCouple.fullName || femaleCouple.userName || '',
        femalePhone: femaleCouple.phoneNumber || '',
        femaleTelegram: femaleCouple.telegramUsername || '',
        isCouple: true,
        isMatched: true,
        matchType: 'couple',
        coupleId: maleCouple.coupleId,
        registrationId: maleCouple.id || null
      });
    }
  });

  couples.forEach(couple => {
    
    if (couple.coupleId && couplesByCoupleId[couple.coupleId]) {
      return;
    }

    const fullName = couple.fullName || couple.userName || '';
    const partnerName = couple.partnerName || '';

    let maleName = fullName;
    let femaleName = partnerName;
    
    if (fullName.includes('&') || fullName.includes('ו')) {
      const names = fullName.split(/[&ו]/).map(n => n.trim()).filter(n => n);
      if (names.length >= 2) {
        maleName = names[0];
        femaleName = names[1];
      } else if (names.length === 1) {
        maleName = names[0];
        femaleName = partnerName || 'זוג';
      }
    }
    
    matches.push({
      partyId: couple.partyId || null,
      partyName: couple.partyName || null,
      maleName: maleName || 'זוג',
      malePhone: couple.phoneNumber || '',
      maleTelegram: couple.telegramUsername || '',
      femaleName: femaleName || 'זוג',
      femalePhone: couple.partnerPhone || '',
      femaleTelegram: '',
      femalePickupAddress: couple.pickupAddress || '', 
      isCouple: true,
      isMatched: true,
      matchType: 'couple',
      registrationId: couple.id || null
    });
  });

  const minMatches = Math.min(singleMen.length, singleWomen.length);
  
  for (let i = 0; i < minMatches; i++) {
    const man = singleMen[i];
    const woman = singleWomen[i];

    const manIsMale = man.gender === 'male' || man.registrationType === 'single-male-balance';
    const womanIsFemale = woman.gender === 'female' || 
                          woman.registrationType === 'single-female-balance' || 
                          woman.registrationType === 'single-female-discount';
    
    if (!manIsMale || !womanIsFemale) {
      continue; 
    }

    const manIsClient = isClient(man);
    const womanIsClient = isClient(woman);
    if (manIsClient || womanIsClient) {
      continue; 
    }

    const manExists = userExistsInUsersTable(man.phoneNumber);
    const womanExists = userExistsInUsersTable(woman.phoneNumber);
    if (!manExists || !womanExists) {
      continue; 
    }
    
    matches.push({
      partyId: man.partyId || woman.partyId || null,
      partyName: man.partyName || woman.partyName || null,
      maleName: man.fullName || man.userName || '',
      malePhone: man.phoneNumber || '',
      maleTelegram: man.telegramUsername || '',
      femaleName: woman.fullName || woman.userName || '',
      femalePhone: woman.phoneNumber || '',
      femaleTelegram: woman.telegramUsername || '',
      femalePickupAddress: woman.pickupAddress || '', 
      isCouple: false,
      isMatched: true,
      matchType: 'balance',
      maleRegistrationId: man.id || null,
      femaleRegistrationId: woman.id || null
    });
  }

  for (let i = minMatches; i < singleMen.length; i++) {
    const man = singleMen[i];

    const manIsClient = isClient(man);
    if (manIsClient) {
      continue; 
    }

    const manExists = userExistsInUsersTable(man.phoneNumber);
    if (!manExists) {
      continue; 
    }
    
    matches.push({
      partyId: man.partyId || null,
      partyName: man.partyName || null,
      maleName: man.fullName || man.userName || '',
      malePhone: man.phoneNumber || '',
      maleTelegram: man.telegramUsername || '',
      femaleName: '',
      femalePhone: '',
      femaleTelegram: '',
      isCouple: false,
      isMatched: false,
      matchType: 'unmatched',
      maleRegistrationId: man.id || null
    });
  }

  for (let i = minMatches; i < singleWomen.length; i++) {
    const woman = singleWomen[i];

    const womanIsClient = isClient(woman);
    if (womanIsClient) {
      continue; 
    }

    const womanExists = userExistsInUsersTable(woman.phoneNumber);
    if (!womanExists) {
      continue; 
    }
    
    matches.push({
      partyId: woman.partyId || null,
      partyName: woman.partyName || null,
      maleName: '',
      malePhone: '',
      maleTelegram: '',
      femaleName: woman.fullName || woman.userName || '',
      femalePhone: woman.phoneNumber || '',
      femaleTelegram: woman.telegramUsername || '',
      femalePickupAddress: woman.pickupAddress || '', 
      isCouple: false,
      isMatched: false,
      matchType: 'unmatched',
      femaleRegistrationId: woman.id || null
    });
  }

  return matches;
};
