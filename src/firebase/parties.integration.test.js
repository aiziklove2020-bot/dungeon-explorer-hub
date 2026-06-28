import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { 
  createParty, 
  getPartyById, 
  adminRegisterUserToParty, 
  adminRemoveUserFromParty,
  getBalanceMatches,
  createBalance,
  getActiveParties,
  deleteParty
} from './parties';
import { Timestamp, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from './config';

/**
 * Integration tests for adminRemoveUserFromParty with balance matching
 * These tests run against real Firebase and clean up after themselves
 */
describe('adminRemoveUserFromParty Integration Tests', () => {
  let testPartyId = null;
  const testPartyName = `TEST_PARTY_${Date.now()}`;
  const testUsers = {
    male1: { phone: '0501111111', name: 'Test Male 1', gender: 'male' },
    male2: { phone: '0502222222', name: 'Test Male 2', gender: 'male' },
    female1: { phone: '0503333333', name: 'Test Female 1', gender: 'female' },
    female2: { phone: '0504444444', name: 'Test Female 2', gender: 'female' }
  };

  // Create test party before all tests
  beforeAll(async () => {
    try {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30); // 30 days from now
      
      const partyData = {
        name: testPartyName,
        title: 'Test Party',
        description: 'Integration test party',
        date: futureDate,
        maleLimit: 100,
        femaleLimit: 100,
        partyType: 'internal'
      };

      const party = await createParty(partyData);
      testPartyId = party.id;
      console.log(`✅ Created test party: ${testPartyId}`);
    } catch (error) {
      console.error('❌ Failed to create test party:', error);
      throw error;
    }
  });

  // Clean up test party after all tests
  afterAll(async () => {
    if (testPartyId) {
      try {
        await deleteParty(testPartyId);
        console.log(`✅ Cleaned up test party: ${testPartyId}`);
      } catch (error) {
        console.error('❌ Failed to clean up test party:', error);
      }
    }
  });

  beforeEach(async () => {
    // Clean up registrations before each test
    if (testPartyId) {
      try {
        const party = await getPartyById(testPartyId);
        if (party && party.registrations && party.registrations.length > 0) {
          // Remove all registrations
          const partyRef = doc(db, 'parties', testPartyId);
          await updateDoc(partyRef, {
            registrations: [],
            balanceMatches: []
          });
        }
      } catch (error) {
        console.warn('Warning: Could not clean registrations:', error.message);
      }
    }
  });

  describe('Basic Removal Tests', () => {
    it('should remove user from party without balance', async () => {
      // Register a user
      await adminRegisterUserToParty(
        testPartyId,
        testUsers.male1.phone,
        testUsers.male1.name,
        testUsers.male1.gender
      );

      // Verify registration
      let party = await getPartyById(testPartyId);
      expect(party.registrations).toHaveLength(1);
      expect(party.registrations[0].phoneNumber).toBe(testUsers.male1.phone);

      // Remove user
      await adminRemoveUserFromParty(testPartyId, testUsers.male1.phone);

      // Verify removal
      party = await getPartyById(testPartyId);
      expect(party.registrations).toHaveLength(0);
      console.log('✅ Test 1 passed: Basic removal works');
    });

    it('should remove user by userId', async () => {
      // Register a user
      await adminRegisterUserToParty(
        testPartyId,
        testUsers.male1.phone,
        testUsers.male1.name,
        testUsers.male1.gender
      );

      let party = await getPartyById(testPartyId);
      const userId = party.registrations[0].userId;

      // Remove by userId
      await adminRemoveUserFromParty(testPartyId, userId);

      // Verify removal
      party = await getPartyById(testPartyId);
      expect(party.registrations).toHaveLength(0);
      console.log('✅ Test 2 passed: Removal by userId works');
    });
  });

  describe('Balance Unmatching Tests', () => {
    it('should automatically unmatch when removing a balanced user', async () => {
      // Register male and female
      await adminRegisterUserToParty(
        testPartyId,
        testUsers.male1.phone,
        testUsers.male1.name,
        testUsers.male1.gender,
        'single-male-balance'
      );

      await adminRegisterUserToParty(
        testPartyId,
        testUsers.female1.phone,
        testUsers.female1.name,
        testUsers.female1.gender,
        'single-female-balance'
      );

      // Create balance match
      await createBalance(testPartyId);

      // Verify balance was created
      let party = await getPartyById(testPartyId);
      const maleReg = party.registrations.find(r => r.phoneNumber === testUsers.male1.phone);
      const femaleReg = party.registrations.find(r => r.phoneNumber === testUsers.female1.phone);
      
      expect(maleReg.balancedWith).toBe(testUsers.female1.phone);
      expect(femaleReg.balancedWith).toBe(testUsers.male1.phone);

      const balanceMatches = await getBalanceMatches(testPartyId);
      expect(balanceMatches.length).toBeGreaterThan(0);
      const match = balanceMatches.find(m => 
        (m.malePhone === testUsers.male1.phone && m.femalePhone === testUsers.female1.phone) ||
        (m.malePhone === testUsers.female1.phone && m.femalePhone === testUsers.male1.phone)
      );
      expect(match).toBeDefined();

      console.log('✅ Balance created successfully');

      // Remove the male user
      await adminRemoveUserFromParty(testPartyId, testUsers.male1.phone);

      // Verify:
      // 1. Male is removed
      // 2. Female's balancedWith is removed
      // 3. Balance match is removed from balanceMatches
      party = await getPartyById(testPartyId);
      
      // Male should be removed
      const remainingMale = party.registrations.find(r => r.phoneNumber === testUsers.male1.phone);
      expect(remainingMale).toBeUndefined();

      // Female should still be there but without balancedWith
      const remainingFemale = party.registrations.find(r => r.phoneNumber === testUsers.female1.phone);
      expect(remainingFemale).toBeDefined();
      expect(remainingFemale.balancedWith).toBeUndefined();
      expect(remainingFemale.originalRegistrationType).toBe('single-female-balance');
      expect(remainingFemale.registrationType).toBe('single-female-balance');

      // Balance match should be removed
      const updatedBalanceMatches = await getBalanceMatches(testPartyId);
      const remainingMatch = updatedBalanceMatches.find(m => 
        (m.malePhone === testUsers.male1.phone && m.femalePhone === testUsers.female1.phone) ||
        (m.malePhone === testUsers.female1.phone && m.femalePhone === testUsers.male1.phone)
      );
      expect(remainingMatch).toBeUndefined();

      console.log('✅ Test 3 passed: Balance automatically unmatched when removing user');
    });

    it('should handle removal when partner is already removed', async () => {
      // Register both users
      await adminRegisterUserToParty(
        testPartyId,
        testUsers.male1.phone,
        testUsers.male1.name,
        testUsers.male1.gender,
        'single-male-balance'
      );

      await adminRegisterUserToParty(
        testPartyId,
        testUsers.female1.phone,
        testUsers.female1.name,
        testUsers.female1.gender,
        'single-female-balance'
      );

      // Create balance
      await createBalance(testPartyId);

      // Manually remove partner first (simulating edge case)
      const { getDoc } = await import('firebase/firestore');
      const partyRef = doc(db, 'parties', testPartyId);
      const partyDoc = await getDoc(partyRef);
      const partyData = partyDoc.data();
      
      let registrations = partyData.registrations.filter(r => r.phoneNumber !== testUsers.female1.phone);
      await updateDoc(partyRef, { registrations });

      // Now remove the male (who still has balancedWith pointing to removed female)
      await adminRemoveUserFromParty(testPartyId, testUsers.male1.phone);

      // Verify male is removed
      const party = await getPartyById(testPartyId);
      const remainingMale = party.registrations.find(r => r.phoneNumber === testUsers.male1.phone);
      expect(remainingMale).toBeUndefined();

      console.log('✅ Test 4 passed: Handles removal when partner already removed');
    });

    it('should preserve other balance matches when removing one user', async () => {
      // Register 2 males and 2 females
      await adminRegisterUserToParty(
        testPartyId,
        testUsers.male1.phone,
        testUsers.male1.name,
        testUsers.male1.gender,
        'single-male-balance'
      );

      await adminRegisterUserToParty(
        testPartyId,
        testUsers.male2.phone,
        testUsers.male2.name,
        testUsers.male2.gender,
        'single-male-balance'
      );

      await adminRegisterUserToParty(
        testPartyId,
        testUsers.female1.phone,
        testUsers.female1.name,
        testUsers.female1.gender,
        'single-female-balance'
      );

      await adminRegisterUserToParty(
        testPartyId,
        testUsers.female2.phone,
        testUsers.female2.name,
        testUsers.female2.gender,
        'single-female-balance'
      );

      // Create balance (should create 2 matches)
      await createBalance(testPartyId);

      let balanceMatches = await getBalanceMatches(testPartyId);
      expect(balanceMatches.length).toBeGreaterThanOrEqual(1);

      // Remove one user
      await adminRemoveUserFromParty(testPartyId, testUsers.male1.phone);

      // Verify:
      // 1. Removed user is gone
      // 2. Their partner is unmatched
      // 3. Other matches are preserved
      const party = await getPartyById(testPartyId);
      const remainingMale1 = party.registrations.find(r => r.phoneNumber === testUsers.male1.phone);
      expect(remainingMale1).toBeUndefined();

      // Find who was matched with male1
      const originalMatch = balanceMatches.find(m => m.malePhone === testUsers.male1.phone || m.femalePhone === testUsers.male1.phone);
      if (originalMatch) {
        const partnerPhone = originalMatch.malePhone === testUsers.male1.phone 
          ? originalMatch.femalePhone 
          : originalMatch.malePhone;
        
        const partner = party.registrations.find(r => r.phoneNumber === partnerPhone);
        if (partner) {
          expect(partner.balancedWith).toBeUndefined();
        }
      }

      // Other matches should still exist
      const updatedBalanceMatches = await getBalanceMatches(testPartyId);
      const otherMatches = updatedBalanceMatches.filter(m => 
        m.malePhone !== testUsers.male1.phone && m.femalePhone !== testUsers.male1.phone
      );
      
      // At least one other match should exist if there were 2 matches
      if (balanceMatches.length >= 2) {
        expect(otherMatches.length).toBeGreaterThan(0);
      }

      console.log('✅ Test 5 passed: Other balance matches preserved');
    });
  });

  describe('Edge Cases', () => {
    it('should handle removal of user without phone number', async () => {
      // Register user with userId only
      const { getDoc } = await import('firebase/firestore');
      const partyRef = doc(db, 'parties', testPartyId);
      
      const partyDoc = await getDoc(partyRef);
      const partyData = partyDoc.data();
      
      const registrationWithoutPhone = {
        userId: 'test-user-no-phone',
        userName: 'User No Phone',
        fullName: 'User No Phone',
        gender: 'male',
        registrationType: 'single-male-balance',
        registeredAt: Timestamp.now()
      };

      await updateDoc(partyRef, {
        registrations: [...(partyData.registrations || []), registrationWithoutPhone]
      });

      // Remove by userId
      await adminRemoveUserFromParty(testPartyId, 'test-user-no-phone');

      // Verify removal
      const party = await getPartyById(testPartyId);
      const remaining = party.registrations.find(r => r.userId === 'test-user-no-phone');
      expect(remaining).toBeUndefined();

      console.log('✅ Test 6 passed: Handles user without phone number');
    });

    it('should throw error when trying to remove non-existent user', async () => {
      await expect(
        adminRemoveUserFromParty(testPartyId, 'nonexistent-phone')
      ).rejects.toThrow('User not registered to this party');

      console.log('✅ Test 7 passed: Throws error for non-existent user');
    });

    it('should handle removal from party with no balance matches', async () => {
      // Register user
      await adminRegisterUserToParty(
        testPartyId,
        testUsers.male1.phone,
        testUsers.male1.name,
        testUsers.male1.gender
      );

      // Remove user
      await adminRemoveUserFromParty(testPartyId, testUsers.male1.phone);

      // Verify
      const party = await getPartyById(testPartyId);
      expect(party.registrations).toHaveLength(0);

      console.log('✅ Test 8 passed: Handles removal from party with no balance matches');
    });
  });

  describe('Data Consistency Tests', () => {
    it('should maintain data consistency after removal', async () => {
      // Create complex scenario: 2 balanced pairs
      await adminRegisterUserToParty(
        testPartyId,
        testUsers.male1.phone,
        testUsers.male1.name,
        testUsers.male1.gender,
        'single-male-balance'
      );

      await adminRegisterUserToParty(
        testPartyId,
        testUsers.male2.phone,
        testUsers.male2.name,
        testUsers.male2.gender,
        'single-male-balance'
      );

      await adminRegisterUserToParty(
        testPartyId,
        testUsers.female1.phone,
        testUsers.female1.name,
        testUsers.female1.gender,
        'single-female-balance'
      );

      await adminRegisterUserToParty(
        testPartyId,
        testUsers.female2.phone,
        testUsers.female2.name,
        testUsers.female2.gender,
        'single-female-balance'
      );

      await createBalance(testPartyId);

      const initialBalanceMatches = await getBalanceMatches(testPartyId);
      const initialRegistrations = (await getPartyById(testPartyId)).registrations;

      // Remove one user
      await adminRemoveUserFromParty(testPartyId, testUsers.male1.phone);

      // Verify consistency
      const finalParty = await getPartyById(testPartyId);
      const finalBalanceMatches = await getBalanceMatches(testPartyId);

      // No registration should have balancedWith pointing to removed user
      const hasInvalidBalance = finalParty.registrations.some(r => 
        r.balancedWith === testUsers.male1.phone
      );
      expect(hasInvalidBalance).toBe(false);

      // No balance match should include removed user
      const hasInvalidMatch = finalBalanceMatches.some(m => 
        m.malePhone === testUsers.male1.phone || m.femalePhone === testUsers.male1.phone
      );
      expect(hasInvalidMatch).toBe(false);

      // Remaining registrations should be valid
      finalParty.registrations.forEach(reg => {
        if (reg.balancedWith) {
          const partner = finalParty.registrations.find(r => 
            r.phoneNumber === reg.balancedWith || r.userId === reg.balancedWith
          );
          expect(partner).toBeDefined();
        }
      });

      console.log('✅ Test 9 passed: Data consistency maintained');
    });
  });
});

