import { describe, it, expect } from 'vitest';
import { EMPTY_FORM_DATA } from './formTypes';
import { getValidationErrors, isFormValid } from './validation';

function single(overrides = {}) {
  return {
    ...EMPTY_FORM_DATA,
    regType: 'single_male',
    fullName: 'Alice',
    phone: '0501234567',
    selectedParties: ['p1'],
    ...overrides,
  };
}

function couple(overrides = {}) {
  return {
    ...EMPTY_FORM_DATA,
    regType: 'couple',
    maleName: 'Bob',
    malePhone: '0502223333',
    femaleName: 'Ann',
    femalePhone: '0504445555',
    selectedParties: ['p1'],
    ...overrides,
  };
}

describe('getValidationErrors — single', () => {
  it('passes a fully-valid single form', () => {
    expect(getValidationErrors(single())).toEqual({});
    expect(isFormValid(single())).toBe(true);
  });

  it('flags missing fullName', () => {
    expect(getValidationErrors(single({ fullName: '   ' })).fullName).toBe(true);
  });

  it('flags invalid phone formats', () => {
    expect(getValidationErrors(single({ phone: '' })).phone).toBe(true);
    expect(getValidationErrors(single({ phone: '050123456' })).phone).toBe(true); // too short
    expect(getValidationErrors(single({ phone: '0601234567' })).phone).toBe(true); // wrong prefix
  });

  it('flags empty party selection', () => {
    expect(getValidationErrors(single({ selectedParties: [] })).parties).toBe(true);
  });

  it('requires pickupAddress when female + pickup is selected', () => {
    const f = single({
      regType: 'single_female',
      arrivalMethod: 'pickup',
      pickupAddress: '',
    });
    expect(getValidationErrors(f).pickupAddress).toBe(true);
  });

  it('does not require pickupAddress when arrivalMethod=independent', () => {
    const f = single({
      regType: 'single_female',
      arrivalMethod: 'independent',
      pickupAddress: '',
    });
    expect(getValidationErrors(f).pickupAddress).toBeUndefined();
  });
});

describe('getValidationErrors — couple', () => {
  it('passes a fully-valid couple form', () => {
    expect(getValidationErrors(couple())).toEqual({});
  });

  it('flags missing partner names', () => {
    const errs = getValidationErrors(couple({ maleName: '', femaleName: '' }));
    expect(errs.maleName).toBe(true);
    expect(errs.femaleName).toBe(true);
  });

  it('flags invalid partner phones', () => {
    const errs = getValidationErrors(
      couple({ malePhone: '123', femalePhone: '0601112222' })
    );
    expect(errs.malePhone).toBe(true);
    expect(errs.femalePhone).toBe(true);
  });

  it('flags coupleSamePhone when both are valid but identical', () => {
    const errs = getValidationErrors(
      couple({ malePhone: '0501234567', femalePhone: '0501234567' })
    );
    expect(errs.coupleSamePhone).toBe(true);
  });

  it('ignores coupleSamePhone when at least one phone is invalid', () => {
    const errs = getValidationErrors(couple({ malePhone: 'x', femalePhone: 'x' }));
    expect(errs.coupleSamePhone).toBeUndefined();
  });
});
