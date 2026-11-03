import { describe, it, expect, vi } from 'vitest';
process.env.SILENT_DAYS_OFF = '1';

// settings/telegram.channels as the owner has it today: some channels still carry the old advertiser restriction.
const channels = [
  { chatId: '-1001', name: 'פתוח' },
  { chatId: '-1002', name: 'מוגבל ישן', allowedAdvertiserIds: ['x'] },
  { chatId: '@avi_swingers2', name: 'ריק', allowedAdvertiserIds: [] },
  { chatId: '-1003', name: 'כבוי', broadcastEnabled: false },
];
const db = { collection: () => ({ doc: () => ({ get: async () => ({ exists: true, data: () => ({ channels }) }) }) }) };
vi.mock('firebase-admin', () => ({ default: { firestore: Object.assign(() => db, { Timestamp: { now: () => 'NOW' } }), apps: [1] } }));

const { getReminderDestinations } = await import('../../api/telegram-webhook.js');

describe('party publishing destinations', () => {
  it('every enabled channel gets the site parties: the old advertiser restriction is gone, disabled ones are skipped', async () => {
    const dests = await getReminderDestinations({ firestore: () => db });
    expect(dests.map((d) => d.chatId)).toEqual(['-1001', '-1002', '@avi_swingers2']);
    for (const d of dests) expect(d).not.toHaveProperty('allowedAdvertiserIds');
  });
});
