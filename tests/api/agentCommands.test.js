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
    const paused = applyAgentCommand('recruiter', 'תעצור', {});
    expect(paused.config.paused).toBe(true);
    const resumed = applyAgentCommand('recruiter', 'תמשיך', paused.config);
    expect(resumed.config.paused).toBe(false);
    expect(resumed.handled).toBe(true);
  });

  it('days are not accepted by the secretary, only pause', () => {
    expect(applyAgentCommand('secretary', 'תעבוד בימי שני', {}).handled).toBe(false);
    expect(applyAgentCommand('secretary', 'תעצור', {}).config.paused).toBe(true);
  });

  it('"do it now" starts the right job for the agents that have one', () => {
    expect(applyAgentCommand('recruiter', 'תעשה עכשיו', {}).runNow).toBe('promo');
    expect(applyAgentCommand('recruiter', 'תעבוד עכשיו', {}).runNow).toBe('promo');
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
