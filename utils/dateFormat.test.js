import { describe, it, expect } from 'vitest';
import { toDate, formatDate, formatDateTime, formatDateLong } from './dateFormat';

describe('toDate', () => {
  it('returns null for null/undefined/empty', () => {
    expect(toDate(null)).toBeNull();
    expect(toDate(undefined)).toBeNull();
    expect(toDate('')).toBeNull();
  });

  it('returns the same Date for a valid Date', () => {
    const d = new Date('2026-04-12T10:00:00Z');
    expect(toDate(d)).toBe(d);
  });

  it('returns null for an invalid Date', () => {
    expect(toDate(new Date('not-a-date'))).toBeNull();
  });

  it('handles Firestore Timestamp-like objects (toDate())', () => {
    const ts = { toDate: () => new Date('2026-04-12T10:00:00Z') };
    expect(toDate(ts)?.toISOString()).toBe('2026-04-12T10:00:00.000Z');
  });

  it('handles { seconds } snapshot literals', () => {
    const ts = { seconds: 1776160800, nanoseconds: 0 };
    expect(toDate(ts)?.getTime()).toBe(1776160800 * 1000);
  });

  it('handles ISO strings and epoch ms', () => {
    expect(toDate('2026-04-12T10:00:00Z')?.toISOString()).toBe('2026-04-12T10:00:00.000Z');
    expect(toDate(0)?.toISOString()).toBe('1970-01-01T00:00:00.000Z');
  });

  it('returns null for unparsable strings', () => {
    expect(toDate('not-a-date')).toBeNull();
  });

  it('returns null when toDate() throws', () => {
    const ts = {
      toDate: () => {
        throw new Error('bad');
      }
    };
    expect(toDate(ts)).toBeNull();
  });
});

describe('format helpers', () => {
  // Locale output is environment-dependent for non-en locales; assert the
  // helpers (a) return a non-empty string for valid input, and (b) return ''
  // for falsy input.
  it('formatDate returns "" for falsy input and a string for valid input', () => {
    expect(formatDate(null)).toBe('');
    expect(formatDate('')).toBe('');
    expect(formatDate('2026-04-12T10:00:00Z').length).toBeGreaterThan(0);
  });

  it('formatDateTime returns "" for falsy input and a string for valid input', () => {
    expect(formatDateTime(null)).toBe('');
    expect(formatDateTime('2026-04-12T10:00:00Z').length).toBeGreaterThan(0);
  });

  it('formatDateLong returns "" for falsy input and a string for valid input', () => {
    expect(formatDateLong(null)).toBe('');
    expect(formatDateLong('2026-04-12T10:00:00Z').length).toBeGreaterThan(0);
  });
});
