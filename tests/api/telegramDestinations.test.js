import { describe, it, expect, vi } from 'vitest';
process.env.SILENT_DAYS_OFF = '1';

// settings/telegram.channels as the owner has it today: some channels still carry the old advertiser restriction.
const channels = [
  { chatId: '-1001', name: 'פתוח' },
  { chatId: '-1002', name: 'מוגבל ישן', allowedAdvertiserIds: ['x'] },
  { chatId: '@avi_swingers2', name: 'ריק', allowedAdvertiserIds: [] },
  { chatId: '-1003', name: 'כבוי', broadcastEnabled: false },
  { chatId: '-5141782209', name: 'רישומים לחמישי שישי' }, // removed for good, even if still enabled in the settings
];
const store = { channels };
const writes = [];
const db = { collection: () => ({ doc: () => ({
  get: async () => ({ exists: true, data: () => ({ ...store }) }),
  set: async (data) => { writes.push(data); Object.assign(store, data); },
}) }) };
vi.mock('firebase-admin', () => ({ default: { firestore: Object.assign(() => db, { Timestamp: { now: () => 'NOW' } }), apps: [1] } }));

const { getReminderDestinations } = await import('../../api/telegram-webhook.js');

describe('party publishing destinations', () => {
  it('every enabled channel gets the site parties: the old advertiser restriction is gone, disabled ones are skipped', async () => {
    const dests = await getReminderDestinations({ firestore: () => db });
    // הליין הליברלי and 🎉מסיבות ליברליות בישראל🎉 are added once, on top of the enabled channels.
    expect(dests.map((d) => d.chatId)).toEqual(['-1001', '-1002', '@avi_swingers2', '-1003487913872', '-1001371159295']);
    for (const d of dests) expect(d).not.toHaveProperty('allowedAdvertiserIds');
  });

  it('adds הליין הליברלי only once: a second run does not duplicate it, and deleting it in the panel sticks', async () => {
    const again = await getReminderDestinations({ firestore: () => db });
    expect(again.filter((d) => d.chatId === '-1003487913872')).toHaveLength(1);
    expect(writes).toHaveLength(1);
    store.channels = store.channels.filter((c) => c.chatId !== '-1003487913872'); // the owner deleted it
    const afterDelete = await getReminderDestinations({ firestore: () => db });
    expect(afterDelete.map((d) => d.chatId)).not.toContain('-1003487913872');
    expect(writes).toHaveLength(1);
  });
});
