import { describe, it, expect } from 'vitest';
import {
  REG_TYPES,
  isCoupleRegType,
  isFemaleRegType,
  needsPickupAddress,
  createInitialFormData,
  resetFormForType,
  REGISTRATION_TYPE_BACKEND_MAP,
  resolveGender,
} from './formTypes';

describe('formTypes helpers', () => {
  it('isCoupleRegType is true only for "couple"', () => {
    expect(isCoupleRegType(REG_TYPES.COUPLE)).toBe(true);
    expect(isCoupleRegType('single_female')).toBe(false);
    expect(isCoupleRegType('')).toBe(false);
  });

  it('isFemaleRegType covers all legacy female ids', () => {
    for (const id of [
      'single_female',
      'single-female-balance',
      'single-female-discount',
      'female_discount',
    ]) {
      expect(isFemaleRegType(id)).toBe(true);
    }
    expect(isFemaleRegType('single_male')).toBe(false);
    expect(isFemaleRegType('couple')).toBe(false);
  });

  it('needsPickupAddress only when female + pickup', () => {
    expect(
      needsPickupAddress({ regType: 'single_female', arrivalMethod: 'pickup' })
    ).toBe(true);
    expect(
      needsPickupAddress({ regType: 'single_female', arrivalMethod: 'independent' })
    ).toBe(false);
    expect(
      needsPickupAddress({ regType: 'single_male', arrivalMethod: 'pickup' })
    ).toBe(false);
  });

  it('createInitialFormData seeds selectedParties from partyId', () => {
    expect(createInitialFormData('p1').selectedParties).toEqual(['p1']);
    expect(createInitialFormData(undefined).selectedParties).toEqual([]);
  });

  it('resetFormForType keeps only partyId seed + regType', () => {
    const out = resetFormForType('couple', 'p2');
    expect(out.regType).toBe('couple');
    expect(out.selectedParties).toEqual(['p2']);
    expect(out.fullName).toBe('');
    expect(out.malePhone).toBe('');
  });

  it('resolveGender covers legacy variants and unknowns', () => {
    expect(resolveGender('single_male')).toBe('male');
    expect(resolveGender('single-female-balance')).toBe('female');
    expect(resolveGender('couple')).toBe('couple');
    expect(resolveGender('unknown-female-flavor')).toBe('female');
    expect(resolveGender('unknown-male-flavor')).toBe('male');
    expect(resolveGender('')).toBe('male');
  });

  it('backend map is idempotent for canonical ids', () => {
    expect(REGISTRATION_TYPE_BACKEND_MAP['single-male-balance']).toBe(
      'single-male-balance'
    );
    expect(REGISTRATION_TYPE_BACKEND_MAP.couple).toBe('couple');
  });
});
