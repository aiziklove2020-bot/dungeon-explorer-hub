import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createBalanceForParty } from './balanceMatching';

/**
 * Unit tests for couple registration and matching logic.
 * No DB writes - uses in-memory mock data only.
 */

const createUsersMap = (phones) => {
  const map = new Map();
  phones.forEach(p => map.set(p, { phoneNumber: p, level: 'registered' }));
  return map;
};

describe('balanceMatching - couples', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('couples can be registered and matched', () => {
    it('should match a couple as a couple (isCouple: true)', async () => {
      const coupleId = 'couple_test_123';
      const malePhone = '0501111111';
      const femalePhone = '0502222222';
      const usersMap = createUsersMap([malePhone, femalePhone]);

      const registrations = [
        {
          fullName: 'David',
          phoneNumber: malePhone,
          gender: 'male',
          registrationType: 'couple',
          coupleId,
          partnerName: 'Sara',
          partnerPhone: femalePhone
        },
        {
          fullName: 'Sara',
          phoneNumber: femalePhone,
          gender: 'female',
          registrationType: 'couple',
          coupleId,
          partnerName: 'David',
          partnerPhone: malePhone
        }
      ];

      const matches = await createBalanceForParty(registrations, usersMap);

      const coupleMatch = matches.find(m => m.isCouple && m.coupleId === coupleId);
      expect(coupleMatch).toBeDefined();
      expect(coupleMatch.isMatched).toBe(true);
      expect(coupleMatch.malePhone).toBe(malePhone);
      expect(coupleMatch.femalePhone).toBe(femalePhone);
      expect(coupleMatch.maleName).toBe('David');
      expect(coupleMatch.femaleName).toBe('Sara');
    });
  });

  describe('couple can be split - remaining partner becomes matchable', () => {
    it('when male is removed, female becomes single-female-balance and can be matched', async () => {
      const coupleId = 'couple_split_1';
      const malePhone = '0503333333';
      const femalePhone = '0504444444';
      const otherMalePhone = '0505555555';
      const usersMap = createUsersMap([malePhone, femalePhone, otherMalePhone]);

      // Simulate: couple was registered, then male was removed.
      // Partner (female) was converted to single-female-balance.
      const registrationsAfterMaleRemoved = [
        {
          fullName: 'Sara',
          phoneNumber: femalePhone,
          gender: 'female',
          registrationType: 'single-female-balance' // converted from couple
        },
        {
          fullName: 'Other Man',
          phoneNumber: otherMalePhone,
          gender: 'male',
          registrationType: 'single-male-balance'
        }
      ];

      const matches = await createBalanceForParty(registrationsAfterMaleRemoved, usersMap);

      const balanceMatch = matches.find(m =>
        m.malePhone === otherMalePhone && m.femalePhone === femalePhone && !m.isCouple
      );
      expect(balanceMatch).toBeDefined();
      expect(balanceMatch.isMatched).toBe(true);
    });

    it('when female is removed, male becomes single-male-balance and can be matched', async () => {
      const femalePhone = '0506666666';
      const malePhone = '0507777777';
      const otherFemalePhone = '0508888888';
      const usersMap = createUsersMap([malePhone, femalePhone, otherFemalePhone]);

      // Simulate: couple was registered, then female was removed.
      // Partner (male) was converted to single-male-balance.
      const registrationsAfterFemaleRemoved = [
        {
          fullName: 'David',
          phoneNumber: malePhone,
          gender: 'male',
          registrationType: 'single-male-balance' // converted from couple
        },
        {
          fullName: 'Other Woman',
          phoneNumber: otherFemalePhone,
          gender: 'female',
          registrationType: 'single-female-balance'
        }
      ];

      const matches = await createBalanceForParty(registrationsAfterFemaleRemoved, usersMap);

      const balanceMatch = matches.find(m =>
        m.malePhone === malePhone && m.femalePhone === otherFemalePhone && !m.isCouple
      );
      expect(balanceMatch).toBeDefined();
      expect(balanceMatch.isMatched).toBe(true);
    });
  });

  describe('create match for remaining partner after couple split', () => {
    it('female remaining from couple can be manually matched with another male', async () => {
      const femaleFromCouple = '0509999999';
      const newMale = '0510000000';
      const usersMap = createUsersMap([femaleFromCouple, newMale]);

      const registrations = [
        {
          fullName: 'Sara (was in couple)',
          phoneNumber: femaleFromCouple,
          gender: 'female',
          registrationType: 'single-female-balance'
        },
        {
          fullName: 'New Male',
          phoneNumber: newMale,
          gender: 'male',
          registrationType: 'single-male-balance'
        }
      ];

      const matches = await createBalanceForParty(registrations, usersMap);

      expect(matches.some(m => m.isMatched && m.femalePhone === femaleFromCouple && m.malePhone === newMale)).toBe(true);
    });
  });
});
