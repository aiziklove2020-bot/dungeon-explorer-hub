import { describe, it, expect } from 'vitest';
import { cleanPhone, isValidIsraeliPhone, normalizeIsraeliPhone } from './phone';

describe('cleanPhone', () => {
  it('strips everything that is not a digit', () => {
    expect(cleanPhone('050-123-4567')).toBe('0501234567');
    expect(cleanPhone(' 050 123 4567 ')).toBe('0501234567');
    expect(cleanPhone('+972-50-123-4567')).toBe('972501234567');
  });

  it('handles nullish input safely', () => {
    expect(cleanPhone(undefined)).toBe('');
    expect(cleanPhone(null)).toBe('');
    expect(cleanPhone('')).toBe('');
  });

  it('coerces non-strings to string before stripping', () => {
    expect(cleanPhone(501234567)).toBe('501234567');
  });
});

describe('isValidIsraeliPhone', () => {
  it.each([
    '0501234567',
    '0521234567',
    '0541234567',
    '0581234567'
  ])('accepts valid 05x mobile %s', (n) => {
    expect(isValidIsraeliPhone(n)).toBe(true);
  });

  it('accepts formatted input that cleans to a valid number', () => {
    expect(isValidIsraeliPhone('050-123-4567')).toBe(true);
    expect(isValidIsraeliPhone(' 050 123 4567 ')).toBe(true);
  });

  it.each([
    '',
    '050',
    '050123456',     // 9 digits
    '05012345678',   // 11 digits
    '0301234567',    // does not start with 05
    '+972501234567'  // includes country code, not the canonical 10-digit form
  ])('rejects invalid phone %s', (n) => {
    expect(isValidIsraeliPhone(n)).toBe(false);
  });

  it('handles nullish input safely', () => {
    expect(isValidIsraeliPhone(undefined)).toBe(false);
    expect(isValidIsraeliPhone(null)).toBe(false);
  });
});

describe('normalizeIsraeliPhone', () => {
  it('leaves an already-local number untouched', () => {
    expect(normalizeIsraeliPhone('0501234567')).toBe('0501234567');
  });

  it('converts the standard 972 international prefix (12 digits)', () => {
    expect(normalizeIsraeliPhone('+972501234567')).toBe('0501234567');
    expect(normalizeIsraeliPhone('972-50-123-4567')).toBe('0501234567');
  });

  it('converts a 972 prefix with a stray leading 0 kept on the mobile part (13 digits)', () => {
    expect(normalizeIsraeliPhone('+972-050-1234567')).toBe('0501234567');
  });

  it('strips the 00 international access prefix before the country code (14 digits)', () => {
    expect(normalizeIsraeliPhone('00972501234567')).toBe('0501234567');
    expect(normalizeIsraeliPhone('00-972-050-1234567')).toBe('0501234567');
  });

  it('handles nullish/empty input safely', () => {
    expect(normalizeIsraeliPhone(undefined)).toBe('');
    expect(normalizeIsraeliPhone(null)).toBe('');
    expect(normalizeIsraeliPhone('')).toBe('');
  });
});
