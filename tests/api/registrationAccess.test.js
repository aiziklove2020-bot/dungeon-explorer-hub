import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { registrationBlockedReason, normalizeRegistrationMode } from '../../shared/registrationAccess.js';

// The same rules are copied into public/assets/site-data.js (no imports there): run that copy too.
const src = readFileSync(new URL('../../public/assets/site-data.js', import.meta.url), 'utf8');
const start = src.indexOf('function lpRegistrationBlockedReason_');
const body = src.slice(start, src.indexOf('\n}\n', start) + 3);
const coupleFn = 'function lpIsCoupleRegType_(e) { return e === "couple" || e === "single-male-couple" || e === "single-female-couple"; }';
const siteRule = new Function(`${coupleFn}\n${body}; return lpRegistrationBlockedReason_;`)();

const types = ['couple', 'single-male-couple', 'single-female-couple', 'single-female-balance', 'single-female-discount', 'single-male-balance'];

describe.each([['shared', registrationBlockedReason], ['site-data copy', siteRule]])('registration rules (%s)', (_, rule) => {
  it('auto: after the cutoff only single men are blocked', () => {
    for (const t of types) {
      const blocked = rule({}, t, true);
      expect(Boolean(blocked)).toBe(t === 'single-male-balance');
      expect(rule({}, t, false)).toBeNull();
    }
  });
  it('open by hand: nobody is blocked, even after the cutoff', () => {
    for (const t of types) expect(rule({ registrationMode: 'open' }, t, true)).toBeNull();
  });
  it('closed by hand: everybody is blocked, even before the cutoff', () => {
    for (const t of types) expect(rule({ registrationMode: 'closed' }, t, false)).toContain('סגורה');
  });
  it('unknown mode behaves like auto', () => {
    expect(rule({ registrationMode: 'weird' }, 'single-male-balance', true)).toBeTruthy();
    expect(rule({ registrationMode: 'weird' }, 'single-female-balance', true)).toBeNull();
  });
});

it('normalizes the mode', () => {
  expect(normalizeRegistrationMode('open')).toBe('open');
  expect(normalizeRegistrationMode('closed')).toBe('closed');
  expect(normalizeRegistrationMode(undefined)).toBe('auto');
});
