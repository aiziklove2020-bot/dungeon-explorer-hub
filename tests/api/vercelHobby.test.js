// The site runs on Vercel's free (Hobby) plan. These checks stop a change
// (by a person or by an agent) from quietly pushing it past the plan's limits.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';

const vercel = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'));

describe('Vercel free plan limits', () => {
  it('every cron runs at most once a day, at a fixed minute and hour', () => {
    expect(vercel.crons.length).toBeLessThanOrEqual(2);
    for (const { schedule } of vercel.crons) {
      const [minute, hour] = schedule.split(' ');
      expect(minute, schedule).toMatch(/^\d+$/);
      expect(hour, schedule).toMatch(/^\d+$/);
    }
  });

  it('no function asks for more than 60 seconds', () => {
    for (const [name, fn] of Object.entries(vercel.functions || {})) {
      expect(fn.maxDuration ?? 0, name).toBeLessThanOrEqual(60);
    }
    const dir = new URL('../../api/', import.meta.url);
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.js'))) {
      const m = /maxDuration:\s*(\d+)/.exec(readFileSync(new URL(file, dir), 'utf8'));
      if (m) expect(Number(m[1]), file).toBeLessThanOrEqual(60);
    }
  });

  it('agent branches (claude/...) do not use up the 100 deployments a day', () => {
    expect(vercel.git?.deploymentEnabled?.['claude/**']).toBe(false);
  });
});
