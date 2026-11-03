import { describe, it, expect } from 'vitest';
import { applyAgentCommand, parseDays } from '../../shared/agentCommands.js';

describe('owner commands to agents', () => {
  it('reads working days with prefixes', () => {
    expect(parseDays('תפרסם רק בימי שני וחמישי')).toEqual([1, 4]);
    expect(parseDays('ביום ראשון ובשלישי')).toEqual([0, 2]);
    expect(parseDays('שלום')).toEqual([]);
  });

  it('sets the working days of the publisher and un-pauses it', () => {
    const r = applyAgentCommand('publisher', 'תפרסם רק בימי שני וחמישי', { paused: true });
    expect(r.handled).toBe(true);
    expect(r.config).toEqual({ days: [1, 4], paused: false });
    expect(r.reply).toContain('שני');
    expect(r.reply).toContain('חמישי');
  });

  it('pauses and resumes', () => {
    const paused = applyAgentCommand('publisher', 'תעצור', {});
    expect(paused.config.paused).toBe(true);
    const resumed = applyAgentCommand('publisher', 'תמשיך', paused.config);
    expect(resumed.config.paused).toBe(false);
    expect(resumed.handled).toBe(true);
  });

  it('days are not accepted by the secretary, only pause', () => {
    expect(applyAgentCommand('secretary', 'תעבוד בימי שני', {}).handled).toBe(false);
    expect(applyAgentCommand('secretary', 'תעצור', {}).config.paused).toBe(true);
  });

  it('"do it now" starts the right job for the agents that have one', () => {
    expect(applyAgentCommand('secretary', 'תשלח מסיבות עכשיו', {}).runNow).toBe('parties');
    expect(applyAgentCommand('publisher', 'תפרסם עכשיו', {}).runNow).toBe('campaign');
    expect(applyAgentCommand('publisher', 'תפרסם עכשיו', {}).runNow).toBe('campaign');
    expect(applyAgentCommand('doctor', 'תבדוק שהכל תקין באתר', {}).runNow).toBe('health');
    expect(applyAgentCommand('cleaner', 'תנקה עכשיו', {}).runNow).toBe('cleanup');
    expect(applyAgentCommand('publisher', 'תעבוד רק בימי שני', {}).runNow).toBeUndefined();
  });

  it('Claude agents and automatic systems explain what they can do', () => {
    expect(applyAgentCommand('fixer', 'תעבוד', {}).reply).toContain('13:37');
    expect(applyAgentCommand('notifier', 'תבדוק שהכל תקין', {}).reply).toContain('אוטומטית');
  });

  it('anything else becomes a request for the team manager', () => {
    const r = applyAgentCommand('cleaner', 'תנקה גם הרשמות ישנות', {});
    expect(r.handled).toBe(false);
    expect(r.reply).toContain('מנהל הצוות');
    expect(applyAgentCommand('publisher', 'תכתוב יותר על איזון', {}).handled).toBe(false);
  });
});

describe('notifier: internal parties', () => {
  it('"שלח התראה על המסיבות הפנימיות" runs the internal-only push', () => {
    const r = applyAgentCommand('notifier', 'תשלח התראה על המסיבות הפנימיות', {});
    expect(r.runNow).toBe('push-internal');
  });
  it('a plain "שלח התראה" still runs the regular push', () => {
    expect(applyAgentCommand('notifier', 'שלח התראה', {}).runNow).toBe('push');
  });

  it('understands more ways to say it', () => {
    expect(applyAgentCommand('publisher', 'מספיק, תנוח קצת', {}).config.paused).toBe(true);
    expect(applyAgentCommand('publisher', 'קדימה, תחזור לעבוד', { paused: true }).config.paused).toBe(false);
    expect(applyAgentCommand('publisher', 'תעבוד כל יום', {}).config.days).toEqual([0, 1, 2, 3, 4, 5]);
    expect(applyAgentCommand('doctor', 'מה מצב האתר?', {}).runNow).toBe('health');
  });
});
