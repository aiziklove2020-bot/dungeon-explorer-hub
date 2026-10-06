import { describe, it, expect } from 'vitest';
import { applyAgentCommand } from '../../shared/agentCommands.js';
import { TIKTOK_PACK } from '../../shared/tiktokPack.js';

describe('tiktok agent', () => {
  it('has a ready pack with caption under Telegram limits and no tracking tags', () => {
    expect(TIKTOK_PACK.length).toBeGreaterThanOrEqual(8);
    for (const p of TIKTOK_PACK) {
      expect(p.image).toMatch(/^https:\/\/www\.libralparty\.net\/assets\/tiktok\/t\d+\.jpg$/);
      expect(p.caption.length).toBeLessThan(800);
      expect(p.caption).not.toMatch(/utm_|https?:\/\//);
    }
  });
  it('takes days, pause and run-now commands', () => {
    expect(applyAgentCommand('tiktok', 'תעבוד רק בימי ראשון וחמישי', {}).config.days).toEqual([0, 4]);
    expect(applyAgentCommand('tiktok', 'תעצור', {}).config.paused).toBe(true);
    expect(applyAgentCommand('tiktok', 'תכין לי פוסט עכשיו', {}).runNow).toBe('tiktok');
  });
});

describe('notifier (איתי) manual push', () => {
  it('runs a push now when asked to send notifications', () => {
    expect(applyAgentCommand('notifier', 'תשלח התראות על מסיבות חדשות', {}).runNow).toBe('push');
    expect(applyAgentCommand('notifier', 'שלח התראה עכשיו', {}).runNow).toBe('push');
  });
});
