import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('../../i18n/LanguageContext', () => ({ useLanguage: () => ({ t: (k) => k }) }));
vi.mock('../ImageUpload', () => ({ default: () => null }));
vi.mock('../Loader', () => ({ default: () => null }));

const { default: PartyEditor } = await import('./PartyEditor');

const LABEL = 'לאפשר גם הרשמה דרך האתר (זוגות וסינגלים לאיזון מגדרי)';
const render = (party) =>
  renderToStaticMarkup(<PartyEditor party={{ date: new Date(2030, 0, 1), ...party }} onSave={() => {}} onCancel={() => {}} />);

describe('PartyEditor gender-balance opt-in for external parties', () => {
  it('shows the checkbox, checked, for an opted-in external party', () => {
    const html = render({ partyType: 'external', registrationLink: 'https://t.example', allowBalanceRegistration: true });
    expect(html).toContain(LABEL);
    expect(html).toMatch(/<input type="checkbox"[^>]*checked=""[^>]*>\s*<span>לאפשר גם הרשמה/);
  });

  it('shows it unchecked for an external party that has not opted in', () => {
    const html = render({ partyType: 'external', registrationLink: 'https://t.example' });
    expect(html).toContain(LABEL);
    expect(html).not.toMatch(/<input type="checkbox"[^>]*checked=""[^>]*>\s*<span>לאפשר גם הרשמה/);
  });

  it('does not show it for an internal party', () => {
    expect(render({ partyType: 'internal' })).not.toContain(LABEL);
  });
});
