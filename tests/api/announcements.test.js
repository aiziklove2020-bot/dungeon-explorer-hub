import { describe, it, expect } from 'vitest';
import { ANNOUNCEMENTS } from '../../shared/announcements.js';

describe('announcements', () => {
  it('each has a unique id, an https image under the site and a caption that fits a photo caption', () => {
    const ids = ANNOUNCEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const a of ANNOUNCEMENTS) {
      expect(a.image).toMatch(/^https:\/\/www\.libralparty\.net\/assets\/campaigns\/[\w-]+\.jpg$/);
      expect(a.caption.length).toBeLessThanOrEqual(1000);
    }
  });
  it('nothing about memberships or signing up on the site is announced', () => {
    for (const a of ANNOUNCEMENTS) {
      expect(a.caption).not.toMatch(/מנוי|\/register|\/membership/);
    }
  });
});
