import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { registrationBlockedReason, normalizeRegistrationMode } from '../../shared/registrationAccess.js';

// The same rule is copied into public/assets/site-data.js (no imports there): run that copy too.
const src = readFileSync(new URL('../../public/assets/site-data.js', import.meta.url), 'utf8');
const start = src.indexOf('function lpRegistrationBlockedReason_');
const body = src.slice(start, src.indexOf('\n}\n', start) + 3);
const siteRule = new Function(`${body}; return lpRegistrationBlockedReason_;`)();

describe.each([['shared', registrationBlockedReason], ['site-data copy', siteRule]])('registration rule (%s)', (_, rule) => {
  it('is open by default, with no automatic closing time', () => {
    expect(rule({})).toBeNull();
    expect(rule({ registrationMode: 'auto' })).toBeNull();
    expect(rule({ registrationMode: 'open' })).toBeNull();
    expect(rule({ registrationMode: 'weird' })).toBeNull();
  });
  it('closes only when closed by hand', () => {
    expect(rule({ registrationMode: 'closed' })).toContain('סגורה');
  });
});

it('normalizes the mode', () => {
  expect(normalizeRegistrationMode('open')).toBe('open');
  expect(normalizeRegistrationMode('closed')).toBe('closed');
  expect(normalizeRegistrationMode(undefined)).toBe('auto');
});
