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

  it('anything else becomes a request for the team manager', () => {
    const r = applyAgentCommand('cleaner', 'תנקה גם הרשמות ישנות', {});
    expect(r.handled).toBe(false);
    expect(r.reply).toContain('מנהל הצוות');
    expect(applyAgentCommand('publisher', 'תכתוב יותר על איזון', {}).handled).toBe(false);
  });
});
