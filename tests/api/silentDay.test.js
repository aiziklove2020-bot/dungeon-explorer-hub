import { describe, it, expect } from 'vitest';
import { isSilentDay, israelDate, NON_PUBLISHING_JOBS } from '../../shared/silentDay.js';

describe('silent day', () => {
  it('is silent on 7 October 2026 (Israel time) only', () => {
    expect(isSilentDay(new Date('2026-10-07T03:00:00Z'))).toBe(true);
    expect(isSilentDay(new Date('2026-10-06T20:30:00Z'))).toBe(false); // 23:30 Israel, still the 6th
    expect(isSilentDay(new Date('2026-10-06T21:30:00Z'))).toBe(true); // 00:30 Israel on the 7th
    expect(isSilentDay(new Date('2026-10-07T21:30:00Z'))).toBe(false); // 00:30 on the 8th in Israel
    expect(isSilentDay(new Date('2026-10-08T09:00:00Z'))).toBe(false);
  });
  it('publishing jobs are not in the non-publishing list', () => {
    for (const j of ['promo', 'promo-now', 'campaign', 'tiktok', 'push-now', 'manual-post', 'notify-new-party', 'test-group']) {
      expect(NON_PUBLISHING_JOBS.has(j)).toBe(false);
    }
    expect(israelDate(new Date('2026-10-07T03:00:00Z'))).toBe('2026-10-07');
  });
});

describe('agents back on, publisher paused', () => {
  it('the global kill switch is off and only the channel publisher stays silent', async () => {
    const prev = process.env.SILENT_DAYS_OFF;
    delete process.env.SILENT_DAYS_OFF;
    const { isSiteClosed, PUBLISHER_PAUSED } = await import('../../shared/silentDay.js');
    expect(isSiteClosed()).toBe(false);
    expect(PUBLISHER_PAUSED).toBe(true);
    process.env.SILENT_DAYS_OFF = prev;
  });
});
