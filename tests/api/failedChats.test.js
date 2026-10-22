import { describe, it, expect } from 'vitest';
process.env.SILENT_DAYS_OFF = '1';
const { describeFailedChats } = await import('../../api/telegram-webhook.js');

describe('failed chats summary', () => {
  it('names each failed group once, with a Hebrew reason', () => {
    const s = describeFailedChats([
      { group: 'MOJO', ok: false, description: 'Bad Request: not enough rights to send photos to the chat' },
      { group: 'MOJO', ok: false, description: 'Bad Request: not enough rights to send photos to the chat' },
      { name: 'מסיבות בצפון', ok: false, description: 'Forbidden: bot was kicked from the group chat' },
      { group: 'ערוץ', ok: true },
    ]);
    expect(s).toBe('MOJO (אין לבוט הרשאה לשלוח תמונות), מסיבות בצפון (הבוט לא נמצא בקבוצה)');
  });
  it('is empty when everything was sent', () => {
    expect(describeFailedChats([{ group: 'a', ok: true }])).toBe('');
  });
});
